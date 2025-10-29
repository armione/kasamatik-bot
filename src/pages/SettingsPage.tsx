
// src/pages/SettingsPage.tsx
import AccountSettings from '../components/settings/AccountSettings';
import DataManagement from '../components/settings/DataManagement';
import DangerZone from '../components/settings/DangerZone';
import PwaInstallButton from '../components/shared/PwaInstallButton';

const SettingsPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Ayarlar</h1>
        <p className="mt-1 text-gray-400">Hesabınızı ve uygulama verilerinizi yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <AccountSettings />
          <DataManagement />
        </div>
        <div className="space-y-8">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Uygulama Kurulumu</h3>
            <p className="text-gray-300 mb-4">Kasamatik'i bir uygulama gibi ana ekranınıza ekleyerek daha hızlı erişim sağlayın.</p>
            <PwaInstallButton className="gradient-button w-full flex justify-center items-center py-2.5 rounded-lg font-semibold" />
          </div>
          <DangerZone />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
