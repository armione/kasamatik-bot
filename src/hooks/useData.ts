// src/hooks/useData.ts
import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import toast from 'react-hot-toast';
import { SpecialOdd } from '../types';

export const useData = () => {
  const { user } = useAuthStore();
  const { setInitialData, setLoading, addSpecialOdd, updateSpecialOdd, setError } = useDataStore();

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

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
      const errorMessage = `Veriler yüklenirken bir hata oluştu: ${error.message}`;
      toast.error(errorMessage);
      console.error('Data fetching error:', error);
      setError(errorMessage);
    }
  }, [user, setInitialData, setLoading, setError]);

  useEffect(() => {
    if (user) {
      fetchData();
    }

    // Realtime Subscription
    const channel = supabase
      .channel('special_odds_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'special_odds' },
        (payload) => {
          console.log('Realtime change received!', payload);

          if (payload.eventType === 'INSERT') {
            const newOdd = payload.new as SpecialOdd;
            addSpecialOdd(newOdd);
            toast(`Yeni Fırsat: ${newOdd.platform} @ ${newOdd.odds.toFixed(2)}`, { icon: '⭐' });
          }

          if (payload.eventType === 'UPDATE') {
            const updatedOdd = payload.new as SpecialOdd;
            const oldOdd = payload.old as Partial<SpecialOdd>;
            
            updateSpecialOdd(updatedOdd);

            // Only notify if the status just changed from pending
            if (oldOdd.status === 'pending' && updatedOdd.status !== 'pending') {
               let toastMessage = `Sonuçlandı: ${updatedOdd.platform} fırsatı`;
               switch (updatedOdd.status) {
                   case 'won':
                       toast.success(`${toastMessage} Kazandı!`, { icon: '🏆' });
                       break;
                   case 'lost':
                       toast.error(`${toastMessage} Kaybetti.`, { icon: '😔' });
                       break;
                   case 'refunded':
                       toast(`${toastMessage} İade Edildi.`, { icon: '↩️' });
                       break;
               }
            }
          }
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to special_odds changes!');
          }
          if (status === 'CHANNEL_ERROR') {
              console.error('Subscription error:', err);
          }
      });

    // Cleanup function to remove the channel subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };

  }, [user, fetchData, addSpecialOdd, updateSpecialOdd]);
  
  return { refetch: fetchData };
};
