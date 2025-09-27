import React, { useState, useEffect, useRef } from 'react';
import { 
  Ruler, 
  Calculator, 
  Area, 
  Volume, 
  Angle, 
  Compass,
  MapPin,
  Layers,
  Download,
  Share2,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';

interface MeasurementToolProps {
  mapRef: React.MutableRefObject<any>;
  isActive: boolean;
  onToggle: () => void;
}

interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'volume';
  points: [number, number][];
  value: number;
  unit: string;
  label?: string;
  timestamp: Date;
}

export const AdvancedMeasurementTools: React.FC<MeasurementToolProps> = ({
  mapRef,
  isActive,
  onToggle
}) => {
  const [activeTool, setActiveTool] = useState<'distance' | 'area' | 'angle' | 'volume' | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);

  const measurementRef = useRef<Measurement[]>(measurements);

  useEffect(() => {
    measurementRef.current = measurements;
  }, [measurements]);

  const tools = [
    { id: 'distance', label: 'Distance', icon: Ruler, description: 'Measure straight-line distance' },
    { id: 'area', label: 'Area', icon: Area, description: 'Calculate polygon area' },
    { id: 'angle', label: 'Angle', icon: Angle, description: 'Measure angles between lines' },
    { id: 'volume', label: 'Volume', icon: Volume, description: 'Calculate 3D volume' },
  ];

  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1[1] * Math.PI / 180;
    const φ2 = point2[1] * Math.PI / 180;
    const Δφ = (point2[1] - point1[1]) * Math.PI / 180;
    const Δλ = (point2[0] - point1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const calculateArea = (points: [number, number][]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return Math.abs(area) / 2 * 111320 * 111320; // Convert to square meters
  };

  const calculateAngle = (points: [number, number][]): number => {
    if (points.length !== 3) return 0;
    
    const [p1, p2, p3] = points;
    const a = calculateDistance(p1, p2);
    const b = calculateDistance(p2, p3);
    const c = calculateDistance(p1, p3);
    
    const angle = Math.acos((a*a + b*b - c*c) / (2*a*b));
    return angle * 180 / Math.PI;
  };

  const formatValue = (value: number, type: string): { value: string; unit: string } => {
    switch (type) {
      case 'distance':
        if (value >= 1000) {
          return { value: (value / 1000).toFixed(2), unit: 'km' };
        }
        return { value: value.toFixed(2), unit: 'm' };
      case 'area':
        if (value >= 10000) {
          return { value: (value / 10000).toFixed(2), unit: 'ha' };
        }
        return { value: value.toFixed(2), unit: 'm²' };
      case 'angle':
        return { value: value.toFixed(1), unit: '°' };
      case 'volume':
        return { value: value.toFixed(2), unit: 'm³' };
      default:
        return { value: value.toFixed(2), unit: '' };
    }
  };

  const handleToolSelect = (toolId: string) => {
    if (activeTool === toolId) {
      setActiveTool(null);
      setIsDrawing(false);
      setCurrentPoints([]);
    } else {
      setActiveTool(toolId as any);
      setIsDrawing(true);
      setCurrentPoints([]);
    }
  };

  const handleMapClick = (e: any) => {
    if (!isActive || !activeTool || !isDrawing) return;

    const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const updatedPoints = [...currentPoints, newPoint];
    setCurrentPoints(updatedPoints);

    // Check if measurement is complete
    let isComplete = false;
    let value = 0;

    switch (activeTool) {
      case 'distance':
        if (updatedPoints.length === 2) {
          value = calculateDistance(updatedPoints[0], updatedPoints[1]);
          isComplete = true;
        }
        break;
      case 'area':
        if (updatedPoints.length >= 3) {
          value = calculateArea(updatedPoints);
          isComplete = true;
        }
        break;
      case 'angle':
        if (updatedPoints.length === 3) {
          value = calculateAngle(updatedPoints);
          isComplete = true;
        }
        break;
      case 'volume':
        if (updatedPoints.length >= 3) {
          // Simplified volume calculation (would need elevation data in real implementation)
          value = calculateArea(updatedPoints) * 10; // Assume 10m height
          isComplete = true;
        }
        break;
    }

    if (isComplete) {
      const measurement: Measurement = {
        id: `measurement_${Date.now()}`,
        type: activeTool,
        points: updatedPoints,
        value,
        unit: formatValue(value, activeTool).unit,
        timestamp: new Date(),
      };

      setMeasurements(prev => [...prev, measurement]);
      setIsDrawing(false);
      setCurrentPoints([]);
      setActiveTool(null);
    }
  };

  const clearMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  const clearAllMeasurements = () => {
    setMeasurements([]);
  };

  const exportMeasurements = () => {
    const csvContent = [
      'Type,Value,Unit,Points,Timestamp',
      ...measurements.map(m => 
        `${m.type},${m.value.toFixed(2)},${m.unit},"${m.points.map(p => `${p[0]},${p[1]}`).join(';')}",${m.timestamp.toISOString()}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurements-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const shareMeasurements = async () => {
    const shareData = {
      title: 'Property Measurements',
      text: `Found ${measurements.length} measurements`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(JSON.stringify(measurements, null, 2));
    }
  };

  // Add map click listener
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isActive && activeTool) {
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [isActive, activeTool, currentPoints]);

  if (!isActive) {
    return (
      <EnhancedCard
        title="Measurement Tools"
        subtitle="Advanced measurement capabilities"
        icon={Ruler}
        variant="filled"
      >
        <EnhancedButton
          onClick={onToggle}
          variant="primary"
          size="md"
          icon={Ruler}
          fullWidth
        >
          Activate Measurement Tools
        </EnhancedButton>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard
      title="Measurement Tools"
      subtitle={`${measurements.length} measurements • ${activeTool ? `${activeTool} tool active` : 'Select a tool'}`}
      icon={Ruler}
      variant="elevated"
    >
      {/* Tool Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
          Select Tool
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
          {tools.map(tool => (
            <EnhancedButton
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              variant={activeTool === tool.id ? 'primary' : 'ghost'}
              size="sm"
              icon={tool.icon}
              style={{ 
                borderRadius: '8px',
                height: '60px',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '12px' }}>{tool.label}</span>
            </EnhancedButton>
          ))}
        </div>
      </div>

      {/* Current Measurement Progress */}
      {isDrawing && currentPoints.length > 0 && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Compass size={16} color="#0ea5e9" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
              {activeTool?.charAt(0).toUpperCase()}{activeTool?.slice(1)} Measurement
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#0c4a6e', margin: 0 }}>
            Points: {currentPoints.length} / {activeTool === 'distance' ? 2 : activeTool === 'angle' ? 3 : '3+'}
          </p>
          {activeTool === 'distance' && currentPoints.length === 1 && (
            <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '4px 0 0 0' }}>
              Click to place second point
            </p>
          )}
          {activeTool === 'area' && currentPoints.length >= 2 && (
            <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '4px 0 0 0' }}>
              Click to add more points, or complete the polygon
            </p>
          )}
        </div>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Measurements ({measurements.length})
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <EnhancedButton
                onClick={exportMeasurements}
                variant="secondary"
                size="sm"
                icon={Download}
              />
              <EnhancedButton
                onClick={shareMeasurements}
                variant="secondary"
                size="sm"
                icon={Share2}
              />
              <EnhancedButton
                onClick={clearAllMeasurements}
                variant="danger"
                size="sm"
                icon={RotateCcw}
              />
            </div>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {measurements.map((measurement) => {
              const formatted = formatValue(measurement.value, measurement.type);
              return (
                <div
                  key={measurement.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: selectedMeasurement === measurement.id ? '#eff6ff' : '#f9fafb',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    border: selectedMeasurement === measurement.id ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedMeasurement(
                    selectedMeasurement === measurement.id ? null : measurement.id
                  )}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tools.find(t => t.id === measurement.type)?.icon && 
                      React.createElement(tools.find(t => t.id === measurement.type)!.icon, { size: 16, color: '#6b7280' })
                    }
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {measurement.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {formatted.value} {formatted.unit}
                      </div>
                    </div>
                    <EnhancedButton
                      onClick={(e) => {
                        e.stopPropagation();
                        clearMeasurement(measurement.id);
                      }}
                      variant="danger"
                      size="sm"
                      icon={X}
                      style={{ padding: '4px' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        color: '#92400e',
      }}>
        <strong>Instructions:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Select a measurement tool above</li>
          <li>Click on the map to place measurement points</li>
          <li>Measurements are automatically calculated and saved</li>
          <li>Export or share your measurements when done</li>
        </ul>
      </div>
    </EnhancedCard>
  );
};
