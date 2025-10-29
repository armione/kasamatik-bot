// src/pages/StatisticsPage.tsx
import { useState, useMemo } from 'react';
import Flatpickr from 'react-flatpickr';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';
import { useDataStore } from '../stores/dataStore';
import { Bet } from '../types';
import StatsSummary from '../components/statistics/StatsSummary';
import ProfitChart from '../components/statistics/ProfitChart';
import PlatformChart from '../components/statistics/PlatformChart';
import { FaCalendar, FaTimes } from 'react-icons/fa';

const StatisticsPage = () => {
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const allBets = useDataStore((state) => state.bets);

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

            {filteredBets.length > 0 ? (
                <>
                    <StatsSummary filteredBets={filteredBets} />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 glass-card rounded-2xl p-4 h-96">
                            <ProfitChart filteredBets={filteredBets} />
                        </div>
                        <div className="lg:col-span-2 glass-card rounded-2xl p-4 h-96">
                            <PlatformChart filteredBets={filteredBets} />
                        </div>
                    </div>
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
