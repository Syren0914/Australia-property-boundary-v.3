import React, { useState } from 'react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { Upload, X, Ruler, RotateCcw, Layers } from 'lucide-react';

export interface FloorplanWallSegment {
  p1: [number, number]; // plan units (x, y)
  p2: [number, number];
  thickness?: number; // plan units
}

export interface FloorplanPlan {
  units: 'mm' | 'cm' | 'm' | 'ft' | 'in';
  height?: number; // plan units (default depends on units)
  walls: FloorplanWallSegment[];
}

export interface FloorplanBuildParams {
  rotationDeg: number; // rotation relative to north
  heightMeters: number;
  defaultThicknessMeters: number;
  unitToMeter: number; // conversion from plan units → meters
}

interface Floorplan3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuild: (plan: FloorplanPlan, params: FloorplanBuildParams) => void;
}

export const Floorplan3DModal: React.FC<Floorplan3DModalProps> = ({ isOpen, onClose, onBuild }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [units, setUnits] = useState<'mm' | 'cm' | 'm' | 'ft' | 'in'>('mm');
  const [height, setHeight] = useState<number>(2700); // in plan units
  const [defaultThickness, setDefaultThickness] = useState<number>(110); // in plan units
  const [rotationDeg, setRotationDeg] = useState<number>(0);

  if (!isOpen) return null;

  const getUnitToMeter = (u: string) => {
    switch (u) {
      case 'mm': return 0.001;
      case 'cm': return 0.01;
      case 'm': return 1;
      case 'ft': return 0.3048;
      case 'in': return 0.0254;
      default: return 1;
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setJsonInput(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleBuild = () => {
    try {
      const parsed = JSON.parse(jsonInput || '{}');
      const plan: FloorplanPlan = {
        units: (parsed.units as any) || units,
        height: parsed.height ?? height,
        walls: Array.isArray(parsed.walls) ? parsed.walls : [],
      };

      if (!plan.walls.length) {
        alert('No walls found in JSON. Expecting { units, height, walls:[{p1:[x,y], p2:[x,y], thickness}] }');
        return;
      }

      const params: FloorplanBuildParams = {
        rotationDeg,
        heightMeters: (plan.height ?? height) * getUnitToMeter(plan.units),
        defaultThicknessMeters: defaultThickness * getUnitToMeter(plan.units),
        unitToMeter: getUnitToMeter(plan.units),
      };

      onBuild(plan, params);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Invalid JSON. Please check your input.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: 'min(960px, 95vw)',
        maxHeight: '90vh',
        overflow: 'auto',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={18} />
            <div style={{ fontWeight: 600 }}>Floorplan to 3D</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#374151' }}>Upload or paste JSON floorplan</div>
            <div>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"units":"mm","height":2700,"walls":[{"p1":[0,0],"p2":[8000,0],"thickness":110}]}'
              style={{ width: '100%', minHeight: '160px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', fontFamily: 'ui-monospace, SFMono-Regular' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Units</div>
              <select value={units} onChange={(e) => setUnits(e.target.value as any)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="ft">ft</option>
                <option value="in">in</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Wall height ({units})</div>
              <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Default thickness ({units})</div>
              <input type="number" value={defaultThickness} onChange={(e) => setDefaultThickness(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Rotation (deg)</div>
              <input type="number" value={rotationDeg} onChange={(e) => setRotationDeg(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <EnhancedButton variant="ghost" size="sm" icon={RotateCcw} onClick={() => { setJsonInput(''); setHeight(2700); setDefaultThickness(110); setRotationDeg(0); }}>
              Reset
            </EnhancedButton>
            <EnhancedButton variant="primary" size="md" icon={Ruler} onClick={handleBuild}>
              Build on Map
            </EnhancedButton>
          </div>
        </div>
      </div>
    </div>
  );
};
