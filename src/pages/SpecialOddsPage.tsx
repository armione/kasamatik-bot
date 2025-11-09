// src/pages/SpecialOddsPage.tsx
import { useState, useMemo } from 'react';
import { useDataStore } from '../stores/dataStore';
import { SpecialOdd } from '../types';
import SpecialOddsFilters from '../components/special_odds/SpecialOddsFilters';
import SpecialOddCard from '../components/special_odds/SpecialOddCard';
import { SpecialOddCardSkeleton } from '../components/shared/Skeletons';

const SpecialOddsPage = () => {
    const { specialOdds, loading } = useDataStore();
    const [filters, setFilters] = useState({
        status: 'pending',
        platform: 'all',
        sort: 'newest'
    });

    const sortedAndFilteredOdds = useMemo(() => {
        let filtered = [...specialOdds];

        // Filter by status
        if (filters.status !== 'all') {
            filtered = filtered.filter(odd => odd.status === filters.status);
        }

        // Filter by platform
        if (filters.platform !== 'all') {
            filtered = filtered.filter(odd => odd.platform === filters.platform);
        }

        // Sort
        switch (filters.sort) {
            case 'odds_desc':
                filtered.sort((a, b) => b.odds - a.odds);
                break;
            case 'popularity_desc':
                filtered.sort((a, b) => b.play_count - a.play_count);
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
        }

        return filtered;
    }, [specialOdds, filters]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Özel Oran Fırsatları</h1>
                <p className="mt-1 text-gray-400">Telegram kanallarından toplanan anlık fırsatları yakalayın.</p>
            </div>

            <SpecialOddsFilters filters={filters} setFilters={setFilters} />
            
            {loading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <SpecialOddCardSkeleton key={i} />)}
                 </div>
            ) : sortedAndFilteredOdds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedAndFilteredOdds.map(odd => (
                        <SpecialOddCard key={odd.id} odd={odd} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
                    <div className="text-6xl mb-4">⭐</div>
                    <p className="text-xl">Bu filtrede gösterilecek fırsat bulunmuyor.</p>
                </div>
            )}
        </div>
    );
};

export default SpecialOddsPage;