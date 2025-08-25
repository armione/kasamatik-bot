import React from 'react';

interface TimeRangeSelectorProps {
  selectedRange: 'daily' | 'weekly' | 'monthly';
  onRangeChange: (range: 'daily' | 'weekly' | 'monthly') => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange
}) => {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
      {(['daily', 'weekly', 'monthly'] as const).map((range) => (
        <button
          key={range}
          onClick={() => onRangeChange(range)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            selectedRange === range
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {range === 'daily' && 'Günlük'}
          {range === 'weekly' && 'Haftalık'}
          {range === 'monthly' && 'Aylık'}
        </button>
      ))}
    </div>
  );
};