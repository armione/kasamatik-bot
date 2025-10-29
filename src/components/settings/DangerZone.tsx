
// src/components/settings/DangerZone.tsx
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useState } from 'react';

const DangerZone = () => {
    const { clearUserData } = useDataStore();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const handleClearAllData = async () => {
        if (!user) return;
        if (!window.confirm('TÜM BAHİS VE PLATFORM VERİLERİNİZİ KALICI OLARAK SİLMEK istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Veriler siliniyor...');

        try {
            const { error: betsError } = await supabase.from('bets').delete().eq('user_id', user.id);
            if (betsError) throw betsError;

            const { error: platformsError } = await supabase.from('platforms').delete().eq('user_id', user.id);
            if (platformsError) throw platformsError;

            clearUserData();
            toast.success('Tüm verileriniz başarıyla silindi.', { id: toastId });

        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6 border border-red-500/50">
            <h3 className="text-xl font-bold text-red-400 mb-2">Tehlikeli Alan</h3>
            <p className="text-gray-300 text-sm mb-4">Bu işlemler geri alınamaz. Lütfen dikkatli olun.</p>
            <button
                onClick={handleClearAllData}
                disabled={loading}
                className="w-full bg-red-800/80 hover:bg-red-700/80 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50"
            >
                {loading ? 'Siliniyor...' : 'Tüm Verileri Sil'}
            </button>
        </div>
    );
};

export default DangerZone;