import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PlatformStats } from '../types/betting';

interface PlatformPieChartProps {
  data: PlatformStats[];
  metric: 'netProfit' | 'totalBets' | 'winRate';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const PlatformPieChart: React.FC<PlatformPieChartProps> = ({ data, metric }) => {
  const getTitle = () => {
    switch (metric) {
      case 'netProfit':
        return 'Platform Bazında Net Kar';
      case 'totalBets':
        return 'Platform Bazında Bahis Dağılımı';
      case 'winRate':
        return 'Platform Bazında Başarı Oranları';
      default:
        return 'Platform Analizi';
    }
  };

  const formatValue = (value: number) => {
    switch (metric) {
      case 'netProfit':
        return `₺${value.toFixed(2)}`;
      case 'totalBets':
        return `${value} bahis`;
      case 'winRate':
        return `%${value.toFixed(1)}`;
      default:
        return value.toString();
    }
  };

  const chartData = data.map(item => ({
    name: item.platform,
    value: item[metric],
    displayValue: formatValue(item[metric])
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{getTitle()}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string) => [formatValue(value), name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};