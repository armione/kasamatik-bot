// src/pages/HistoryPage.tsx
import { useMemo, useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import BetFilters from '../components/history/BetFilters';
import BetCard from '../components/history/BetCard';
import Pagination from '../components/shared/Pagination';
import { ITEMS_PER_PAGE } from '../lib/constants';
import HistorySummaryStats from '../components/history/HistorySummaryStats';

const HistoryPage = () => {
  const bets = useDataStore((state) => state.bets);
  const [filters, setFilters] = useState({
    status: 'all',
    platform: 'all',
    searchTerm: '',
    period: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const actualBets = useMemo(() => bets.filter(bet => bet.bet_type !== 'Kasa İşlemi'), [bets]);
  
  const filteredBets = useMemo(() => {
      return actualBets.filter(bet => {
        // Date period filtering
        if (filters.period !== 'all') {
            const periodDays = parseInt(filters.period, 10);
            const endDate = new Date();
            const startDate = new Date();
            if (periodDays === 1) { // last 24 hours
                startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
            } else {
                startDate.setDate(endDate.getDate() - (periodDays - 1));
                startDate.setHours(0, 0, 0, 0);
            }
            const betDate = new Date(bet.date);
            if (betDate < startDate || betDate > endDate) {
                return false;
            }
        }
        
        // Other filters
        const isSpecialOdd = !!bet.special_odd_id;
        const currentStatus = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;
        const statusMatch = filters.status === 'all' || currentStatus === filters.status;
        const platformMatch = filters.platform === 'all' || bet.platform === filters.platform;
        const searchMatch = !filters.searchTerm || bet.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
        
        return statusMatch && platformMatch && searchMatch;
      });
  }, [actualBets, filters]);

  const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
  const paginatedBets = filteredBets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold gradient-text">Bahis Geçmişi</h1>
        <p className="mt-1 text-gray-400">Tüm bahis kayıtlarınızı buradan inceleyebilirsiniz.</p>
      </div>

      <BetFilters filters={filters} setFilters={setFilters} />
      
      <HistorySummaryStats filteredBets={filteredBets} />

      {paginatedBets.length > 0 ? (
        <div className="space-y-4">
          {paginatedBets.map(bet => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl">Bu filtrede bahis bulunmuyor.</p>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};

export default HistoryPage;
