import React from 'react';
import { BetData } from '../types/betting';

interface StatsCardsProps {
  bets: BetData[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ bets }) => {
  const totalBets = bets.length;
  const totalWins = bets.filter(bet => bet.result === 'win').length;
  const totalLosses = bets.filter(bet => bet.result === 'loss').length;
  const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
  
  const totalEarnings = bets
    .filter(bet => bet.result === 'win')
    .reduce((sum, bet) => sum + ((bet.payout || 0) - bet.amount), 0);
  
  const totalLossAmount = bets
    .filter(bet => bet.result === 'loss')
    .reduce((sum, bet) => sum + bet.amount, 0);
  
  const netProfit = totalEarnings - totalLossAmount;

  const stats = [
    {
      title: 'Toplam Bahis',
      value: totalBets.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Kazanılan Bahis',
      value: totalWins.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Kaybedilen Bahis',
      value: totalLosses.toString(),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Başarı Oranı',
      value: `%${winRate.toFixed(1)}`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Toplam Kazanç',
      value: `₺${totalEarnings.toFixed(2)}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Toplam Zarar',
      value: `₺${totalLossAmount.toFixed(2)}`,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Net Kar/Zarar',
      value: `₺${netProfit.toFixed(2)}`,
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} p-4 rounded-lg border`}>
          <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};