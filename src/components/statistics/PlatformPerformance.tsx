// src/components/statistics/PlatformPerformance.tsx
import React, { useMemo } from 'react';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';

interface PlatformPerformanceProps {
    filteredBets: Bet[];
}

const PlatformPerformance: React.FC<PlatformPerformanceProps> = ({ filteredBets }) => {
    const platformData = useMemo(() => {
        const stats: Record<string, {
            betCount: number;
            investment: number;
            profit: number;
        }> = {};

        filteredBets.forEach(bet => {
            if (!stats[bet.platform]) {
                stats[bet.platform] = { betCount: 0, investment: 0, profit: 0 };
            }
            stats[bet.platform].betCount += 1;
            stats[bet.platform].investment += bet.bet_amount;
            stats[bet.platform].profit += calculateProfitLoss(bet);
        });

        return Object.entries(stats).map(([platform, data]) => ({
            platform,
            ...data,
            roi: data.investment > 0 ? (data.profit / data.investment) * 100 : 0,
        })).sort((a, b) => b.profit - a.profit); // Sort by most profitable
    }, [filteredBets]);

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Platform Performansı</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/30">
                        <tr>
                            <th scope="col" className="px-6 py-3">Platform</th>
                            <th scope="col" className="px-6 py-3 text-center">Toplam Bahis</th>
                            <th scope="col" className="px-6 py-3 text-right">Yatırım</th>
                            <th scope="col" className="px-6 py-3 text-right">Net Kar/Zarar</th>
                            <th scope="col" className="px-6 py-3 text-right">ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {platformData.map(({ platform, betCount, investment, profit, roi }) => (
                            <tr key={platform} className="border-b border-gray-700 hover:bg-gray-800/50">
                                <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{platform}</th>
                                <td className="px-6 py-4 text-center">{betCount}</td>
                                <td className="px-6 py-4 text-right">{investment.toFixed(2)} ₺</td>
                                <td className={`px-6 py-4 text-right font-semibold ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : ''}`}>
                                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ₺
                                </td>
                                <td className={`px-6 py-4 text-right font-semibold ${roi > 0 ? 'text-green-400' : roi < 0 ? 'text-red-400' : ''}`}>
                                    {roi.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlatformPerformance;
