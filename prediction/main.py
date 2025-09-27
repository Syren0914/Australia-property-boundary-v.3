from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split


DATA_PATH = Path(__file__).parent / 'house_prices.csv'

app = FastAPI(title='Property Value Prediction API', version='0.1.0')

# CORS (allow local dev frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# In-memory model store
model: Optional[LinearRegression] = None
model_columns: List[str] = []
rppi_df: Optional[pd.DataFrame] = None  # columns: ['date','region','index']


def load_and_train() -> None:
    global model, model_columns
    if not DATA_PATH.exists():
        # No dataset; keep model None. API will respond accordingly.
        model = None
        model_columns = []
        return

    df = pd.read_csv(DATA_PATH)

    # Target column must exist
    if 'SalePrice' not in df.columns:
        model = None
        model_columns = []
        return

    # Basic cleaning
    # Use numeric-only median to avoid FutureWarning
    df = df.copy()
    df = df.fillna(df.median(numeric_only=True))

    # One-hot encode categoricals
    df = pd.get_dummies(df)

    X = df.drop('SalePrice', axis=1)
    y = df['SalePrice']

    if X.empty:
        model = None
        model_columns = []
        return

    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)

    m = LinearRegression()
    m.fit(X_train, y_train)

    model = m
    model_columns = list(X.columns)


def prepare_features(payload: Dict[str, Any]) -> Optional[pd.DataFrame]:
    if model is None or not model_columns:
        return None

    # Create DataFrame from single record
    row = pd.DataFrame([payload])
    row = pd.get_dummies(row)

    # Align to training columns: add missing columns as 0, drop extras
    for col in model_columns:
        if col not in row.columns:
            row[col] = 0
    row = row[model_columns]
    return row


# ------- ABS RPPI (AU price history) ---------
def _load_abs_rppi_local() -> Optional[pd.DataFrame]:
    """
    Try load ABS RPPI from a local CSV 'abs_rppi.csv' placed in the same folder.
    Expected columns (case-insensitive): date, region, index
    date: ISO date or YYYY-Qn string; region: e.g., 'Sydney', 'NSW', 'Melbourne', 'VIC'; index: numeric.
    """
    local = Path(__file__).parent / 'abs_rppi.csv'
    if not local.exists():
        return None
    try:
        df = pd.read_csv(local)
        cols = {c.lower(): c for c in df.columns}
        if not {'date','region','index'}.issubset(set(cols.keys())):
            return None
        df = df.rename(columns={cols['date']: 'date', cols['region']: 'region', cols['index']: 'index'})
        # normalize
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date','region','index'])
        df['region'] = df['region'].str.strip()
        df = df.sort_values(['region','date'])
        return df[['date','region','index']]
    except Exception:
        return None


def _fetch_abs_rppi_url() -> Optional[pd.DataFrame]:
    """
    Fetch ABS RPPI from a configured CSV URL (ABS_RPPI_CSV_URL env).
    CSV must contain columns: date, region, index.
    """
    import os
    url = os.getenv('ABS_RPPI_CSV_URL')
    if not url:
        return None
    try:
        df = pd.read_csv(url)
        cols = {c.lower(): c for c in df.columns}
        if not {'date','region','index'}.issubset(set(cols.keys())):
            return None
        df = df.rename(columns={cols['date']: 'date', cols['region']: 'region', cols['index']: 'index'})
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date','region','index'])
        df['region'] = df['region'].str.strip()
        df = df.sort_values(['region','date'])
        return df[['date','region','index']]
    except Exception:
        return None


def load_abs_rppi() -> None:
    global rppi_df
    df = _load_abs_rppi_local()
    if df is None:
        df = _fetch_abs_rppi_url()
    rppi_df = df


def normalize_region(q: str) -> List[str]:
    """Return possible region labels to match (city and state)."""
    if not q:
        return []
    ql = q.strip().lower()
    mapping = {
        'sydney': ['sydney','nsw','new south wales'],
        'melbourne': ['melbourne','vic','victoria'],
        'brisbane': ['brisbane','qld','queensland'],
        'adelaide': ['adelaide','sa','south australia'],
        'perth': ['perth','wa','western australia'],
        'hobart': ['hobart','tas','tasmania'],
        'darwin': ['darwin','nt','northern territory'],
        'canberra': ['canberra','act','australian capital territory'],
    }
    # direct city/state key
    for k,v in mapping.items():
        if ql == k or ql in v:
            return [k] + v
    # fallback: return the raw
    return [q]


class PredictRequest(BaseModel):
    features: Dict[str, Any]


class PredictManyRequest(BaseModel):
    records: List[Dict[str, Any]]


class ForecastRequest(BaseModel):
    features: Optional[Dict[str, Any]] = None
    current_value: Optional[float] = None
    years: int = 3
    annual_growth_pct: float = 4.0  # default 4%


@app.on_event('startup')
def _startup() -> None:
    load_and_train()
    load_abs_rppi()


@app.get('/health')
def health() -> Dict[str, Any]:
    return {
        'status': 'ok',
        'model_ready': model is not None,
        'num_columns': len(model_columns),
    }


@app.get('/columns')
def columns() -> Dict[str, Any]:
    return {'columns': model_columns}


@app.get('/au/history')
def au_history(region: str) -> Dict[str, Any]:
    if rppi_df is None or rppi_df.empty:
        return { 'error': 'rppi_unavailable' }
    labels = set(normalize_region(region))
    sel = rppi_df[rppi_df['region'].str.lower().isin({s.lower() for s in labels})]
    if sel.empty:
        # fallback: return available regions
        return { 'error': 'region_not_found', 'available': sorted(rppi_df['region'].unique().tolist()) }
    out = [{ 'date': d.strftime('%Y-%m-%d'), 'index': float(v) } for d,v in zip(sel['date'], sel['index'])]
    return { 'region': region, 'series': out }


@app.post('/au/forecast')
def au_forecast(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    payload: { region: str, years?: int=3, lookback_years?: int=5, current_value?: number }
    Returns RPPI-based CAGR projection and (if provided) scaled property value forecast.
    """
    region = str(payload.get('region', ''))
    years = int(payload.get('years', 3))
    lookback = int(payload.get('lookback_years', 5))
    current_value = payload.get('current_value')

    if rppi_df is None or rppi_df.empty:
        return { 'error': 'rppi_unavailable' }
    labels = set(normalize_region(region))
    sel = rppi_df[rppi_df['region'].str.lower().isin({s.lower() for s in labels})].sort_values('date')
    if sel.empty:
        return { 'error': 'region_not_found', 'available': sorted(rppi_df['region'].unique().tolist()) }

    # Compute CAGR from last N years
    # Ensure we have enough points
    if sel.shape[0] < 4:
        return { 'error': 'insufficient_history' }

    end_idx = sel.iloc[-1]['index']
    end_date = sel.iloc[-1]['date']
    # approximate N years back
    cutoff = end_date - pd.DateOffset(years=lookback)
    past = sel[sel['date'] <= cutoff]
    if past.empty:
        past_idx = sel.iloc[0]['index']
        n_years = max(1, (end_date.year - sel.iloc[0]['date'].year))
    else:
        past_idx = past.iloc[-1]['index']
        n_years = max(1, lookback)

    cagr = (end_idx / past_idx) ** (1.0 / n_years) - 1.0
    # Build index forecast
    forecast = []
    for i in range(1, years + 1):
        val = float(end_idx) * ((1 + cagr) ** i)
        forecast.append({ 'year': int(end_date.year + i), 'index': round(val, 2) })

    # Optional value projection
    value_forecast = None
    if isinstance(current_value, (int, float)):
        value_forecast = []
        for i, f in enumerate(forecast, start=1):
            scale = f['index'] / float(end_idx)
            value_forecast.append({ 'year': f['year'], 'value': int(round(current_value * scale)) })

    return {
        'region': region,
        'as_of': end_date.strftime('%Y-%m-%d'),
        'index_current': float(end_idx),
        'cagr': round(cagr * 100, 2),
        'index_forecast': forecast,
        'value_forecast': value_forecast,
    }
@app.post('/predict')
def predict(req: PredictRequest) -> Dict[str, Any]:
    if model is None:
        return {'error': 'model_not_ready'}
    row = prepare_features(req.features)
    if row is None:
        return {'error': 'invalid_features'}
    y = float(model.predict(row)[0])
    return {'prediction': y}


@app.post('/predict_many')
def predict_many(req: PredictManyRequest) -> Dict[str, Any]:
    if model is None:
        return {'error': 'model_not_ready'}
    preds: List[float] = []
    for rec in req.records:
        row = prepare_features(rec)
        if row is None:
            preds.append(float('nan'))
        else:
            preds.append(float(model.predict(row)[0]))
    return {'predictions': preds}


@app.post('/forecast')
def forecast(req: ForecastRequest) -> Dict[str, Any]:
    # Determine current value either from input or via model
    current = req.current_value
    if current is None and req.features is not None and model is not None:
        row = prepare_features(req.features)
        if row is not None:
            current = float(model.predict(row)[0])

    if current is None:
        return {'error': 'no_current_value'}

    years = max(1, int(req.years))
    g = req.annual_growth_pct / 100.0
    out: List[Dict[str, Any]] = []
    base_year = pd.Timestamp.now().year
    for i in range(1, years + 1):
        val = current * ((1 + g) ** i)
        out.append({'year': base_year + i, 'value': round(val)})
    return {
        'current_value': round(current),
        'forecast': out,
        'annual_growth_pct': req.annual_growth_pct,
    }


# Run with: uvicorn prediction.main:app --reload