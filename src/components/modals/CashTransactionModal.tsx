// src/components/modals/CashTransactionModal.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { useUiStore } from '../../stores/uiStore';
import { FaXmark, FaPlus, FaMinus } from 'react-icons/fa6';

const CashTransactionModal = () => {
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuthStore();
    const { addBet } = useDataStore();
    const { closeCashTransactionModal } = useUiStore();

    const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
        if (!amount || amount <= 0) {
            toast.error('Lütfen geçerli bir miktar girin.');
            return;
        }
        if (!user) return;
        
        setLoading(true);
        const toastId = toast.loading('İşlem kaydediliyor...');
        
        const isDeposit = type === 'deposit';
        const profitLoss = isDeposit ? amount : -amount;

        const transactionData = {
            user_id: user.id,
            platform: 'Kasa İşlemi',
            bet_type: 'Kasa İşlemi' as const,
            description: isDeposit ? 'Para Yatırma' : 'Para Çekme',
            bet_amount: Math.abs(amount),
            odds: 1,
            date: new Date().toISOString().split('T')[0],
            status: isDeposit ? 'won' as const : 'lost' as const,
            win_amount: isDeposit ? amount : 0,
            profit_loss: profitLoss,
        };

        const { data, error } = await supabase.from('bets').insert(transactionData).select('*, special_odds(*)').single();

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            addBet(data);
            toast.success('Kasa işlemi kaydedildi.', { id: toastId });
            closeCashTransactionModal();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeCashTransactionModal}>
            <div className="glass-card rounded-2xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Kasa İşlemi</h2>
                    <button onClick={closeCashTransactionModal} className="p-2 text-gray-400 hover:text-white">
                        <FaXmark />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Miktar (₺)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder="0.00"
                            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400"
                        />
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => handleTransaction('deposit')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600/50 text-white rounded-lg hover:bg-green-600/80 transition-colors disabled:opacity-50">
                            <FaPlus /> Yatır
                        </button>
                        <button onClick={() => handleTransaction('withdrawal')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-800/80 transition-colors disabled:opacity-50">
                            <FaMinus /> Çek
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashTransactionModal;
