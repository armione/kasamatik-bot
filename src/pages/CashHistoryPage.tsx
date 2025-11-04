// src/pages/CashHistoryPage.tsx
import React, { useMemo, useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useUiStore } from '../stores/uiStore';
import { FaPlus } from 'react-icons/fa6';
import Pagination from '../components/shared/Pagination';
import { ITEMS_PER_PAGE } from '../lib/constants';
import TransactionCard from '../components/cash_history/TransactionCard';
import { Bet } from '../types';

interface CashHistoryStatsProps {
    transactions: Bet[];
}

const CashHistoryStats: React.FC<CashHistoryStatsProps> = ({ transactions }) => {
    const stats = useMemo(() => {
        const totalDeposit = transactions.reduce((sum, tx) => sum + (tx.profit_loss > 0 ? tx.profit_loss : 0), 0);
        const totalWithdrawal = Math.abs(transactions.reduce((sum, tx) => sum + (tx.profit_loss < 0 ? tx.profit_loss : 0), 0));
        return {
            totalDeposit,
            totalWithdrawal,
            net: totalDeposit - totalWithdrawal,
            count: transactions.length
        }
    }, [transactions]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl"><p className="text-sm text-gray-400">Toplam Yatırım</p><p className="text-xl font-bold text-green-400">+{stats.totalDeposit.toFixed(2)} ₺</p></div>
            <div className="glass-card p-4 rounded-xl"><p className="text-sm text-gray-400">Toplam Çekim</p><p className="text-xl font-bold text-red-400">-{stats.totalWithdrawal.toFixed(2)} ₺</p></div>
            <div className="glass-card p-4 rounded-xl"><p className="text-sm text-gray-400">Net Bakiye</p><p className={`text-xl font-bold ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stats.net.toFixed(2)} ₺</p></div>
            <div className="glass-card p-4 rounded-xl"><p className="text-sm text-gray-400">İşlem Sayısı</p><p className="text-xl font-bold text-white">{stats.count}</p></div>
        </div>
    )
}

const CashHistoryPage = () => {
    const bets = useDataStore((state) => state.bets);
    const { openCashTransactionModal } = useUiStore();
    const [currentPage, setCurrentPage] = useState(1);

    const cashTransactions = useMemo(() => {
        return bets.filter(bet => bet.bet_type === 'Kasa İşlemi').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [bets]);

    const totalPages = Math.ceil(cashTransactions.length / ITEMS_PER_PAGE);
    const paginatedTxs = cashTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Kasa Geçmişi</h1>
                    <p className="mt-1 text-gray-400">Tüm para yatırma ve çekme işlemleriniz.</p>
                </div>
                <button onClick={openCashTransactionModal} className="w-full sm:w-auto gradient-button flex items-center justify-center gap-2 px-4 py-2 rounded-lg mt-4 sm:mt-0">
                    <FaPlus /> Yeni İşlem
                </button>
            </div>

            <CashHistoryStats transactions={cashTransactions} />

            {paginatedTxs.length > 0 ? (
                <div className="space-y-4">
                    {paginatedTxs.map(tx => (
                        <TransactionCard key={tx.id} transaction={tx} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
                    <div className="text-6xl mb-4">💸</div>
                    <p className="text-xl">Henüz kasa işlemi bulunmuyor.</p>
                </div>
            )}
            
            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
        </div>
    );
};

export default CashHistoryPage;
