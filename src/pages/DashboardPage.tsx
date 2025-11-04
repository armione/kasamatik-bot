// src/pages/DashboardPage.tsx
import StatCards from '../components/dashboard/StatCards';
import PerformanceSummary from '../components/dashboard/PerformanceSummary';
import RecentBets from '../components/dashboard/RecentBets';
import DashboardBannerAd from '../components/dashboard/DashboardBannerAd';

const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Ana Panel</h1>
        <p className="mt-1 text-gray-400">Kasanızın genel durumuna hoş geldiniz.</p>
      </div>
      
      <StatCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceSummary />
        </div>
        <div>
          <RecentBets />
        </div>
      </div>
      
      <DashboardBannerAd />
    </div>
  );
}

export default DashboardPage;
