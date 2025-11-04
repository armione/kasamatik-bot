// src/components/new_bet/BetForm.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { useUiStore } from '../../stores/uiStore';
import { DEFAULT_PLATFORMS } from '../../lib/constants';
import toast from 'react-hot-toast';
import { BetFormData } from '../../pages/NewBetPage';
import { FaPlus } from 'react-icons/fa6';

interface BetFormProps {
  formData: BetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BetFormData>>;
}

const BetForm: React.FC<BetFormProps> = ({ formData, setFormData }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { platforms: customPlatforms, addBet: addBetToStore } = useDataStore();
  const { openPlatformManagerModal } = useUiStore();

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
  
  const resetForm = () => {
      setFormData({
        platform: '',
        bet_type: 'Spor Bahis',
        description: '',
        bet_amount: 0,
        odds: 1.0,
        date: new Date().toISOString().split('T')[0],
      });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.platform) {
        toast.error('Lütfen bir platform seçin.');
        return;
    }
    if (formData.bet_amount <= 0) {
        toast.error('Bahis miktarı 0\'dan büyük olmalıdır.');
        return;
    }
    if (formData.odds <= 1) {
        toast.error('Oran 1.00\'den büyük olmalıdır.');
        return;
    }

    setLoading(true);
    const toastId = toast.loading('Bahis ekleniyor...');

    const newBetData = {
      ...formData,
      user_id: user.id,
      status: 'pending',
      win_amount: 0,
      profit_loss: 0
    };

    const { data, error } = await supabase.from('bets').insert(newBetData).select('*, special_odds(*)').single();

    if (error) {
      toast.error(`Hata: ${error.message}`, { id: toastId });
    } else if (data) {
      addBetToStore(data);
      toast.success('Bahis başarıyla eklendi!', { id: toastId });
      resetForm();
    }
    setLoading(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Bahis Bilgileri</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Platform</label>
            <div className="flex items-center gap-2">
              <select name="platform" value={formData.platform} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
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
            <select name="bet_type" value={formData.bet_type} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm">
              <option>Spor Bahis</option>
              <option>Canlı Bahis</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Açıklama</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" placeholder="Örn: Galatasaray - Fenerbahçe (İY 1)"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Miktar (₺)</label>
            <input type="number" name="bet_amount" value={formData.bet_amount} onChange={handleChange} step="0.01" className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Oran</label>
            <input type="number" name="odds" value={formData.odds} onChange={handleChange} step="0.01" className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Tarih</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-2">
            <button type="button" onClick={resetForm} className="w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-semibold bg-gray-600 hover:bg-gray-500 transition-colors">Temizle</button>
            <button type="submit" disabled={loading} className="w-full sm:w-auto gradient-button px-8 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-transform duration-150 ease-in-out hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? 'Ekleniyor...' : 'Bahsi Ekle'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default BetForm;
