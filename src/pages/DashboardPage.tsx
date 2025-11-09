// src/pages/DashboardPage.tsx
import StatCards from '../components/dashboard/StatCards';
import PerformanceSummary from '../components/dashboard/PerformanceSummary';
import RecentBets from '../components/dashboard/RecentBets';
import DashboardBannerAd from '../components/dashboard/DashboardBannerAd';
import { useDataStore } from '../stores/dataStore';
import { StatCardsSkeleton, PerformanceSummarySkeleton, RecentBetsSkeleton } from '../components/shared/Skeletons';

const DashboardPage = () => {
  const loading = useDataStore((state) => state.loading);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Ana Panel</h1>
        <p className="mt-1 text-gray-400">Kasanızın genel durumuna hoş geldiniz.</p>
      </div>
      
      {loading ? <StatCardsSkeleton /> : <StatCards />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? <PerformanceSummarySkeleton /> : <PerformanceSummary />}
        </div>
        <div>
          {loading ? <RecentBetsSkeleton /> : <RecentBets />}
        </div>
      </div>
      
      {!loading && <DashboardBannerAd />}
    </div>
  );
}

export default DashboardPage;