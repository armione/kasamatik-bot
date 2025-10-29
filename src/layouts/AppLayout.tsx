import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useUiStore } from '../stores/uiStore';

const AppLayout = () => {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <main className="h-full overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
