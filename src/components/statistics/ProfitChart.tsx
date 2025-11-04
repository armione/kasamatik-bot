// src/components/statistics/ProfitChart.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
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
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';

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

interface ProfitChartProps {
  filteredBets: Bet[];
}

const ProfitChart: React.FC<ProfitChartProps> = ({ filteredBets }) => {
  const sortedBets = [...filteredBets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let cumulativeProfit = 0;
  const profitData = sortedBets.map(bet => {
    cumulativeProfit += calculateProfitLoss(bet);
    return cumulativeProfit;
  });

  const chartLabels = sortedBets.map(bet => {
    const date = new Date(bet.date);
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Kümülatif Kar/Zarar',
        data: profitData,
        borderColor: 'rgba(139, 179, 240, 0.8)',
        backgroundColor: 'rgba(139, 179, 240, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(139, 179, 240, 1)',
        pointRadius: profitData.length < 50 ? 3 : 0, // Show points for smaller datasets
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
            text: 'Kümülatif Kar/Zarar Grafiği',
            color: 'rgba(255, 255, 255, 0.9)',
            font: { size: 16 }
        },
    },
    scales: {
        y: { 
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: { 
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
    }
  };

  return <Line options={options} data={data} />;
};

export default ProfitChart;
