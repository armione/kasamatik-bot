// src/pages/StatisticsPage.tsx
import { useMemo, useState } from 'react';
import BetFilters from '../components/history/BetFilters';
import HighlightsPanel from '../components/statistics/HighlightsPanel';
import PerformanceByDay from '../components/statistics/PerformanceByDay';
import PlatformChart from '../components/statistics/PlatformChart';
import PlatformPerformance from '../components/statistics/PlatformPerformance';
import ProfitChart from '../components/statistics/ProfitChart';
import StatsSummary from '../components/statistics/StatsSummary';
import { useDataStore } from '../stores/dataStore';
import { HistorySummaryStatsSkeleton } from '../components/shared/Skeletons';

const StatisticsPage = () => {
    const { bets, loading } = useDataStore((state) => ({ bets: state.bets, loading: state.loading }));
    const [filters, setFilters] = useState({
        status: 'all',
        platform: 'all',
        searchTerm: '',
        period: 'all',
    });

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

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">İstatistikler</h1>
                    <p className="mt-1 text-gray-400">Bahis performansınızı detaylı olarak analiz edin.</p>
                </div>
                <div className="skeleton h-24 w-full rounded-2xl"></div>
                <HistorySummaryStatsSkeleton />
                <HistorySummaryStatsSkeleton />
                <div className="skeleton h-96 w-full rounded-2xl"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="skeleton h-80 w-full rounded-2xl"></div>
                    <div className="skeleton h-80 w-full rounded-2xl"></div>
                </div>
                <div className="skeleton h-64 w-full rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">İstatistikler</h1>
                <p className="mt-1 text-gray-400">Bahis performansınızı detaylı olarak analiz edin.</p>
            </div>

            <BetFilters filters={filters} setFilters={setFilters} />

            {filteredBets.length > 0 ? (
                <>
                    <StatsSummary filteredBets={filteredBets} />
                    <HighlightsPanel filteredBets={filteredBets} />
                    
                    <div className="glass-card rounded-2xl p-6">
                        <div className="h-96">
                            <ProfitChart filteredBets={filteredBets} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card rounded-2xl p-6">
                            <div className="h-80">
                                <PlatformChart filteredBets={filteredBets} />
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <div className="h-80">
                                <PerformanceByDay filteredBets={filteredBets} />
                            </div>
                        </div>
                    </div>

                    <PlatformPerformance filteredBets={filteredBets} />
                </>
            ) : (
                <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-xl">Bu filtrede gösterilecek istatistik verisi bulunmuyor.</p>
                </div>
            )}
        </div>
    );
};

export default StatisticsPage;
