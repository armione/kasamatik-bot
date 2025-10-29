// src/components/special_odds/SpecialOddsFilters.tsx
import React, { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';

interface SpecialOddsFiltersProps {
    filters: {
        status: string;
        platform: string;
        sort: string;
    };
    // FIX: Replaced 'any' with a specific type definition for better type safety.
    setFilters: React.Dispatch<React.SetStateAction<{
        status: string;
        platform: string;
        sort: string;
    }>>;
}

const SpecialOddsFilters: React.FC<SpecialOddsFiltersProps> = ({ filters, setFilters }) => {
    const specialOdds = useDataStore((state) => state.specialOdds);

    // FIX: Explicitly type `allPlatforms` as `string[]` to resolve type inference issues.
    const allPlatforms: string[] = useMemo(() => {
        // FIX: Explicitly type `platformSet` as `Set<string>` to fix the type inference issue where `Array.from` was returning `unknown[]`.
        const platformSet: Set<string> = new Set(specialOdds.map(odd => odd.platform));
        // FIX: Use Array.from instead of spread syntax to ensure correct type inference.
        return Array.from(platformSet).sort();
    }, [specialOdds]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // FIX: Removed 'any' type from state update for better type safety.
        setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="glass-card rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select name="status" value={filters.status} onChange={handleFilterChange} className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
                    <option value="pending">Bekleyen Fırsatlar</option>
                    <option value="all">Tüm Fırsatlar</option>
                    <option value="won">Kazananlar</option>
                    <option value="lost">Kaybedenler</option>
                    <option value="refunded">İade Edilenler</option>
                </select>
                <select name="platform" value={filters.platform} onChange={handleFilterChange} className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
                    <option value="all">Tüm Platformlar</option>
                    {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select name="sort" value={filters.sort} onChange={handleFilterChange} className="appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
                    <option value="newest">En Yeni</option>
                    <option value="odds_desc">En Yüksek Oran</option>
                    <option value="popularity_desc">En Popüler</option>
                </select>
            </div>
        </div>
    );
};

export default SpecialOddsFilters;
