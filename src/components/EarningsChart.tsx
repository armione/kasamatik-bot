import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DailyStats } from '../types/betting';
import { format, parseISO } from 'date-fns';

interface EarningsChartProps {
  data: DailyStats[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

export const EarningsChart: React.FC<EarningsChartProps> = ({ data, timeRange }) => {
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
        Kazanç/Zarar Analizi ({timeRange === 'daily' ? 'Günlük' : timeRange === 'weekly' ? 'Haftalık' : 'Aylık'})
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
            formatter={(value: number, name: string) => [
              `₺${value.toFixed(2)}`,
              name === 'earnings' ? 'Kazanç' : 
              name === 'losses' ? 'Zarar' : 'Net Kar'
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            formatter={(value) => 
              value === 'earnings' ? 'Kazanç' : 
              value === 'losses' ? 'Zarar' : 'Net Kar'
            }
          />
          <Line 
            type="monotone" 
            dataKey="earnings" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="losses" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="netProfit" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};