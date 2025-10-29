import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const navigate = useNavigate();
  const { session } = useAuthStore();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Kayıt başarılı! Lütfen e-postanızı kontrol ederek hesabınızı onaylayın.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Başarılı girişten sonra App.tsx'deki onAuthStateChange tetiklenir ve yönlendirme yapar
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Şifre sıfırlama için lütfen e-posta adresinizi girin.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Şifre sıfırlama linki e-postanıza gönderildi.' });
    } catch (error: any) {
        setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="w-full max-w-md">
         <img src="/assets/logo.png" alt="Kasamatik Logo" className="mx-auto h-16 w-auto mb-6" />
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <h2 className="text-center text-3xl font-bold text-white mb-2 font-montserrat">
            {isSignUp ? 'Hesap Oluştur' : 'Kasamatik\'e Hoş Geldiniz'}
          </h2>
          <p className="text-center text-gray-400 mb-6">
            {isSignUp ? 'Devam etmek için bilgilerinizi girin.' : 'Giriş yaparak kasanızı yönetin.'}
          </p>
          
          {message && (
            <div className={`p-3 rounded-lg mb-4 text-center text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300">E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="gradient-button flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 ease-in-out hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'İşlem yapılıyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary-blue hover:text-blue-400">
              {isSignUp ? 'Zaten bir hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
            </button>
          </div>
            <div className="mt-4 text-center text-xs">
                <button onClick={handlePasswordReset} className="font-medium text-gray-400 hover:text-gray-300">
                    Şifrenizi mi unuttunuz?
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
