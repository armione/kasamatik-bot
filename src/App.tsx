// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Outlet } from 'react-router-dom';
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

// Hata Düzeltmesi: Bu bileşenleri ana App fonksiyonunun DIŞINA taşıdık.
// Bu, her render'da yeniden oluşturulmalarını önler ve React'in state'i kaybetmesine engel olur.
const AuthStateChanger = () => {
    const { setSession, setUser, setLoading } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                 navigate('/auth', { replace: true });
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [setSession, setUser, setLoading, navigate]);

    return null;
};

const DataProviderLayout = () => {
  useData();
  return <AppLayout />;
};


function App() {
  const isPlatformManagerModalOpen = useUiStore((state) => state.isPlatformManagerModalOpen);
  const isEditBetModalOpen = useUiStore((state) => state.isEditBetModalOpen);
  const isCashTransactionModalOpen = useUiStore((state) => state.isCashTransactionModalOpen);

  return (
    <BrowserRouter>
      <AuthStateChanger />
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

      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DataProviderLayout />}>
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
