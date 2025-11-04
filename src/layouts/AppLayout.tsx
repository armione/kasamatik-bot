import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useUiStore } from '../stores/uiStore';

const AppLayout = () => {
  const { isSidebarCollapsed, isMobileMenuOpen, closeMobileMenu } = useUiStore();

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
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
