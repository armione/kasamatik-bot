import React, { useEffect, useState } from 'react';
import { useAppContext } from './context/StateContext';
import { onAuthStateChange, getSupabase } from './api/supabase';
import Auth from './components/Auth';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import Loader from './components/common/Loader';
import { loadInitialData } from './api/database';
import { showNotification } from './utils/helpers';
import { usePWAInstaller } from './hooks/usePWAInstaller';
import AdPopupModal from './components/modals/AdPopupModal';
import { SpecialOdd, Bet, Platform, Sponsor, Ad } from './types';

function App() {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const { checkAndShowSmartInstallPrompt } = usePWAInstaller();

  useEffect(() => {
    const { data: authListener } = onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      dispatch({ type: 'SET_CURRENT_USER', payload: user });

      if (!user) {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      if (state.currentUser && !state.dataLoaded) {
        try {
          setLoading(true);
          const initialData = await loadInitialData(state.currentUser.id);
          dispatch({ type: 'SET_INITIAL_DATA', payload: initialData });
          
          setTimeout(() => {
            showNotification(`🚀 Hoş geldin ${state.currentUser?.email}!`, 'success');
          }, 1000);

          checkAndShowSmartInstallPrompt();

        } catch (error) {
          console.error("Uygulama başlatılırken hata:", error);
          showNotification("Veriler yüklenirken bir hata oluştu.", "error");
        } finally {
          setLoading(false);
        }
      }
    };

    initializeApp();
  }, [state.currentUser, state.dataLoaded, dispatch, checkAndShowSmartInstallPrompt]);
  
   useEffect(() => {
        const handleRealtimeUpdate = (payload: any) => {
            console.log('Realtime update received:', payload);
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (payload.table === 'special_odds') {
                 if (eventType === 'INSERT') {
                    dispatch({ type: 'ADD_SPECIAL_ODD', payload: newRecord as SpecialOdd });
                    showNotification(`Yeni Fırsat: ${newRecord.platform}'da yeni özel oran!`, 'info');
                } else if (eventType === 'UPDATE') {
                    dispatch({ type: 'UPDATE_SPECIAL_ODD', payload: newRecord as SpecialOdd });
                    if (oldRecord.status === 'pending' && newRecord.status === 'won') {
                        showNotification(`🏆 Sonuçlandı: ${newRecord.platform} fırsatı kazandı!`, 'success');
                    }
                }
            }
        };

        const supabase = getSupabase();
        const channel = supabase
            .channel('public-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, handleRealtimeUpdate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dispatch]);


  if (loading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="text-white">
      {!state.currentUser ? (
        <Auth />
      ) : (
        <div id="app-container">
          <Sidebar />
          <MainContent />
          <AdPopupModal />
        </div>
      )}
    </div>
  );
}

export default App;
