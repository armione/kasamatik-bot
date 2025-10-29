// src/components/statistics/HighlightsPanel.tsx
import React, { useMemo } from 'react';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';
import { FaTrophy, FaArrowUpRightDots, FaBuilding, FaCalendarDay } from 'react-icons/fa6';

interface HighlightsPanelProps {
    filteredBets: Bet[];
}

const HighlightCard = ({ icon, title, value, subtext }: { icon: React.ReactNode, title: string, value: string | React.ReactNode, subtext: string }) => (
    <div className="glass-card p-5 rounded-xl flex items-center">
        <div className="text-3xl text-primary-blue mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <div className="text-xl font-bold font-montserrat text-white">{value}</div>
            <p className="text-xs text-gray-500">{subtext}</p>
        </div>
    </div>
);

const HighlightsPanel: React.FC<HighlightsPanelProps> = ({ filteredBets }) => {
    const highlights = useMemo(() => {
        const wonBets = filteredBets.filter(b => b.status === 'won');

        // 1. En Yüksek Kazanç
        let highestWin: Bet | null = null;
        if (wonBets.length > 0) {
            highestWin = wonBets.reduce((max, bet) => calculateProfitLoss(bet) > calculateProfitLoss(max) ? bet : max);
        }

        // 2. En Yüksek Oran
        let highestOdds: Bet | null = null;
        if (wonBets.length > 0) {
            highestOdds = wonBets.reduce((max, bet) => bet.odds > max.odds ? bet : max);
        }

        // 3. En Başarılı Platform
        const platformStats: Record<string, { profit: number, investment: number }> = {};
        filteredBets.forEach(bet => {
            if (!platformStats[bet.platform]) {
                platformStats[bet.platform] = { profit: 0, investment: 0 };
            }
            platformStats[bet.platform].profit += calculateProfitLoss(bet);
            platformStats[bet.platform].investment += bet.bet_amount;
        });

        let bestPlatform = { name: '-', roi: -Infinity };
        Object.keys(platformStats).forEach(platform => {
            const stats = platformStats[platform];
            if (stats.investment > 0) {
                const roi = (stats.profit / stats.investment) * 100;
                if (roi > bestPlatform.roi) {
                    bestPlatform = { name: platform, roi };
                }
            }
        });

        // 4. Şanslı Gün
        const dayProfits: number[] = Array(7).fill(0);
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        filteredBets.forEach(bet => {
            const dayIndex = new Date(bet.date).getDay();
            dayProfits[dayIndex] += calculateProfitLoss(bet);
        });
        
        const maxProfit = Math.max(...dayProfits);
        const luckyDayIndex = dayProfits.indexOf(maxProfit);
        const luckyDay = maxProfit > 0 ? dayNames[luckyDayIndex] : '-';

        return { highestWin, highestOdds, bestPlatform, luckyDay };

    }, [filteredBets]);

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">"En"ler Paneli</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <HighlightCard
                    icon={<FaTrophy />}
                    title="En Yüksek Kazanç"
                    value={`${highlights.highestWin ? `+${calculateProfitLoss(highlights.highestWin).toFixed(2)}₺` : 'N/A'}`}
                    subtext={highlights.highestWin ? highlights.highestWin.platform : '-'}
                />
                <HighlightCard
                    icon={<FaArrowUpRightDots />}
                    title="En Yüksek Oran"
                    value={highlights.highestOdds ? highlights.highestOdds.odds.toFixed(2) : 'N/A'}
                    subtext={highlights.highestOdds ? highlights.highestOdds.platform : '-'}
                />
                <HighlightCard
                    icon={<FaBuilding />}
                    title="En Başarılı Platform"
                    value={highlights.bestPlatform.name}
                    subtext={highlights.bestPlatform.roi !== -Infinity ? `ROI: ${highlights.bestPlatform.roi.toFixed(1)}%` : '-'}
                />
                <HighlightCard
                    icon={<FaCalendarDay />}
                    title="Şanslı Gününüz"
                    value={highlights.luckyDay}
                    subtext="En karlı gün"
                />
            </div>
        </div>
    );
};

export default HighlightsPanel;
