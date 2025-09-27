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