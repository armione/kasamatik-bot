import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useState, useEffect } from 'react';

const ProtectedRoute = () => {
  const { session, loading } = useAuthStore();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // FIX: Replaced `NodeJS.Timeout` with an implementation that uses inferred browser types for `setTimeout`
  // and corrected a potential runtime error where `clearTimeout` could be called with an uninitialized variable.
  useEffect(() => {
    if (loading) {
      const timerId = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 10000); // 10 seconds timeout

      return () => {
        clearTimeout(timerId);
      };
    }
  }, [loading]);


  if (loading) {
    if (showTimeoutMessage) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white p-4">
          <div className="text-center glass-card p-8 rounded-2xl max-w-lg w-full">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Bağlantı Gecikmesi</h1>
            <p className="text-gray-300 mb-6">
              Kimlik doğrulaması beklenenden uzun sürüyor. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="gradient-button px-6 py-2 rounded-lg font-semibold"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary-blue border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;