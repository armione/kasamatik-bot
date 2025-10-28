import React from 'react';
import { useAppContext } from '../../context/StateContext';
import { signOut } from '../../api/supabase';
import { ADMIN_USER_ID } from '../../utils/constants';

const Sidebar: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { activePage, isSidebarCollapsed, currentUser } = state;

    const isAdmin = currentUser?.id === ADMIN_USER_ID;

    const navItems = [
        { id: 'dashboard', icon: '🏠', label: 'Ana Panel' },
        { id: 'history', icon: '📜', label: 'Bahis Geçmişi' },
        { id: 'special-odds', icon: '✨', label: 'Özel Oranlar' },
        { id: 'statistics', icon: '📊', label: 'İstatistikler' },
        { id: 'settings', icon: '⚙️', label: 'Ayarlar' },
        ...(isAdmin ? [{ id: 'admin', icon: '👑', label: 'Admin Paneli' }] : [])
    ];

    const handleSignOut = async () => {
        await signOut();
        dispatch({ type: 'SIGN_OUT' });
    };

    return (
        <>
            <button 
              className="mobile-menu-toggle" 
              onClick={() => dispatch({ type: 'SET_MOBILE_MENU', payload: true })}
            >
              ☰
            </button>
            <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${state.isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="p-4 flex items-center justify-between">
                     <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                        <img src="/assets/logo.png" alt="Logo" className="h-10"/>
                        {!isSidebarCollapsed && <span className="ml-2 text-xl font-bold text-white">Kasamatik</span>}
                    </div>
                </div>

                <nav className="flex-1">
                    {navItems.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_ACTIVE_PAGE', payload: item.id })}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-text">{item.label}</span>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="sidebar-item" onClick={handleSignOut}>
                        <span className="sidebar-icon">🚪</span>
                        <span className="sidebar-text">Çıkış Yap</span>
                    </div>
                    <button 
                        className="w-full text-left mt-4 text-gray-400 hover:text-white"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR'})}
                    >
                         {isSidebarCollapsed ? '➡️' : '⬅️ Kenar Çubuğunu Daralt'}
                    </button>
                </div>
            </div>
             {state.isMobileMenuOpen && (
                <div 
                  className="fixed inset-0 bg-black/50 z-[999]" 
                  onClick={() => dispatch({ type: 'SET_MOBILE_MENU', payload: false })}
                ></div>
            )}
        </>
    );
};

export default Sidebar;
