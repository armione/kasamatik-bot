// src/components/dashboard/DashboardBannerAd.tsx
import { useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';

const DashboardBannerAd = () => {
  const ads = useDataStore((state) => state.ads);
  const bannerAd = useMemo(() => {
    return ads.find(ad => ad.location === 'dashboard_banner');
  }, [ads]);

  if (!bannerAd) {
    return null;
  }

  return (
    <a href={bannerAd.target_url} target="_blank" rel="noopener noreferrer" className="block transition-transform duration-300 hover:scale-105">
      <img src={bannerAd.image_url} alt="Reklam" className="rounded-2xl w-full object-cover shadow-lg" />
    </a>
  );
};

export default DashboardBannerAd;
