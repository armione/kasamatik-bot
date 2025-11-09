
// src/pages/SponsorsPage.tsx
import { useDataStore } from '../stores/dataStore';
import SponsorCard from '../components/sponsors/SponsorCard';
import { SponsorCardSkeleton } from '../components/shared/Skeletons';

const SponsorsPage = () => {
  const { sponsors, loading } = useDataStore((state) => ({ sponsors: state.sponsors, loading: state.loading }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Sponsorlarımız</h1>
        <p className="mt-1 text-gray-400">Uygulamamıza destek veren değerli sponsorlar.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <SponsorCardSkeleton key={i} />)}
        </div>
      ) : sponsors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sponsors.map(sponsor => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 glass-card rounded-2xl">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-xl">Henüz sponsor bulunmuyor.</p>
        </div>
      )}
    </div>
  );
};

export default SponsorsPage;