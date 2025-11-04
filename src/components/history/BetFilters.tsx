// src/components/history/BetFilters.tsx
import React, { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { DEFAULT_PLATFORMS } from '../../lib/constants';

interface BetFiltersProps {
    filters: {
        status: string;
        platform: string;
        searchTerm: string;
        period: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const BetFilters: React.FC<BetFiltersProps> = ({ filters, setFilters }) => {
    const customPlatforms = useDataStore((state) => state.platforms);

    const allPlatforms = useMemo(() => {
        return [...DEFAULT_PLATFORMS, ...customPlatforms.map(p => p.name)].sort();
    }, [customPlatforms]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePeriodClick = (period: string) => {
        setFilters((prev: any) => ({ ...prev, period }));
    };
    
    const periodButtons = [
        { label: 'Bugün', value: '1' },
        { label: '7 Gün', value: '7' },
        { label: '30 Gün', value: '30' },
        { label: 'Tümü', value: 'all' },
      ];

    return (
        <div className="glass-card rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    name="searchTerm"
                    value={filters.searchTerm}
                    onChange={handleFilterChange}
                    placeholder="Açıklamada ara..."
                    className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"
                />
                <select name="platform" value={filters.platform} onChange={handleFilterChange} className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
                    <option value="all">Tüm Platformlar</option>
                    {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                 <select name="status" value={filters.status} onChange={handleFilterChange} className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Bekleyen</option>
                    <option value="won">Kazandı</option>
                    <option value="lost">Kaybetti</option>
                    <option value="refunded">İade Edildi</option>
                </select>
            </div>
            <div className="flex items-center space-x-2 p-1 bg-gray-900/50 rounded-lg w-full md:w-auto">
                {periodButtons.map(btn => (
                    <button
                        key={btn.value}
                        onClick={() => handlePeriodClick(btn.value)}
                        className={`w-full text-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            filters.period === btn.value
                                ? 'gradient-button shadow-md'
                                : 'text-gray-400 hover:bg-gray-700/50'
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BetFilters;
