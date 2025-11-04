
// src/components/dashboard/RecentBets.tsx
import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { calculateProfitLoss } from '../../lib/utils';
import { FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { Bet } from '../../types';

const RecentBets = () => {
  const bets = useDataStore((state) => state.bets);

  const recentBets = useMemo(() => {
    return bets.filter(b => b.bet_type !== 'Kasa İşlemi').slice(0, 5);
  }, [bets]);

  const getStatusInfo = (bet: Bet) => {
    const isSpecialOdd = !!bet.special_odd_id;
    const status = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;

    switch (status) {
      case 'won': return { class: 'bg-green-500/20 text-green-300', text: '✅' };
      case 'lost': return { class: 'bg-red-500/20 text-red-300', text: '❌' };
      case 'refunded': return { class: 'bg-blue-500/20 text-blue-300', text: '↩️' };
      default: return { class: 'bg-yellow-500/20 text-yellow-300', text: '⏳' };
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Son Bahisler</h3>
        <Link to="/history" className="text-sm text-primary-blue hover:text-blue-400 flex items-center gap-1">
          Tümü <FaArrowRight />
        </Link>
      </div>
      {recentBets.length > 0 ? (
        <div className="space-y-3">
          {recentBets.map(bet => {
            const statusInfo = getStatusInfo(bet);
            const profitLoss = calculateProfitLoss(bet);
            // Fix: Declare isSpecialOdd before it is used to determine the status.
            const isSpecialOdd = !!bet.special_odd_id;
            const status = (isSpecialOdd && bet.special_odds) ? bet.special_odds.status : bet.status;
            return (
              <div key={bet.id} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="font-medium text-white text-sm">{bet.platform}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.class}`}>{statusInfo.text}</span>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{bet.description}</p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="font-bold text-sm text-white">{bet.bet_amount.toFixed(2)} ₺</div>
                  {status !== 'pending' && (
                    <div className={`text-sm font-semibold ${profitLoss > 0 ? 'text-green-400' : profitLoss < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} ₺
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">📝 Henüz bahis yok.</div>
      )}
    </div>
  );
};

export default RecentBets;
