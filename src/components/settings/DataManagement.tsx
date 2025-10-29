
// src/components/settings/DataManagement.tsx
import { useDataStore } from '../../stores/dataStore';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/authStore';
import React from 'react';

const DataManagement = () => {
  const { bets, platforms, setInitialData } = useDataStore();
  const user = useAuthStore((state) => state.user);

  const handleExport = () => {
    try {
      const dataToExport = {
        bets: bets,
        platforms: platforms,
      };
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kasamatik_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Veriler başarıyla dışa aktarıldı!');
    } catch (error) {
      toast.error('Veriler dışa aktarılırken bir hata oluştu.');
      console.error(error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        const data = JSON.parse(text as string);
        if (!data.bets || !data.platforms) {
          throw new Error('Geçersiz dosya formatı.');
        }

        if (!user) throw new Error("Kullanıcı bulunamadı.");

        if (!window.confirm('Bu işlem mevcut tüm verilerinizi silecek ve yedekten gelenlerle değiştirecektir. Emin misiniz?')) {
            return;
        }

        const toastId = toast.loading('Veriler içe aktarılıyor...');

        await supabase.from('bets').delete().eq('user_id', user.id);
        await supabase.from('platforms').delete().eq('user_id', user.id);

        const platformsToInsert = data.platforms.map((p: any) => ({ name: p.name, user_id: user.id }));
        const { data: newPlatforms, error: platformError } = await supabase.from('platforms').insert(platformsToInsert).select();
        if (platformError) throw platformError;

        const betsToInsert = data.bets.map((b: any) => ({ ...b, id: undefined, created_at: undefined, user_id: user.id, special_odds: undefined }));
        const { data: newBets, error: betError } = await supabase.from('bets').insert(betsToInsert).select('*, special_odds(*)');
        if (betError) throw betError;

        setInitialData({
          bets: newBets || [],
          platforms: newPlatforms || [],
          sponsors: useDataStore.getState().sponsors,
          ads: useDataStore.getState().ads,
          specialOdds: useDataStore.getState().specialOdds
        });

        toast.success('Veriler başarıyla içe aktarıldı!', { id: toastId });

      } catch (error: any) {
        toast.error(`İçe aktarma hatası: ${error.message}`);
        console.error(error);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Veri Yönetimi</h3>
      <div className="space-y-3">
        <p className="text-gray-300 text-sm">Verilerinizi yedekleyin veya bir yedekten geri yükleyin.</p>
        <div className="flex gap-4">
          <button onClick={handleExport} className="flex-1 bg-blue-600/50 hover:bg-blue-600/80 text-white font-semibold py-2 px-4 rounded-lg">
            Dışa Aktar
          </button>
          <label className="flex-1 bg-green-600/50 hover:bg-green-600/80 text-white font-semibold py-2 px-4 rounded-lg cursor-pointer text-center">
            İçe Aktar
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
