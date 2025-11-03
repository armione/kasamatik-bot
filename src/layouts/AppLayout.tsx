import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useUiStore } from '../stores/uiStore';
import { useDataStore } from '../stores/dataStore';
import { useData } from '../hooks/useData';

const AppLayout = () => {
  const { isSidebarCollapsed, isMobileMenuOpen, closeMobileMenu } = useUiStore();
  const { refetch } = useData();
  const dataError = useDataStore((state) => state.error);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
      <Sidebar />
      <div className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 h-full">
              {dataError ? (
                <div className="flex h-full items-center justify-center p-4">
                    <div className="text-center glass-card p-8 rounded-2xl max-w-lg w-full">
                        <h1 className="text-2xl font-bold text-red-400 mb-4">Veri Yükleme Hatası</h1>
                        <p className="text-gray-300 mb-6">
                            Uygulama verileri yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
                        </p>
                        <p className="text-xs text-gray-500 mb-6 break-all">Detay: {dataError}</p>
                        <button
                            onClick={refetch}
                            className="gradient-button px-6 py-2 rounded-lg font-semibold"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                </div>
              ) : (
                <Outlet />
              )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
