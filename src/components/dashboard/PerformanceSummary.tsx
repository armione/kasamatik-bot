// src/components/dashboard/PerformanceSummary.tsx
import { useState, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { calculateProfitLoss } from '../../lib/utils';
import { Bet } from '../../types';

const PerformanceSummary = () => {
  const [period, setPeriod] = useState<number>(1); // 1: 24h, 7: 7d, 30: 30d
  const bets = useDataStore((state) => state.bets);

  const summary = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    if (period === 1) {
      startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      startDate.setDate(endDate.getDate() - (period - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    const periodBets = bets.filter((bet: Bet) => {
      const betDate = new Date(bet.date);
      return bet.bet_type !== 'Kasa İşlemi' && betDate >= startDate && betDate <= endDate;
    });

    const totalPlayed = periodBets.reduce((sum, bet) => sum + bet.bet_amount, 0);
    const netResult = periodBets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);

    return { totalPlayed, netResult };
  }, [bets, period]);

  const periodButtons = [
    { label: 'Bugün', value: 1 },
    { label: '7 Gün', value: 7 },
    { label: '30 Gün', value: 30 },
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-xl font-bold text-white mb-3 sm:mb-0">Performans Özeti</h3>
        <div className="flex space-x-2 p-1 bg-gray-900/50 rounded-lg">
          {periodButtons.map(btn => (
             <button
                key={btn.value}
                onClick={() => setPeriod(btn.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === btn.value
                    ? 'gradient-button shadow-md'
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {btn.label}
              </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-800/30 rounded-lg">
          <p className="text-sm text-gray-400">Toplam Oynanan</p>
          <p className="text-2xl font-bold font-montserrat text-white">{summary.totalPlayed.toFixed(2)} ₺</p>
        </div>
        <div className="text-center p-4 bg-gray-800/30 rounded-lg">
          <p className="text-sm text-gray-400">Net Sonuç</p>
          <p className={`text-2xl font-bold font-montserrat ${summary.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.netResult >= 0 ? '+' : ''}{summary.netResult.toFixed(2)} ₺
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummary;
