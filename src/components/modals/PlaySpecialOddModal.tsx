// src/components/modals/PlaySpecialOddModal.tsx
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { useUiStore } from '../../stores/uiStore';
import { calculateProfitLoss } from '../../lib/utils';
// FIX: Correct the icon import from 'react-icons/fa6'. 'FaInfoCircle' does not exist; 'FaCircleInfo' is the correct name.
import { FaXmark, FaCircleInfo } from 'react-icons/fa6';
import { Bet, SpecialOdd } from '../../types';

const PlaySpecialOddModal = () => {
    const [betAmount, setBetAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuthStore();
    const { bets, addBet, updateSpecialOdd } = useDataStore();
    const { isPlaySpecialOddModalOpen, playingSpecialOdd, closePlaySpecialOddModal } = useUiStore();

    const totalBankroll = useMemo(() => {
        return bets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);
    }, [bets]);

    const riskAnalysis = useMemo(() => {
        if (betAmount === '' || betAmount <= 0 || totalBankroll <= 0) return { percentage: 0, potentialWin: 0 };
        const percentage = (betAmount / totalBankroll) * 100;
        const potentialWin = (betAmount * (playingSpecialOdd?.odds || 1)) - betAmount;
        return {
            percentage: isNaN(percentage) ? 0 : percentage,
            potentialWin
        };
    }, [betAmount, totalBankroll, playingSpecialOdd]);

    if (!isPlaySpecialOddModalOpen || !playingSpecialOdd) return null;

    const handleConfirmBet = async () => {
        if (!user) return;
        // FIX: Update the condition to explicitly check for an empty string.
        // This ensures `betAmount` is correctly type-narrowed to a `number` for subsequent comparisons,
        // resolving the "Operator '>' cannot be applied to types 'string | number' and 'number'" error.
        if (betAmount === '' || betAmount <= 0) {
            toast.error('Lütfen geçerli bir bahis miktarı girin.');
            return;
        }
        if (playingSpecialOdd.max_bet_amount && betAmount > playingSpecialOdd.max_bet_amount) {
            toast.error(`Maksimum bahis miktarı ${playingSpecialOdd.max_bet_amount}₺'dir.`);
            return;
        }
        if (betAmount > totalBankroll) {
            toast.error('Bahis miktarı toplam kasanızdan fazla olamaz.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Bahis oluşturuluyor...');

        try {
            // 1. Insert new bet
            const newBetData: Omit<Bet, 'id' | 'created_at' | 'special_odds'> = {
                user_id: user.id,
                platform: playingSpecialOdd.platform,
                bet_type: 'Özel Oran',
                description: playingSpecialOdd.description,
                bet_amount: betAmount,
                odds: playingSpecialOdd.odds,
                date: new Date().toISOString().split('T')[0],
                status: 'pending',
                win_amount: 0,
                profit_loss: 0,
                special_odd_id: playingSpecialOdd.id,
            };

            const { data: newBet, error: betError } = await supabase.from('bets').insert(newBetData).select('*, special_odds(*)').single();
            if (betError) throw betError;

            // 2. Increment play_count
            const newPlayCount = playingSpecialOdd.play_count + 1;
            const { data: updatedOdd, error: oddError } = await supabase
                .from('special_odds')
                .update({ play_count: newPlayCount })
                .eq('id', playingSpecialOdd.id)
                .select()
                .single();
            if (oddError) throw oddError;
            
            // 3. Update state
            addBet(newBet);
            updateSpecialOdd(updatedOdd);

            toast.success('Fırsat başarıyla oynandı!', { id: toastId });
            closePlaySpecialOddModal();

        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closePlaySpecialOddModal}>
            <div className="glass-card rounded-2xl w-full max-w-lg p-6 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Fırsatı Oyna</h2>
                    <button onClick={closePlaySpecialOddModal} className="p-2 text-gray-400 hover:text-white">
                        <FaXmark />
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="font-semibold text-primary-blue">{playingSpecialOdd.platform} @ {playingSpecialOdd.odds.toFixed(2)}</p>
                        <p className="text-gray-300 text-sm">{playingSpecialOdd.description}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Bahis Miktarı (₺)</label>
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder={playingSpecialOdd.max_bet_amount ? `Max: ${playingSpecialOdd.max_bet_amount}₺` : '0.00'}
                            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400"
                        />
                    </div>
                    {betAmount !== '' && betAmount > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-blue-900/30 text-blue-200 rounded-lg text-sm">
                            <FaCircleInfo className="mt-1 text-lg flex-shrink-0" />
                            <div>
                                Bu bahis kasanızın <b className="font-bold text-white">%{riskAnalysis.percentage.toFixed(2)}</b> kadarını oluşturuyor.
                                Potansiyel net kazancınız <b className="font-bold text-green-300">{riskAnalysis.potentialWin.toFixed(2)}₺</b>.
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end pt-4 gap-3">
                        <button onClick={closePlaySpecialOddModal} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500">İptal</button>
                        <button onClick={handleConfirmBet} disabled={loading} className="gradient-button px-6 py-2 rounded-lg font-semibold disabled:opacity-50">
                            {loading ? 'Onaylanıyor...' : 'Bahsi Onayla'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaySpecialOddModal;
