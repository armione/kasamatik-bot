import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyStats } from '../types/betting';
import { format, parseISO } from 'date-fns';

interface BetCountChartProps {
  data: DailyStats[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

export const BetCountChart: React.FC<BetCountChartProps> = ({ data, timeRange }) => {
  const formatXAxis = (dateStr: string) => {
    const date = parseISO(dateStr);
    switch (timeRange) {
      case 'daily':
        return format(date, 'dd/MM');
      case 'weekly':
        return format(date, 'dd/MM');
      case 'monthly':
        return format(date, 'MM/yyyy');
      default:
        return dateStr;
    }
  };

  const formatTooltipLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    switch (timeRange) {
      case 'daily':
        return format(date, 'dd MMMM yyyy');
      case 'weekly':
        return `Hafta: ${format(date, 'dd MMMM yyyy')}`;
      case 'monthly':
        return format(date, 'MMMM yyyy');
      default:
        return dateStr;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Bahis Sayısı ({timeRange === 'daily' ? 'Günlük' : timeRange === 'weekly' ? 'Haftalık' : 'Aylık'})
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            stroke="#666"
            fontSize={12}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip 
            labelFormatter={formatTooltipLabel}
            formatter={(value: number) => [`${value} bahis`, 'Bahis Sayısı']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="betCount" 
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};