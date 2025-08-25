import React, { useState, useMemo } from 'react';
import { mockBetData } from '../data/mockData';
import { 
  calculateDailyStats, 
  calculateWeeklyStats, 
  calculateMonthlyStats,
  calculatePlatformStats,
  calculateBetTypeStats
} from '../utils/analytics';
import { TimeRangeSelector } from './TimeRangeSelector';
import { EarningsChart } from './EarningsChart';
import { BetCountChart } from './BetCountChart';
import { PlatformPieChart } from './PlatformPieChart';
import { BetTypePieChart } from './BetTypePieChart';
import { StatsCards } from './StatsCards';
import { MetricSelector } from './MetricSelector';

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [platformMetric, setPlatformMetric] = useState<'netProfit' | 'totalBets' | 'winRate'>('netProfit');
  const [betTypeMetric, setBetTypeMetric] = useState<'netProfit' | 'totalBets' | 'winRate'>('netProfit');

  const timeSeriesData = useMemo(() => {
    switch (timeRange) {
      case 'weekly':
        return calculateWeeklyStats(mockBetData);
      case 'monthly':
        return calculateMonthlyStats(mockBetData);
      default:
        return calculateDailyStats(mockBetData);
    }
  }, [timeRange]);

  const platformStats = useMemo(() => calculatePlatformStats(mockBetData), []);
  const betTypeStats = useMemo(() => calculateBetTypeStats(mockBetData), []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bahis Analiz Paneli</h1>
          <p className="text-gray-600">Detaylı performans analizi ve istatistikler</p>
        </div>

        {/* Genel İstatistikler */}
        <StatsCards bets={mockBetData} />

        {/* Zaman Aralığı Seçici */}
        <TimeRangeSelector 
          selectedRange={timeRange} 
          onRangeChange={setTimeRange} 
        />

        {/* Zaman Serisi Grafikleri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <EarningsChart data={timeSeriesData} timeRange={timeRange} />
          <BetCountChart data={timeSeriesData} timeRange={timeRange} />
        </div>

        {/* Platform Analizi */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Analizi</h2>
          <MetricSelector 
            selectedMetric={platformMetric} 
            onMetricChange={setPlatformMetric} 
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlatformPieChart data={platformStats} metric={platformMetric} />
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Detayları</h3>
              <div className="space-y-3">
                {platformStats.map((platform, index) => (
                  <div key={platform.platform} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{platform.platform}</h4>
                      <p className="text-sm text-gray-600">
                        {platform.totalBets} bahis • %{platform.winRate.toFixed(1)} başarı
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${platform.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₺{platform.netProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bahis Türü Analizi */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bahis Türü Analizi</h2>
          <MetricSelector 
            selectedMetric={betTypeMetric} 
            onMetricChange={setBetTypeMetric} 
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BetTypePieChart data={betTypeStats} metric={betTypeMetric} />
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bahis Türü Detayları</h3>
              <div className="space-y-3">
                {betTypeStats.map((betType, index) => (
                  <div key={betType.betType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{betType.betType}</h4>
                      <p className="text-sm text-gray-600">
                        {betType.totalBets} bahis • %{betType.winRate.toFixed(1)} başarı
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${betType.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₺{betType.netProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};