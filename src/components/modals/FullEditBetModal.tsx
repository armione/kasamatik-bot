// src/components/modals/FullEditBetModal.tsx
import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaXmark, FaPlus } from 'react-icons/fa6';
import { Bet } from '../../types';
import { DEFAULT_PLATFORMS } from '../../lib/constants';

type BetEditFormData = Omit<Bet, 'id' | 'created_at' | 'user_id' | 'status' | 'win_amount' | 'profit_loss' | 'special_odd_id' | 'special_odds'>;

const FullEditBetModal = () => {
    const { isFullEditBetModalOpen, fullEditingBet, closeFullEditBetModal, openPlatformManagerModal } = useUiStore();
    const { platforms: customPlatforms, updateBet: updateBetInStore } = useDataStore();
    const { user } = useAuthStore();

    const [formData, setFormData] = useState<BetEditFormData>({
        platform: '',
        bet_type: 'Spor Bahis',
        description: '',
        bet_amount: 0,
        odds: 1.0,
        date: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);

    // Load bet data into form when modal opens
    useEffect(() => {
        if (fullEditingBet) {
            setFormData({
                platform: fullEditingBet.platform,
                bet_type: fullEditingBet.bet_type,
                description: fullEditingBet.description,
                bet_amount: fullEditingBet.bet_amount,
                odds: fullEditingBet.odds,
                date: fullEditingBet.date,
            });
        }
    }, [fullEditingBet]);

    const allPlatforms = useMemo(() => {
        return [...DEFAULT_PLATFORMS, ...customPlatforms.map(p => p.name)].sort();
    }, [customPlatforms]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'bet_amount' || name === 'odds' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !fullEditingBet) return;
        if (formData.bet_amount <= 0 || formData.odds <= 1) {
            toast.error('Miktar veya Oran geçersiz.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Bahis güncelleniyor...');

        // Sadece form verilerini güncelle, 'profit_loss' gibi hesaplanmış verileri koru
        const { data, error } = await supabase
            .from('bets')
            .update({
                platform: formData.platform,
                bet_type: formData.bet_type,
                description: formData.description,
                bet_amount: formData.bet_amount,
                odds: formData.odds,
                date: formData.date,
            })
            .eq('id', fullEditingBet.id)
            .select('*, special_odds(*)')
            .single();

        if (error) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } else if (data) {
            updateBetInStore(data);
            toast.success('Bahis başarıyla güncellendi!', { id: toastId });
            closeFullEditBetModal();
        }
        setLoading(false);
    };

    if (!isFullEditBetModalOpen || !fullEditingBet) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeFullEditBetModal}>
            <div className="glass-card rounded-2xl w-full max-w-2xl p-6 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Bahsi Düzenle</h2>
                    <button onClick={closeFullEditBetModal} className="p-2 text-gray-400 hover:text-white">
                        <FaXmark />
                    </button>
                </div>

                {/* Form (BetForm.tsx'ten uyarlandı) */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Platform</label>
                            <div className="flex items-center gap-2">
                                <select name="platform" value={formData.platform} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white">
                                    <option value="">Platform Seçin</option>
                                    {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button type="button" onClick={openPlatformManagerModal} className="mt-1 flex-shrink-0 gradient-button p-2.5 rounded-lg" title="Platformları Yönet">
                                    <FaPlus />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Bahis Türü</label>
                            <select name="bet_type" value={formData.bet_type} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white">
                                <option>Spor Bahis</option>
                                <option>Canlı Bahis</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Açıklama</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Miktar (₺)</label>
                            <input type="number" name="bet_amount" value={formData.bet_amount} onChange={handleChange} step="0.01" className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Oran</label>
                            <input type="number" name="odds" value={formData.odds} onChange={handleChange} step="0.01" className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Tarih</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={closeFullEditBetModal} className="w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-semibold bg-gray-600 hover:bg-gray-500 transition-colors">İptal</button>
                        <button type="submit" disabled={loading} className="w-full sm:w-auto gradient-button px-8 py-2.5 rounded-lg text-sm font-semibold text-white">
                            {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FullEditBetModal;