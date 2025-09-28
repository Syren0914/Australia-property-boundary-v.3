import React, { useState, useMemo } from 'react';
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
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  X, 
  Download, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Navigation,
  Zap,
  BarChart3,
  LineChart,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { StatCard } from './enhanced-card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement
);

interface ElevationData {
  distances: number[];
  elevations: number[];
}

interface EnhancedElevationChartProps {
  isVisible: boolean;
  onClose: () => void;
  elevationData: ElevationData | null;
}

type ChartType = 'line' | 'bar';
type ViewMode = 'normal' | 'fullscreen';

export const EnhancedElevationChart: React.FC<EnhancedElevationChartProps> = ({
  isVisible,
  onClose,
  elevationData,
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [showStatistics, setShowStatistics] = useState(true);

  // Always initialize hooks with safe data to keep hook order stable
  const distances = elevationData?.distances ?? [];
  const elevations = elevationData?.elevations ?? [];

  // Enhanced statistics calculation
  const statistics = useMemo(() => {
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const avgElevation = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;
    const totalDistance = distances[distances.length - 1] || 0;
    const elevationGain = maxElevation - minElevation;
    
    // Calculate slope statistics
    const slopes = [];
    for (let i = 1; i < elevations.length; i++) {
      const distanceDiff = distances[i] - distances[i - 1];
      const elevationDiff = elevations[i] - elevations[i - 1];
      if (distanceDiff > 0) {
        slopes.push((elevationDiff / distanceDiff) * 100); // Percentage slope
      }
    }
    
    const avgSlope = slopes.length > 0 ? slopes.reduce((sum, slope) => sum + Math.abs(slope), 0) / slopes.length : 0;
    const maxSlope = slopes.length > 0 ? Math.max(...slopes.map(Math.abs)) : 0;
    
    // Calculate elevation change frequency
    let elevationChanges = 0;
    for (let i = 1; i < elevations.length; i++) {
      if (Math.abs(elevations[i] - elevations[i - 1]) > 0.5) {
        elevationChanges++;
      }
    }
    
    // Calculate grade classification
    const getGradeClassification = (slope: number) => {
      const absSlope = Math.abs(slope);
      if (absSlope < 2) return { label: 'Flat', color: 'green' };
      if (absSlope < 5) return { label: 'Gentle', color: 'blue' };
      if (absSlope < 10) return { label: 'Moderate', color: 'yellow' };
      if (absSlope < 15) return { label: 'Steep', color: 'orange' };
      return { label: 'Very Steep', color: 'red' };
    };
    
    const overallGrade = getGradeClassification(avgSlope);

    return {
      minElevation,
      maxElevation,
      avgElevation,
      totalDistance,
      elevationGain,
      avgSlope,
      maxSlope,
      elevationChanges,
      overallGrade,
      totalPoints: elevations.length,
      elevationRange: maxElevation - minElevation,
    };
  }, [distances, elevations]);

  const chartData = {
    labels: distances.map(d => `${d.toFixed(0)}m`),
    datasets: [
      {
        label: 'Elevation',
        data: elevations,
        borderColor: chartType === 'line' ? '#3b82f6' : '#10b981',
        backgroundColor: chartType === 'line' 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(16, 185, 129, 0.8)',
        borderWidth: chartType === 'line' ? 3 : 0,
        fill: chartType === 'line',
        tension: chartType === 'line' ? 0.1 : 0,
        pointRadius: chartType === 'line' ? 0 : 0,
        pointHoverRadius: chartType === 'line' ? 8 : 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Elevation Profile - ${statistics.totalDistance.toFixed(1)}m Total Distance`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        color: '#111827',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: (context: any) => `Distance: ${distances[context[0].dataIndex].toFixed(1)}m`,
          label: (context: any) => [
            `Elevation: ${context.parsed.y.toFixed(1)}m`,
            `Slope: ${statistics.slopes?.[context[0].dataIndex]?.toFixed(1) || '0.0'}%`,
          ],
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Distance (meters)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Elevation (meters)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      point: {
        hoverBackgroundColor: '#3b82f6',
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 3,
      },
    },
  };

  const handleExport = () => {
    // Create CSV data
    const csvContent = [
      'Distance (m),Elevation (m)',
      ...distances.map((distance, index) => `${distance.toFixed(2)},${elevations[index].toFixed(2)}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `elevation-profile-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Elevation Profile',
          text: `Elevation profile: ${statistics.totalDistance.toFixed(1)}m distance, ${statistics.elevationGain.toFixed(1)}m elevation gain`,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        `Elevation Profile: ${statistics.totalDistance.toFixed(1)}m distance, ${statistics.elevationGain.toFixed(1)}m elevation gain`
      );
    }
  };

  const containerStyle = viewMode === 'fullscreen' ? {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  } : {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const modalStyle = viewMode === 'fullscreen' ? {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '95vw',
    height: '95vh',
    margin: '0',
    maxHeight: 'none',
    overflowY: 'auto' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  } : {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '1200px',
    width: '95%',
    margin: '0 16px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  if (!isVisible || distances.length === 0 || elevations.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#111827', 
              margin: '0 0 4px 0' 
            }}>
              Elevation Profile Analysis
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: 0 
            }}>
              Detailed terrain analysis with {statistics.totalPoints} data points
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Chart Type Toggle */}
            <div style={{
              display: 'flex',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '4px',
            }}>
              <EnhancedButton
                onClick={() => setChartType('line')}
                variant={chartType === 'line' ? 'primary' : 'ghost'}
                size="sm"
                icon={LineChart}
                style={{ borderRadius: '6px' }}
              />
              <EnhancedButton
                onClick={() => setChartType('bar')}
                variant={chartType === 'bar' ? 'primary' : 'ghost'}
                size="sm"
                icon={BarChart3}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* View Mode Toggle */}
            <EnhancedButton
              onClick={() => setViewMode(viewMode === 'normal' ? 'fullscreen' : 'normal')}
              variant="ghost"
              size="sm"
              icon={viewMode === 'normal' ? Maximize2 : Minimize2}
            />

            {/* Action Buttons */}
            <EnhancedButton
              onClick={handleExport}
              variant="secondary"
              size="sm"
              icon={Download}
            >
              Export
            </EnhancedButton>
            <EnhancedButton
              onClick={handleShare}
              variant="secondary"
              size="sm"
              icon={Share2}
            >
              Share
            </EnhancedButton>
            <EnhancedButton
              onClick={onClose}
              variant="danger"
              size="sm"
              icon={X}
            />
          </div>
        </div>

        {/* Statistics Cards */}
        {showStatistics && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827',
                margin: 0
              }}>
                Terrain Statistics
              </h3>
              <EnhancedButton
                onClick={() => setShowStatistics(!showStatistics)}
                variant="ghost"
                size="sm"
              >
                {showStatistics ? 'Hide' : 'Show'} Statistics
              </EnhancedButton>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              <StatCard
                title="Total Distance"
                value={`${statistics.totalDistance.toFixed(1)}m`}
                subtitle="Path length"
                icon={Navigation}
                color="blue"
              />
              <StatCard
                title="Elevation Gain"
                value={`${statistics.elevationGain.toFixed(1)}m`}
                subtitle="Total climb"
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                title="Min Elevation"
                value={`${statistics.minElevation.toFixed(1)}m`}
                subtitle="Lowest point"
                icon={Activity}
                color="yellow"
              />
              <StatCard
                title="Max Elevation"
                value={`${statistics.maxElevation.toFixed(1)}m`}
                subtitle="Highest point"
                icon={Zap}
                color="red"
              />
              <StatCard
                title="Average Slope"
                value={`${statistics.avgSlope.toFixed(1)}%`}
                subtitle="Terrain steepness"
                icon={TrendingUp}
                color="purple"
              />
              <StatCard
                title="Terrain Grade"
                value={statistics.overallGrade.label}
                subtitle="Difficulty level"
                icon={Info}
                color={statistics.overallGrade.color as any}
              />
            </div>
          </div>
        )}

        {/* Chart */}
        <div style={{ 
          height: viewMode === 'fullscreen' ? '60vh' : '400px',
          marginBottom: '24px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
        }}>
          {chartType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Additional Information */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
        }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#111827',
            margin: '0 0 12px 0'
          }}>
            Analysis Insights
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            <div>
              <strong>Terrain Characteristics:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Average elevation: {statistics.avgElevation.toFixed(1)}m</li>
                <li>Elevation range: {statistics.elevationRange.toFixed(1)}m</li>
                <li>Data points: {statistics.totalPoints}</li>
              </ul>
            </div>
            <div>
              <strong>Slope Analysis:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Maximum slope: {statistics.maxSlope.toFixed(1)}%</li>
                <li>Elevation changes: {statistics.elevationChanges}</li>
                <li>Grade classification: {statistics.overallGrade.label}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#6b7280',
          backgroundColor: '#fef3c7',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #fbbf24',
        }}>
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Hover over the chart to see detailed elevation data at each point</li>
            <li>Switch between line and bar charts for different perspectives</li>
            <li>Use fullscreen mode for detailed analysis</li>
            <li>Export data for further analysis in external tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

