// src/components/statistics/PlatformChart.tsx
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Bet } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface PlatformChartProps {
  filteredBets: Bet[];
}

const PlatformChart: React.FC<PlatformChartProps> = ({ filteredBets }) => {
  const platformCounts = filteredBets.reduce((acc, bet) => {
    acc[bet.platform] = (acc[bet.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = {
    labels: Object.keys(platformCounts),
    datasets: [
      {
        label: 'Bahis Sayısı',
        data: Object.values(platformCounts),
        backgroundColor: [
          '#8db3f0',
          '#6366f1',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#a855f7',
          '#3b82f6',
          '#ec4899'
        ],
        borderColor: 'rgba(41, 44, 48, 0.8)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const,
            labels: {
                color: 'rgba(255, 255, 255, 0.8)'
            }
        },
        title: {
            display: true,
            text: 'Platforma Göre Bahis Dağılımı',
            color: 'rgba(255, 255, 255, 0.9)',
            font: { size: 16 }
        },
    },
  };

  return <Doughnut data={data} options={options} />;
};

export default PlatformChart;
