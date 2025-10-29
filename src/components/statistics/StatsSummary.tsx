// src/components/statistics/StatsSummary.tsx
import React, { useMemo } from 'react';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';

interface StatsSummaryProps {
    filteredBets: Bet[];
}

const StatCard = ({ title, value, subtext, colorClass }: { title: string; value: string; subtext: string; colorClass?: string }) => (
    <div className="glass-card p-4 rounded-xl">
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-bold font-montserrat ${colorClass || 'text-white'}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
);

const StatsSummary: React.FC<StatsSummaryProps> = ({ filteredBets }) => {
    const stats = useMemo(() => {
        const settledBets = filteredBets.filter(b => b.status !== 'pending');
        const wonBets = settledBets.filter(b => b.status === 'won');
        const totalInvested = filteredBets.reduce((sum, b) => sum + b.bet_amount, 0);
        const netProfit = filteredBets.reduce((sum, b) => sum + calculateProfitLoss(b), 0);
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
        const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
        const avgOdds = filteredBets.length > 0 ? filteredBets.reduce((sum, b) => sum + b.odds, 0) / filteredBets.length : 0;
        
        return {
            totalBets: filteredBets.length,
            winRate,
            wonCount: wonBets.length,
            settledCount: settledBets.length,
            avgOdds,
            roi,
            totalInvested,
            netProfit
        };
    }, [filteredBets]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
                title="Toplam Bahis"
                value={stats.totalBets.toString()}
                subtext={`Spor & Canlı`}
            />
            <StatCard 
                title="Kazanma Oranı"
                value={`${stats.winRate.toFixed(1)}%`}
                subtext="Kazanan / Sonuçlanan Bahis"
                colorClass={stats.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}
            />
            <StatCard 
                title="Ortalama Oran"
                value={stats.avgOdds.toFixed(2)}
                subtext="Tüm bahisler"
            />
            <StatCard 
                title="Yatırım Geri Dönüşü (ROI)"
                value={`${stats.roi.toFixed(1)}%`}
                subtext="Net Kar / Toplam Yatırım"
                colorClass={stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}
            />
        </div>
    );
};

export default StatsSummary;