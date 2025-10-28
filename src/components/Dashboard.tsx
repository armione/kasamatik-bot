import React, { useMemo } from 'react';
import { useAppContext } from '../context/StateContext';
import StatCard from './common/StatCard';
import { calculateProfitLoss, formatCurrency } from '../utils/helpers';
import BetItem from './common/BetItem';
import { Ad, Sponsor } from '../types';

const Dashboard: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { bets, ads, sponsors, dashboardPeriod } = state;

    const handlePeriodChange = (period: 'all' | 'week' | 'month') => {
        dispatch({ type: 'SET_DASHBOARD_PERIOD', payload: period });
    };

    const filteredBets = useMemo(() => {
        if (dashboardPeriod === 'all') {
            return bets;
        }
        const now = new Date();
        const periodStart = new Date();
        if (dashboardPeriod === 'week') {
            periodStart.setDate(now.getDate() - 7);
        } else if (dashboardPeriod === 'month') {
            periodStart.setMonth(now.getMonth() - 1);
        }
        return bets.filter(bet => new Date(bet.created_at) >= periodStart);
    }, [bets, dashboardPeriod]);

    const stats = useMemo(() => {
        const { totalStake, totalReturn } = calculateProfitLoss(filteredBets);
        const profit = totalReturn - totalStake;
        const roi = totalStake > 0 ? (profit / totalStake) * 100 : 0;
        const wonBets = filteredBets.filter(b => b.status === 'won').length;
        const lostBets = filteredBets.filter(b => b.status === 'lost').length;
        const pendingBets = filteredBets.filter(b => b.status === 'pending').length;
        const totalPlayed = wonBets + lostBets;
        const winRate = totalPlayed > 0 ? (wonBets / totalPlayed) * 100 : 0;
        const avgOdds = filteredBets.length > 0 ? filteredBets.reduce((sum, b) => sum + b.odds, 0) / filteredBets.length : 0;

        return {
            totalStake,
            profit,
            roi: isNaN(roi) ? 0 : roi,
            totalBets: filteredBets.length,
            pendingBets,
            winRate: isNaN(winRate) ? 0 : winRate,
            avgOdds: isNaN(avgOdds) ? 0 : avgOdds,
        };
    }, [filteredBets]);

    const recentBets = filteredBets.slice(0, 5);
    const randomAd = useMemo(() => ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null, [ads]);
    const randomSponsor = useMemo(() => sponsors.length > 0 ? sponsors[Math.floor(Math.random() * sponsors.length)] : null, [sponsors]);

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold gradient-text">Ana Panel</h1>
                <div className="flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg">
                    {(['all', 'week', 'month'] as const).map((period) => (
                        <button
                            key={period}
                            onClick={() => handlePeriodChange(period)}
                            className={`period-btn ${dashboardPeriod === period ? 'active' : ''}`}
                        >
                            {period === 'all' ? 'Tümü' : period === 'week' ? 'Hafta' : 'Ay'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="stats-grid">
                <StatCard title="Toplam Yatırım" value={formatCurrency(stats.totalStake)} />
                <StatCard title="Kâr/Zarar" value={formatCurrency(stats.profit, true)} isProfit={stats.profit !== 0} profitAmount={stats.profit} />
                <StatCard title="Yatırım Geri Dönüşü (ROI)" value={`${stats.roi.toFixed(1)}%`} />
                <StatCard title="Toplam Bahis" value={stats.totalBets.toString()} />
                <StatCard title="Bekleyen Bahis" value={stats.pendingBets.toString()} />
                <StatCard title="Kazanma Oranı" value={`${stats.winRate.toFixed(1)}%`} />
                <StatCard title="Ortalama Oran" value={stats.avgOdds.toFixed(2)} />
            </div>

            <div className="dashboard-grid">
                <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Son Bahisler</h2>
                    <div className="space-y-4">
                        {recentBets.length > 0 ? (
                            recentBets.map(bet => <BetItem key={bet.id} bet={bet} />)
                        ) : (
                            <p className="text-gray-400 text-center py-4">Bu periyotta gösterilecek bahis bulunmuyor.</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {randomAd && (
                         <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-2 text-primary-blue">{randomAd.title}</h3>
                            <p className="text-gray-300 mb-4 text-sm">{randomAd.description}</p>
                            <a href={randomAd.link} target="_blank" rel="noopener noreferrer" className="link-button link-button-primary text-sm">
                                İncele
                            </a>
                        </div>
                    )}
                    {randomSponsor && (
                        <div className="glass-card sponsor-card rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-semibold mb-4 text-gray-400">Sponsorumuz</h3>
                             <a href={randomSponsor.link} target="_blank" rel="noopener noreferrer">
                                <img src={randomSponsor.image_url} alt={randomSponsor.name} className="mx-auto h-16 object-contain"/>
                             </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
