import React, { useMemo } from 'react';
import { EnhancedCard } from './enhanced-card';
import { EnhancedButton } from './enhanced-button';
import { MapPin, Calendar } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface ParcelHistoryPoint {
  year: number;
  value: number;
}

interface ParcelInfoPanelProps {
  address?: string;
  center: [number, number];
  currentValue?: number;
  history?: ParcelHistoryPoint[];
  forecast?: ParcelHistoryPoint[];
  onClose?: () => void;
  imageUrl?: string;
  images?: { heading: number; url: string }[];
  enrich?: any;
  enrichLoading?: boolean;
  enrichError?: string;
}

const currency = (n?: number) =>
  typeof n === 'number' ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-';

export const ParcelInfoPanel: React.FC<ParcelInfoPanelProps> = ({
  address,
  center,
  currentValue,
  history = [],
  forecast = [],
  onClose,
  imageUrl,
  images,
  enrich,
  enrichLoading,
  enrichError
}) => {
  const chartData = useMemo(() => {
    const points = [...history, ...forecast].sort((a, b) => a.year - b.year);
    if (points.length === 0) return { points, minV: 0, maxV: 0, minY: 0, maxY: 0 };
    const minV = Math.min(...points.map(p => p.value));
    const maxV = Math.max(...points.map(p => p.value));
    const minY = Math.min(...points.map(p => p.year));
    const maxY = Math.max(...points.map(p => p.year));
    return { points, minV, maxV, minY, maxY };
  }, [history, forecast]);

  const Chart: React.FC = () => {
    const data = useMemo(() => {
      const map: Record<number, { x: number; history?: number; forecast?: number }> = {};
      history.forEach((p) => { map[p.year] = { ...(map[p.year] || { x: p.year }), history: p.value }; });

      // Ensure forecast years are consecutive after the last history year to avoid visual gaps
      const lastHistoryYear = history.length ? Math.max(...history.map(p => p.year)) : new Date().getFullYear();
      const sortedForecast = [...forecast].sort((a, b) => a.year - b.year);
      const baseGrowth = typeof (enrich as any)?.yoy_pct === 'number' ? Number((enrich as any).yoy_pct) / 100 : 0.04;
      const clampedGrowth = Math.max(-0.10, Math.min(0.10, baseGrowth));
      const anchor = typeof currentValue === 'number' ? Number(currentValue) : (history.length ? history[history.length - 1].value : undefined);

      const adjustedForecast = sortedForecast.length ? sortedForecast : (
        anchor ? [
          { year: lastHistoryYear + 1, value: Math.round(anchor * (1 + clampedGrowth)) },
          { year: lastHistoryYear + 2, value: Math.round(anchor * Math.pow(1 + clampedGrowth, 2)) }
        ] : []
      );

      adjustedForecast.forEach((p, idx) => {
        const year = lastHistoryYear + (idx + 1); // force consecutive years
        map[year] = { ...(map[year] || { x: year }), forecast: p.value };
      });

      // Add a connector point so the forecast starts exactly at the last history x with the anchor value
      if (typeof anchor === 'number') {
        map[lastHistoryYear] = { ...(map[lastHistoryYear] || { x: lastHistoryYear }), history: map[lastHistoryYear]?.history, forecast: anchor };
      }

      return Object.values(map).sort((a, b) => a.x - b.x);
    }, [history, forecast, enrich, currentValue]);
    if (!data.length) return null;
    return (
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} />
            <Tooltip formatter={(v:any)=> currency(Number(v))} labelFormatter={(l:any)=> String(l)} />
            <defs>
              <linearGradient id="fillHistory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area dataKey="history" type="natural" fill="url(#fillHistory)" fillOpacity={0.4} stroke="#2563eb" strokeWidth={2} />
            <Area dataKey="forecast" type="natural" fill="url(#fillForecast)" fillOpacity={0.4} stroke="#059669" strokeWidth={2} strokeDasharray="5 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1001,
        maxWidth: 360,
        marginTop: 60
      }}
    >
        <EnhancedCard
          title="Parcel Information"
          subtitle={address || 'Fetching address...'}
          icon={MapPin}
          variant="elevated"
          className="hide-scrollbar"
          onClose={onClose}
          style={{
            height: 'calc(100vh - 100px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRadius: 12,
            position: 'relative'
          }}
          
        >
        {/* explicit close button to ensure visibility */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000, width: 28, height: 28, borderRadius: 999, border: '1px solid #e5e7eb', background: '#ffffff', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          >
            ×
          </button>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {/* header */}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800, minWidth: 120 ,color: '#000000'}}>
                {enrichLoading ? (
                  <div className="loading-skeleton" style={{ height: 16, width: 120, borderRadius: 6 , color: '#000000'}} />
                ) : (
                  currency(currentValue)
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Current Estimate</div>
            </div>
            <div>
              {!enrichLoading && typeof (enrich?.yoy_pct) === 'number' && (
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: (enrich.yoy_pct >= 0 ? '#ecfdf5' : '#fef2f2'), color: (enrich.yoy_pct >= 0 ? '#065f46' : '#991b1b'), border: '1px solid #a7f3d0' }}>
                  {enrich.yoy_pct >= 0 ? '+' : ''}{Number(enrich.yoy_pct).toFixed(1)}% YoY
                </span>
              )}
            </div>
          </div>
          {/* Per-platform estimates if available */}
          {Array.isArray((enrich as any)?.platform_estimates) && (enrich as any).platform_estimates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: '#6b7280' }}>
              {(enrich as any).platform_estimates.slice(0, 4).map((p: any, i: number) => (
                <span key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 999, padding: '2px 8px' }}>
                  {(p.source || 'source')}: <strong style={{ color: '#111827' }}>{currency(Number(p.price))}</strong>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, color: '#6b7280', fontSize: 12 }}>
            <div>Land area: <span style={{ color: '#111827', fontWeight: 600 }}>{enrich?.lot_size_sq_m ? `${enrich.lot_size_sq_m} m²` : '—'}</span></div>
            <div>Updated: <span>today</span></div>
          </div>

          {/* Chart */}
          {imageUrl && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <img loading="lazy" src={imageUrl} alt="Street view" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
          {images && images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {images.map((img) => (
                <a key={img.heading} href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center[1]},${center[0]}&heading=${img.heading}&pitch=0&fov=80`} target="_blank" rel="noreferrer" style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <img loading="lazy" src={img.url} alt={`Street view ${img.heading}°`} style={{ width: '100%', display: 'block' }} />
                </a>
              ))}
            </div>
          )}

          {/* Enriched details */}
          {/* loading text removed in favor of overlay */}
          {enrichError && (
            <div style={{ fontSize: 12, color: '#dc2626' }}>Unable to load enriched details ({enrichError}).</div>
          )}
          {enrich && !enrich.error && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, fontSize: 12 }}>
                {'est_price' in enrich && (
                  <div>Est. price: <strong>{currency(Number(enrich.est_price))}</strong></div>
                )}
                {enrich.price_range && (
                  <div>Range: <strong>{currency(Number(enrich.price_range.low))} - {currency(Number(enrich.price_range.high))}</strong></div>
                )}
                {'bedrooms' in enrich && (
                  <div>Bedrooms: <strong>{enrich.bedrooms}</strong></div>
                )}
                {'bathrooms' in enrich && (
                  <div>Bathrooms: <strong>{enrich.bathrooms}</strong></div>
                )}
                {'lot_size_sq_m' in enrich && (
                  <div>Lot size: <strong>{enrich.lot_size_sq_m} m²</strong></div>
                )}
                {'building_area_sq_m' in enrich && (
                  <div>Building: <strong>{enrich.building_area_sq_m} m²</strong></div>
                )}
                {enrich.last_sold && (
                  <div>Last sold: <strong>{enrich.last_sold.date}</strong> for <strong>{currency(Number(enrich.last_sold.price))}</strong></div>
                )}
                {'year_built' in enrich && (
                  <div>Year built: <strong>{enrich.year_built}</strong></div>
                )}
              </div>
              {Array.isArray(enrich.sources) && enrich.sources.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {enrich.sources.slice(0, 3).map((s: any, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb' }}>{s.site || 'source'}</a>
                  ))}
                </div>
              )}
            </div>
          )}

          {(history.length > 0 || forecast.length > 0) && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, overflow: 'hidden', marginTop: 6, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Calendar size={14} />
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Value History & Forecast</div>
              </div>
              <div style={{ filter: enrichLoading ? 'blur(2px)' : 'none', transition: 'filter .2s ease' }}>
                <Chart />
              </div>
              {enrichLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.35)' }}>
                  <svg width="28" height="28" viewBox="0 0 50 50" aria-label="Loading">
                    <circle cx="25" cy="25" r="20" stroke="#e5e7eb" strokeWidth="5" fill="none" />
                    <path d="M25 5 a20 20 0 0 1 0 40" stroke="#3b82f6" strokeWidth="5" fill="none">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 2, backgroundColor: '#2563eb', display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>History</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 2, backgroundColor: '#059669', display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Forecast</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {/* <div style={{ display: 'flex', gap: 8 }}>
            <EnhancedButton variant="primary" size="sm">Analyze</EnhancedButton>
            <EnhancedButton variant="secondary" size="sm">Floorplan 3D</EnhancedButton>
            <EnhancedButton variant="ghost" size="sm">Export</EnhancedButton>
          </div> */}
        </div>
        {/* Removed card-wide loader so images don't appear blocked */}
        {onClose && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <EnhancedButton variant="ghost" size="sm" onClick={onClose}>Close</EnhancedButton>
          </div>
        )}
        </EnhancedCard>
      </div>
  );
};



