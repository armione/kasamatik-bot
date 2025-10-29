// src/components/Header.tsx
import { useLocation } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';
import { FaBars } from 'react-icons/fa6';

const getPageTitle = (pathname: string): string => {
    const titles: { [key: string]: string } = {
        '/': 'Ana Panel',
        '/new-bet': 'Yeni Kayıt',
        '/history': 'Bahis Geçmişi',
        '/cash-history': 'Kasa Geçmişi',
        '/statistics': 'İstatistikler',
        '/guide': 'Rehber',
        '/sponsors': 'Sponsorlar',
        '/settings': 'Ayarlar',
    };
    return titles[pathname] || 'Kasamatik';
};

const Header = () => {
    const { toggleMobileMenu } = useUiStore();
    const location = useLocation();
    const title = getPageTitle(location.pathname);

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-gray-900/80 px-4 backdrop-blur-md md:hidden">
            <h1 className="text-lg font-bold">{title}</h1>
            <button
                onClick={toggleMobileMenu}
                className="rounded p-2 text-2xl text-gray-300 hover:bg-white/10"
                aria-label="Toggle menu"
            >
                <FaBars />
            </button>
        </header>
    );
};

export default Header;
