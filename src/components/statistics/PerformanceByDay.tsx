// src/components/statistics/PerformanceByDay.tsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface PerformanceByDayProps {
    filteredBets: Bet[];
}

const PerformanceByDay: React.FC<PerformanceByDayProps> = ({ filteredBets }) => {
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayProfits = Array(7).fill(0);

    filteredBets.forEach(bet => {
        const dayIndex = new Date(bet.date).getDay();
        dayProfits[dayIndex] += calculateProfitLoss(bet);
    });

    const data = {
        labels: dayNames,
        datasets: [
            {
                label: 'Net Kar/Zarar',
                data: dayProfits,
                backgroundColor: dayProfits.map(p => p >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: dayProfits.map(p => p >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1,
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
                text: 'Haftanın Günlerine Göre Performans',
                color: 'rgba(255, 255, 255, 0.9)',
                font: { size: 16 }
            },
        },
        scales: {
            y: { 
                ticks: { color: 'rgba(255,255,255,0.7)', callback: (value: string | number) => `${value}₺` },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: { 
                ticks: { color: 'rgba(255,255,255,0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
        }
      };

    return <Bar options={options} data={data} />;
};

export default PerformanceByDay;
