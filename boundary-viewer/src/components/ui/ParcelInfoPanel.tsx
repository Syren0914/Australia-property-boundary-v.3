import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedCard } from './enhanced-card';
import { EnhancedButton } from './enhanced-button';
import { MapPin, TrendingUp, Calendar } from 'lucide-react';

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
  images
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
    const w = 320;
    const h = 120;
    const pad = 28;
    const { points, minV, maxV, minY, maxY } = chartData;
    if (points.length === 0) return null;

    const xScale = (year: number) => {
      if (maxY === minY) return pad + (w - 2 * pad) / 2;
      return pad + ((year - minY) / (maxY - minY)) * (w - 2 * pad);
    };
    const yScale = (val: number) => {
      if (maxV === minV) return h - pad;
      // invert y for SVG
      return pad + (1 - (val - minV) / (maxV - minV)) * (h - 2 * pad);
    };

    const toPath = (arr: ParcelHistoryPoint[]) =>
      arr
        .sort((a, b) => a.year - b.year)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.year)},${yScale(p.value)}`)
        .join(' ');

    const histPath = toPath(history);
    const forePath = toPath(forecast);

    // Y-axis labels (min, mid, max)
    const yTicks = [minV, Math.round((minV + maxV) / 2), maxV];

    return (
      <svg width={w} height={h} role="img" aria-label="Property value chart">
        {/* Axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />
        {yTicks.map((v, i) => (
          <g key={`yt-${i}`}>
            <line x1={pad} y1={yScale(v)} x2={w - pad} y2={yScale(v)} stroke="#f3f4f6" />
            <text x={4} y={yScale(v) + 4} fontSize={10} fill="#6b7280">{currency(v)}</text>
          </g>
        ))}

        {/* History line */}
        {history.length > 0 && (
          <path d={histPath} fill="none" stroke="#2563eb" strokeWidth={2} />
        )}
        {/* Forecast line (dashed) */}
        {forecast.length > 0 && (
          <path d={forePath} fill="none" stroke="#059669" strokeWidth={2} strokeDasharray="4 3" />
        )}

        {/* Points */}
        {history.map((p, i) => (
          <circle key={`hp-${i}`} cx={xScale(p.year)} cy={yScale(p.value)} r={2.5} fill="#2563eb" />
        ))}
        {forecast.map((p, i) => (
          <circle key={`fp-${i}`} cx={xScale(p.year)} cy={yScale(p.value)} r={2.5} fill="#059669" />
        ))}

        {/* X-axis labels (first, last) */}
        <text x={pad} y={h - 6} fontSize={10} fill="#6b7280">{chartData.minY}</text>
        <text x={w - pad - 14} y={h - 6} fontSize={10} fill="#6b7280">{chartData.maxY}</text>
      </svg>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
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
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, backgroundColor: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Current Estimate</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {currency(currentValue)}
              </div>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                +4.1% YoY
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, color: '#6b7280', fontSize: 12 }}>
            <div>Land area: <span style={{ color: '#111827', fontWeight: 600 }}>{/* area if provided */}</span></div>
            <div>Updated: <span>today</span></div>
          </div>

          {/* Chart */}
          {imageUrl && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <img src={imageUrl} alt="Street view" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
          {images && images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {images.map((img) => (
                <a key={img.heading} href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center[1]},${center[0]}&heading=${img.heading}&pitch=0&fov=80`} target="_blank" rel="noreferrer" style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={img.url} alt={`Street view ${img.heading}°`} style={{ width: '100%', display: 'block' }} />
                </a>
              ))}
            </div>
          )}

          {(history.length > 0 || forecast.length > 0) && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, overflow: 'hidden', marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Calendar size={14} />
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Value History & Forecast</div>
              </div>
              <Chart />
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
          <div style={{ display: 'flex', gap: 8 }}>
            <EnhancedButton variant="primary" size="sm">Analyze</EnhancedButton>
            <EnhancedButton variant="secondary" size="sm">Floorplan 3D</EnhancedButton>
            <EnhancedButton variant="ghost" size="sm">Export</EnhancedButton>
          </div>
        </div>

        {onClose && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <EnhancedButton variant="ghost" size="sm" onClick={onClose}>Close</EnhancedButton>
          </div>
        )}
        </EnhancedCard>
      </motion.div>
    </AnimatePresence>
  );
};


