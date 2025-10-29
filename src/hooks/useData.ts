// src/hooks/useData.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { ADMIN_USER_ID } from '../lib/constants';

export const useData = () => {
  const { user } = useAuthStore();
  const { setInitialData, setLoading, setError } = useDataStore();

  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const isAdmin = user.id === ADMIN_USER_ID;

        const specialOddsQuery = supabase
          .from('special_odds')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          specialOddsQuery.or(`is_active.eq.true,resulted_at.gte.${yesterday}`);
        }

        const [betsResponse, platformsResponse, sponsorsResponse, adsResponse, specialOddsResponse] = await Promise.all([
          supabase.from('bets').select('*, special_odds(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('platforms').select('id, name').eq('user_id', user.id),
          supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
          supabase.from('ads').select('*').order('created_at', { ascending: false }),
          specialOddsQuery,
        ]);

        if (betsResponse.error) throw betsResponse.error;
        if (platformsResponse.error) throw platformsResponse.error;
        if (sponsorsResponse.error) throw sponsorsResponse.error;
        if (adsResponse.error) throw adsResponse.error;
        if (specialOddsResponse.error) throw specialOddsResponse.error;

        setInitialData({
          bets: betsResponse.data || [],
          platforms: platformsResponse.data || [],
          sponsors: sponsorsResponse.data || [],
          ads: adsResponse.data || [],
          specialOdds: specialOddsResponse.data || [],
        });

      } catch (err: any) {
        console.error('Veri yükleme hatası:', err);
        setError(err.message || 'Veriler yüklenirken bir hata oluştu.');
      }
    };

    loadInitialData();
  }, [user, setInitialData, setLoading, setError]);
};
