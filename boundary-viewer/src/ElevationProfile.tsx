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
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Elevation Profile',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Elevation (mAHD)',
        },
        beginAtZero: false,
      },
      x: {
        title: {
          display: true,
          text: 'Distance (m)',
        },
      },
    },
  };

  const data = {
    labels: elevationData.distances.map(d => d.toFixed(1)),
    datasets: [
      {
        label: 'Elevation (mAHD)',
        data: elevationData.elevations,
        borderColor: 'rgb(139, 69, 19)',
        backgroundColor: 'rgba(139, 69, 19, 0.3)',
        fill: true,
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Elevation Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="h-96">
          <Line options={options} data={data} />
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Total Distance: {elevationData.distances[elevationData.distances.length - 1].toFixed(1)}m</p>
          <p>Elevation Range: {Math.min(...elevationData.elevations).toFixed(1)}m - {Math.max(...elevationData.elevations).toFixed(1)}m</p>
          <p>Total Elevation Change: {(Math.max(...elevationData.elevations) - Math.min(...elevationData.elevations)).toFixed(1)}m</p>
        </div>
      </div>
    </div>
  );
}; 