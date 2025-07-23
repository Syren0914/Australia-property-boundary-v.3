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

interface ElevationProfileProps {
  isVisible: boolean;
  onClose: () => void;
  elevationData: {
    distances: number[];
    elevations: number[];
  } | null;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  isVisible,
  onClose,
  elevationData,
}) => {
  console.log('ElevationProfile render:', { isVisible, hasData: !!elevationData });
  if (!isVisible || !elevationData) return null;

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Elevation Profile',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const distance = elevationData.distances[index];
            return `Distance: ${distance.toFixed(1)}m`;
          },
          label: function(context: any) {
            const elevation = context.parsed.y;
            const index = context.dataIndex;
            const distance = elevationData.distances[index];
            
            // Calculate slope if not the first point
            let slopeInfo = '';
            if (index > 0) {
              const prevDistance = elevationData.distances[index - 1];
              const prevElevation = elevationData.elevations[index - 1];
              const distanceDiff = distance - prevDistance;
              const elevationDiff = elevation - prevElevation;
              const slope = (elevationDiff / distanceDiff) * 100; // percentage
              slopeInfo = ` | Slope: ${slope.toFixed(1)}%`;
            }
            
            return `Elevation: ${elevation.toFixed(1)}m${slopeInfo}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Elevation (mAHD)',
          font: {
            weight: 'bold' as const
          }
        },
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return value + 'm';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Distance (m)',
          font: {
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(_value: any, index: number) {
            const distance = elevationData.distances[index];
            return distance ? distance.toFixed(0) + 'm' : '';
          }
        }
      },
    },
    elements: {
      point: {
        radius: 0, // Hide points by default
        hoverRadius: 6, // Show points on hover
        hoverBorderWidth: 2,
        hoverBorderColor: 'white',
      },
      line: {
        borderWidth: 3,
        tension: 0.2, // Slightly more curved lines
      }
    },
    hover: {
      mode: 'index' as const,
      intersect: false,
    }
  };

  const data = {
    labels: elevationData.distances.map(d => d.toFixed(1)),
    datasets: [
      {
        label: 'Elevation (mAHD)',
        data: elevationData.elevations,
        borderColor: 'rgb(59, 130, 246)', // Blue color
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: 'white',
      },
    ],
  };

  // Calculate statistics
  const totalDistance = elevationData.distances[elevationData.distances.length - 1];
  const minElevation = Math.min(...elevationData.elevations);
  const maxElevation = Math.max(...elevationData.elevations);
  const totalElevationChange = maxElevation - minElevation;
  
  // Calculate average slope
  let totalSlope = 0;
  let slopeCount = 0;
  for (let i = 1; i < elevationData.distances.length; i++) {
    const distanceDiff = elevationData.distances[i] - elevationData.distances[i - 1];
    const elevationDiff = elevationData.elevations[i] - elevationData.elevations[i - 1];
    if (distanceDiff > 0) {
      totalSlope += Math.abs(elevationDiff / distanceDiff) * 100;
      slopeCount++;
    }
  }
  const averageSlope = slopeCount > 0 ? totalSlope / slopeCount : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Elevation Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="h-96 mb-4">
          <Line options={options} data={data} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="font-semibold text-blue-800">Total Distance</div>
            <div className="text-2xl font-bold text-blue-600">{totalDistance.toFixed(1)}m</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="font-semibold text-green-800">Elevation Range</div>
            <div className="text-2xl font-bold text-green-600">{minElevation.toFixed(1)}m - {maxElevation.toFixed(1)}m</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="font-semibold text-orange-800">Total Change</div>
            <div className="text-2xl font-bold text-orange-600">{totalElevationChange.toFixed(1)}m</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="font-semibold text-purple-800">Avg Slope</div>
            <div className="text-2xl font-bold text-purple-600">{averageSlope.toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          💡 Hover over the chart to see detailed elevation and slope information at each point
        </div>
      </div>
    </div>
  );
}; 