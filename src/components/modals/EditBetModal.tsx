// src/components/modals/EditBetModal.tsx
import { useState, useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaXmark } from 'react-icons/fa6';
import { Bet } from '../../types';

const EditBetModal = () => {
    const { editingBet, prefilledBetData, closeEditBetModal } = useUiStore();
    const { updateBet: updateBetInStore } = useDataStore();

    const [status, setStatus] = useState<'pending' | 'won' | 'lost' | 'refunded'>('pending');
    const [winAmount, setWinAmount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingBet) {
            // Use prefilled data if available, otherwise use the bet's current data
            setStatus(prefilledBetData?.status || editingBet.status);
            setWinAmount(prefilledBetData?.win_amount || editingBet.win_amount);
        }
    }, [editingBet, prefilledBetData]);

    if (!editingBet) return null;

    const handleSave = async () => {
        setLoading(true);
        let profit_loss = 0;
        let finalWinAmount = 0;

        if (status === 'won') {
            finalWinAmount = winAmount;
            profit_loss = winAmount - editingBet.bet_amount;
        } else if (status === 'lost') {
            profit_loss = -editingBet.bet_amount;
        }

        const updateData = {
            status,
            win_amount: finalWinAmount,
            profit_loss,
        };

        const { data, error } = await supabase
            .from('bets')
            .update(updateData)
            .eq('id', editingBet.id)
            .select('*, special_odds(*)')
            .single();

        if (error) {
            toast.error(error.message);
        } else if (data) {
            updateBetInStore(data as Bet);
            toast.success('Bahis güncellendi.');
            closeEditBetModal();
        }
        setLoading(false);
    };

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeEditBetModal}>
            <div className="glass-card rounded-2xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Bahsi Düzenle/Sonuçlandır</h2>
                    <button onClick={closeEditBetModal} className="p-2 text-gray-400 hover:text-white">
                        <FaXmark />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-300 bg-gray-800/50 p-3 rounded-lg">{editingBet.description}</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Durum</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white"
                        >
                            <option value="pending">Bekleyen</option>
                            <option value="won">Kazandı</option>
                            <option value="lost">Kaybetti</option>
                            <option value="refunded">İade</option>
                        </select>
                    </div>

                    {status === 'won' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Kazanç Miktarı (₺)</label>
                            <input
                                type="number"
                                value={winAmount}
                                onChange={(e) => setWinAmount(parseFloat(e.target.value))}
                                className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white"
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-3">
                        <button onClick={closeEditBetModal} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500">İptal</button>
                        <button onClick={handleSave} disabled={loading} className="gradient-button px-6 py-2 rounded-lg font-semibold disabled:opacity-50">
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditBetModal;
