// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { useData } from './hooks/useData';

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

/**
 * Bu bileşen, kullanıcı giriş yaptıktan sonra tüm verileri çeker
 * ve ana uygulama düzenini (Sidebar + içerik alanı) gösterir.
 */
const MainAppLayout = () => {
  // Veri çekme hook'unu burada çağırıyoruz.
  // Bu bileşen sadece kullanıcı giriş yaptıktan sonra render edilir.
  useData();
  
  // AppLayout, Outlet'i içinde barındırır, bu sayede
  // /history, /settings gibi sayfalar bu layout içinde görünür.
  return <AppLayout />;
};

function App() {
  const { setSession, setUser, setLoading } = useAuthStore();
  const isPlatformManagerModalOpen = useUiStore((state) => state.isPlatformManagerModalOpen);
  const isEditBetModalOpen = useUiStore((state) => state.isEditBetModalOpen);
  const isCashTransactionModalOpen = useUiStore((state) => state.isCashTransactionModalOpen);

  // Kimlik doğrulama durumunu dinleyen merkezi useEffect
  useEffect(() => {
    // anlık değişiklikleri dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Sayfa ilk yüklendiğinde mevcut oturumu kontrol et
    supabase.auth.getSession().finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setLoading]);

  return (
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

      {/* Ana Yönlendirme (Routing) */}
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Korumalı Alan */}
        <Route element={<ProtectedRoute />}>
          {/* MainAppLayout, tüm korumalı sayfaları sarar */}
          <Route element={<MainAppLayout />}>
            <Route index path="/" element={<DashboardPage />} />
            <Route path="/new-bet" element={<NewBetPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/cash-history" element={<CashHistoryPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/sponsors" element={<SponsorsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
