// src/components/cash_history/TransactionCard.tsx
import React from 'react';
import { Bet } from '../../types';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useDataStore } from '../../stores/dataStore';
import { FaTrash, FaArrowDown, FaArrowUp } from 'react-icons/fa6';

interface TransactionCardProps {
    transaction: Bet;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const { deleteBet } = useDataStore();
    const isDeposit = transaction.profit_loss > 0;
    
    const handleDelete = async () => {
        if (!window.confirm('Bu kasa işlemini silmek istediğinizden emin misiniz?')) return;
        
        const toastId = toast.loading('İşlem siliniyor...');
        const { error } = await supabase.from('bets').delete().eq('id', transaction.id);

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            deleteBet(transaction.id);
            toast.success('İşlem silindi.', { id: toastId });
        }
    };

    return (
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${isDeposit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isDeposit ? <FaArrowDown /> : <FaArrowUp />}
                </div>
                <div>
                    <h3 className="font-bold text-white">{transaction.description}</h3>
                    <p className="text-sm text-gray-400">{new Date(transaction.date).toLocaleDateString('tr-TR')}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <p className={`text-lg font-bold ${isDeposit ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.profit_loss > 0 ? '+' : ''}{transaction.profit_loss.toFixed(2)} ₺
                </p>
                <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-red-500 transition-colors" aria-label="İşlemi sil">
                    <FaTrash />
                </button>
            </div>
        </div>
    );
};

export default TransactionCard;