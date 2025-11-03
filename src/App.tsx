// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';

import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import NewBetPage from './pages/NewBetPage';
import HistoryPage from './pages/HistoryPage';
import CashHistoryPage from './pages/CashHistoryPage';
import StatisticsPage from './pages/StatisticsPage';
import GuidePage from './pages/GuidePage';
import SponsorsPage from './pages/SponsorsPage';
import SettingsPage from './pages/SettingsPage';
import PlatformManagerModal from './components/modals/PlatformManagerModal';
import EditBetModal from './components/modals/EditBetModal';
import CashTransactionModal from './components/modals/CashTransactionModal';
import SpecialOddsPage from './pages/SpecialOddsPage';
import PlaySpecialOddModal from './components/modals/PlaySpecialOddModal';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';
import FullEditBetModal from './components/modals/FullEditBetModal';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { setSession, setUser, setLoading, setProfileRole } = useAuthStore();
  const isPlatformManagerModalOpen = useUiStore((state) => state.isPlatformManagerModalOpen);
  const isEditBetModalOpen = useUiStore((state) => state.isEditBetModalOpen);
  const isCashTransactionModalOpen = useUiStore((state) => state.isCashTransactionModalOpen);
  const isPlaySpecialOddModalOpen = useUiStore((state) => state.isPlaySpecialOddModalOpen);
  const isFullEditBetModalOpen = useUiStore((state) => state.isFullEditBetModalOpen);

  // Kimlik doğrulama durumunu dinleyen merkezi useEffect
  useEffect(() => {
    // anlık değişiklikleri dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // YENİ ROL ÇEKME MANTIĞI
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Profil rolü çekilirken hata:', error);
            throw error;
          }

          if (profile) {
            setProfileRole(profile.role);
          } else {
            // Profil henüz oluşturulmamış olabilir (trigger gecikmesi?), 'user' varsayalım
            setProfileRole('user');
          }
        } catch (error) {
          console.error(error);
          setProfileRole(null); // Hata durumunda rolü null yap
        }
      } else {
        // Oturum kapandıysa rolü temizle
        setProfileRole(null);
      }

      setLoading(false);
    });

    // Sayfa ilk yüklendiğinde mevcut oturumu kontrol et
    supabase.auth.getSession().finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setLoading, setProfileRole]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Bildirim ve Global Modallar */}
        <Toaster position="top-center" toastOptions={{
            className: 'glass-card',
            style: {
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            },
        }} />
        {isPlatformManagerModalOpen && <PlatformManagerModal />}
        {isEditBetModalOpen && <EditBetModal />}
        {isCashTransactionModalOpen && <CashTransactionModal />}
        {isPlaySpecialOddModalOpen && <PlaySpecialOddModal />}
        {isFullEditBetModalOpen && <FullEditBetModal />}

        {/* Ana Yönlendirme (Routing) */}
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Korumalı Alan */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<DashboardPage />} />
              <Route path="/new-bet" element={<NewBetPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/cash-history" element={<CashHistoryPage />} />
              <Route path="/special-odds" element={<SpecialOddsPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/sponsors" element={<SponsorsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Admin Route */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
