import React from 'react';

interface MetricSelectorProps {
  selectedMetric: 'netProfit' | 'totalBets' | 'winRate';
  onMetricChange: (metric: 'netProfit' | 'totalBets' | 'winRate') => void;
}

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  selectedMetric,
  onMetricChange
}) => {
  const metrics = [
    { key: 'netProfit' as const, label: 'Net Kar' },
    { key: 'totalBets' as const, label: 'Bahis Sayısı' },
    { key: 'winRate' as const, label: 'Başarı Oranı' }
  ];

  return (
    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
      {metrics.map((metric) => (
        <button
          key={metric.key}
          onClick={() => onMetricChange(metric.key)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
            selectedMetric === metric.key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
};