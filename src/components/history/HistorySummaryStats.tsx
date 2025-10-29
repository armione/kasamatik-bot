// src/components/history/HistorySummaryStats.tsx
import React, { useMemo } from 'react';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';

interface HistorySummaryStatsProps {
    filteredBets: Bet[];
}

const StatCard = ({ title, value, colorClass }: { title: string; value: string; colorClass?: string }) => (
    <div className="glass-card p-4 rounded-xl text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-xl font-bold font-montserrat ${colorClass || 'text-white'}`}>{value}</p>
    </div>
);


const HistorySummaryStats: React.FC<HistorySummaryStatsProps> = ({ filteredBets }) => {
    const stats = useMemo(() => {
        const totalBets = filteredBets.length;
        const totalInvestment = filteredBets.reduce((sum, bet) => sum + bet.bet_amount, 0);
        const netProfitLoss = filteredBets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);
        
        const settledBets = filteredBets.filter(bet => {
            const isSpecialOdd = !!bet.special_odd_id;
            const status = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;
            return status !== 'pending';
        });
        
        const wonBets = settledBets.filter(bet => {
            const isSpecialOdd = !!bet.special_odd_id;
            const status = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;
            return status === 'won';
        });

        const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;

        return {
            totalBets,
            totalInvestment,
            netProfitLoss,
            winRate
        };
    }, [filteredBets]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
                title="Toplam Bahis"
                value={stats.totalBets.toString()}
            />
            <StatCard 
                title="Toplam Yatırım"
                value={`${stats.totalInvestment.toFixed(2)} ₺`}
            />
            <StatCard 
                title="Net Kar/Zarar"
                value={`${stats.netProfitLoss >= 0 ? '+' : ''}${stats.netProfitLoss.toFixed(2)} ₺`}
                colorClass={stats.netProfitLoss > 0 ? 'text-green-400' : stats.netProfitLoss < 0 ? 'text-red-400' : 'text-white'}
            />
            <StatCard 
                title="Kazanma Oranı"
                value={`${stats.winRate.toFixed(1)}%`}
                colorClass={stats.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}
            />
        </div>
    );
};

export default HistorySummaryStats;
