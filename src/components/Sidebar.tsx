import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { supabase } from '../lib/supabaseClient';
import {
  FaHouse,
  FaPlus,
  FaClockRotateLeft,
  FaLandmark,
  FaChartPie,
  FaBookOpen,
  FaHandHoldingHeart,
  FaGear,
  FaRightFromBracket,
  FaAnglesLeft,
  FaAnglesRight,
  FaStar,
  FaUserShield,
} from 'react-icons/fa6';
import { ADMIN_USER_ID } from '../lib/constants';

const Sidebar = () => {
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen } = useUiStore();
  const isAdmin = user?.id === ADMIN_USER_ID;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { to: '/', icon: <FaHouse />, text: 'Ana Panel' },
    { to: '/new-bet', icon: <FaPlus />, text: 'Yeni Kayıt' },
    { to: '/history', icon: <FaClockRotateLeft />, text: 'Bahis Geçmişi' },
    { to: '/cash-history', icon: <FaLandmark />, text: 'Kasa Geçmişi' },
    { to: '/special-odds', icon: <FaStar />, text: 'Fırsatlar' },
    { to: '/statistics', icon: <FaChartPie />, text: 'İstatistikler' },
  ];

  const secondaryNavItems = [
    { to: '/guide', icon: <FaBookOpen />, text: 'Rehber' },
    { to: '/sponsors', icon: <FaHandHoldingHeart />, text: 'Sponsorlar' },
  ];

  if (isAdmin) {
    secondaryNavItems.push({ to: '/admin', icon: <FaUserShield />, text: 'Yönetim Paneli' });
  }

  secondaryNavItems.push({ to: '/settings', icon: <FaGear />, text: 'Ayarlar' });


  return (
    <aside
      className={`sidebar flex flex-col ${
        isSidebarCollapsed ? 'collapsed' : ''
      } ${isMobileMenuOpen ? 'mobile-open' : ''}`}
    >
      <div className="flex h-20 items-center border-b border-white/10 px-4 flex-shrink-0">
        <img src="/assets/logo.png" alt="Logo" className="h-10 w-auto flex-shrink-0" />
        {!isSidebarCollapsed && (
          <span className="ml-3 text-xl font-bold font-montserrat">Kasamatik</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-text">{item.text}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="my-4 mx-5 border-t border-white/10"></div>
        <ul>
            {secondaryNavItems.map((item) => (
                <li key={item.to}>
                    <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                        `sidebar-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className="sidebar-text">{item.text}</span>
                    </NavLink>
                </li>
            ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4 flex-shrink-0">
         <div className={`sidebar-item cursor-pointer`} onClick={handleLogout} title="Çıkış Yap">
            <span className="sidebar-icon"><FaRightFromBracket /></span>
            <span className="sidebar-text">Çıkış Yap</span>
         </div>
        <div className="mt-4 flex items-center justify-between">
          {!isSidebarCollapsed && user && (
            <div className="overflow-hidden flex-1 mr-2">
              <p className="truncate text-sm font-medium" title={user.email}>{user.email}</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`hidden md:block rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white ${isSidebarCollapsed ? 'mx-auto' : ''}`}
            aria-label="Toggle sidebar"
          >
            {isSidebarCollapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
