// src/pages/StatisticsPage.tsx
import { useState, useMemo } from 'react';
import Flatpickr from 'react-flatpickr';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';
import { useDataStore } from '../stores/dataStore';
import StatsSummary from '../components/statistics/StatsSummary';
import ProfitChart from '../components/statistics/ProfitChart';
import PlatformChart from '../components/statistics/PlatformChart';
import { FaCalendar, FaTimes } from 'react-icons/fa';
import HighlightsPanel from '../components/statistics/HighlightsPanel';
import PlatformPerformance from '../components/statistics/PlatformPerformance';
import PerformanceByDay from '../components/statistics/PerformanceByDay';
import { HistorySummaryStatsSkeleton } from '../components/shared/Skeletons';

const StatisticsPage = () => {
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');
    const { allBets, loading } = useDataStore((state) => ({ allBets: state.bets, loading: state.loading }));

    const filteredBets = useMemo(() => {
        const actualBets = allBets.filter(b => b.bet_type !== 'Kasa İşlemi');
        if (dateRange.length !== 2) {
            return actualBets;
        }
        const [start, end] = dateRange;
        // Ensure the end date covers the entire day
        end.setHours(23, 59, 59, 999);
        
        return actualBets.filter(bet => {
            const betDate = new Date(bet.date);
            return betDate >= start && betDate <= end;
        });
    }, [allBets, dateRange]);

    const clearDateFilter = () => {
        setDateRange([]);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">İstatistikler</h1>
                    <p className="mt-1 text-gray-400">Verilerinizi görsel grafiklerle analiz edin.</p>
                </div>
                <div className="relative mt-4 sm:mt-0">
                    <FaCalendar className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <Flatpickr
                        options={{
                            mode: 'range',
                            dateFormat: 'd.m.Y',
                            locale: Turkish,
                        }}
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates)}
                        className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 pl-10 pr-10 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"
                        placeholder="Tarih aralığı seçin..."
                    />
                    {dateRange.length > 0 && (
                        <button onClick={clearDateFilter} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white">
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 p-1 bg-gray-900/50 rounded-lg">
                 <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full text-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'overview'
                        ? 'gradient-button shadow-md'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    Genel Bakış
                  </button>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`w-full text-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'analysis'
                        ? 'gradient-button shadow-md'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    Derinlemesine Analiz
                  </button>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <HistorySummaryStatsSkeleton />
                     <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                         <div className="lg:col-span-3 glass-card rounded-2xl p-4 h-96 skeleton" />
                         <div className="lg:col-span-2 glass-card rounded-2xl p-4 h-96 skeleton" />
                     </div>
                </div>
            ) : filteredBets.length > 0 ? (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <StatsSummary filteredBets={filteredBets} />
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                          <div className="lg:col-span-3 glass-card rounded-2xl p-4 h-96">
                              <ProfitChart filteredBets={filteredBets} />
                          </div>
                          <div className="lg:col-span-2 glass-card rounded-2xl p-4 h-96">
                              <PlatformChart filteredBets={filteredBets} />
                          </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'analysis' && (
                    <div className="space-y-6">
                      <HighlightsPanel filteredBets={filteredBets} />
                      <PlatformPerformance filteredBets={filteredBets} />
                      <div className="glass-card rounded-2xl p-4 h-96">
                        <PerformanceByDay filteredBets={filteredBets} />
                      </div>
                    </div>
                  )}
                </>
            ) : (
                <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-xl">Gösterilecek istatistik verisi bulunmuyor.</p>
                </div>
            )}
        </div>
    );
};

export default StatisticsPage;