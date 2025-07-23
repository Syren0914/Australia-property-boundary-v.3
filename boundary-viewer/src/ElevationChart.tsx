import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ElevationData {
  distances: number[];
  elevations: number[];
}

interface ElevationChartProps {
  isVisible: boolean;
  onClose: () => void;
  elevationData: ElevationData | null;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  isVisible,
  onClose,
  elevationData,
}) => {
  if (!isVisible || !elevationData) {
    return null;
  }

  const { distances, elevations } = elevationData;

  // Calculate statistics
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const avgElevation = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;
  const totalDistance = distances[distances.length - 1] || 0;
  const elevationGain = maxElevation - minElevation;

  const data = {
    labels: distances.map(d => `${d.toFixed(0)}m`),
    datasets: [
      {
        label: 'Elevation',
        data: elevations,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Elevation Profile',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Distance: ${distances[context[0].dataIndex].toFixed(1)}m`,
          label: (context: any) => `Elevation: ${context.parsed.y.toFixed(1)}m`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Distance (meters)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Elevation (meters)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '1024px',
        width: '100%',
        margin: '0 16px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Elevation Profile</h2>
          <button
            onClick={onClose}
            style={{
              color: '#6b7280',
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            ×
          </button>
        </div>

        {/* Statistics Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500' }}>Total Distance</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>{totalDistance.toFixed(1)}m</div>
          </div>
          <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: '500' }}>Min Elevation</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }}>{minElevation.toFixed(1)}m</div>
          </div>
          <div style={{ backgroundColor: '#fefce8', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#ca8a04', fontWeight: '500' }}>Max Elevation</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a16207' }}>{maxElevation.toFixed(1)}m</div>
          </div>
          <div style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#9333ea', fontWeight: '500' }}>Avg Elevation</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>{avgElevation.toFixed(1)}m</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>Elevation Gain</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b91c1c' }}>{elevationGain.toFixed(1)}m</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: '384px' }}>
          <Line data={data} options={options} />
        </div>

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          <p>• Hover over the chart to see detailed elevation data at each point</p>
          <p>• The chart shows elevation changes along the measured path</p>
        </div>
      </div>
    </div>
  );
}; 