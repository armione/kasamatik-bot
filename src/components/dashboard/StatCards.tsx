// src/components/dashboard/StatCards.tsx
import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { calculateProfitLoss } from '../../lib/utils';
import { FaMoneyBillWave, FaChartLine, FaReceipt, FaSackDollar } from 'react-icons/fa6';
// Fix: Import React to provide scope for React.ReactNode type.
import React from 'react';

const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode; title: string; value: string; colorClass: string; }) => (
  <div className="glass-card flex items-center p-5 rounded-2xl">
    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${colorClass} bg-opacity-20 text-2xl`}>
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm text-gray-400">{title}</p>
      <p className={`text-xl font-bold font-montserrat ${colorClass}`}>{value}</p>
    </div>
  </div>
);

const StatCards = () => {
  const bets = useDataStore((state) => state.bets);

  const stats = useMemo(() => {
    const actualBets = bets.filter(b => b.bet_type !== 'Kasa İşlemi');
    
    const totalBankroll = bets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);
    const netProfitLoss = actualBets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);
    const totalInvestment = actualBets.reduce((sum, bet) => sum + bet.bet_amount, 0);

    return {
      totalBets: actualBets.length,
      totalBankroll,
      netProfitLoss,
      totalInvestment,
    };
  }, [bets]);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        icon={<FaMoneyBillWave />}
        title="Toplam Kasa"
        value={`${stats.totalBankroll.toFixed(2)} ₺`}
        colorClass={stats.totalBankroll >= 0 ? 'text-green-400' : 'text-red-400'}
      />
      <StatCard 
        icon={<FaChartLine />}
        title="Net Kar/Zarar"
        value={`${stats.netProfitLoss >= 0 ? '+' : ''}${stats.netProfitLoss.toFixed(2)} ₺`}
        colorClass={stats.netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}
      />
      <StatCard 
        icon={<FaReceipt />}
        title="Toplam Bahis Sayısı"
        value={stats.totalBets.toString()}
        colorClass="text-blue-400"
      />
      <StatCard 
        icon={<FaSackDollar />}
        title="Toplam Yatırım"
        value={`${stats.totalInvestment.toFixed(2)} ₺`}
        colorClass="text-yellow-400"
      />
    </div>
  );
};

export default StatCards;
