// src/hooks/useData.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import toast from 'react-hot-toast';

export const useData = () => {
  const { user } = useAuthStore();
  const { setInitialData, setLoading } = useDataStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const [
          betsRes,
          platformsRes,
          sponsorsRes,
          adsRes,
          specialOddsRes
        ] = await Promise.all([
          supabase.from('bets').select('*, special_odds(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('platforms').select('*').eq('user_id', user.id).order('name', { ascending: true }),
          supabase.from('sponsors').select('*').order('created_at', { ascending: true }),
          supabase.from('ads').select('*'),
          supabase.from('special_odds').select('*').eq('is_active', true).order('created_at', { ascending: false })
        ]);

        if (betsRes.error) throw betsRes.error;
        if (platformsRes.error) throw platformsRes.error;
        if (sponsorsRes.error) throw sponsorsRes.error;
        if (adsRes.error) throw adsRes.error;
        if (specialOddsRes.error) throw specialOddsRes.error;
        
        setInitialData({
          bets: betsRes.data || [],
          platforms: platformsRes.data || [],
          sponsors: sponsorsRes.data || [],
          ads: adsRes.data || [],
          specialOdds: specialOddsRes.data || [],
        });
      } catch (error: any) {
        toast.error(`Veriler yüklenirken bir hata oluştu: ${error.message}`);
        console.error('Data fetching error:', error);
      }
      // setLoading(false) is called inside setInitialData
    };

    if (user) {
      fetchData();
    }
  }, [user, setInitialData, setLoading]);
};
