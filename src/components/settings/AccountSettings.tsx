
// src/components/settings/AccountSettings.tsx
import { useState, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

const AccountSettings = () => {
  const user = useAuthStore((state) => state.user);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Şifre başarıyla güncellendi.');
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Hesap Ayarları</h3>
      <form onSubmit={handlePasswordUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">E-posta</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Yeni Şifre</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white"
            placeholder="Yeni şifrenizi girin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white"
            placeholder="Yeni şifrenizi tekrar girin"
          />
        </div>
        <div className="pt-2">
          <button type="submit" disabled={loading} className="gradient-button px-6 py-2 rounded-lg font-semibold disabled:opacity-50">
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountSettings;
