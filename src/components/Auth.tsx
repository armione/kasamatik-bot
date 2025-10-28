import React, { useState } from 'react';
import { signIn, signUp } from '../api/supabase';
import { showNotification } from '../utils/helpers';
import Button from './common/Button';
import PasswordResetModal from './modals/PasswordResetModal';
import { usePWAInstaller } from '../hooks/usePWAInstaller';

const Auth: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState<'login' | 'signup' | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [isPasswordResetOpen, setPasswordResetOpen] = useState(false);
    
    const { isInstallable, showInstallPrompt } = usePWAInstaller();

    const handleLogin = async () => {
        setLoading('login');
        const { error } = await signIn(email, password);
        if (error) {
            showNotification(`Giriş hatası: ${error.message}`, 'error');
        }
        setLoading(null);
    };

    const handleSignUp = async () => {
        setLoading('signup');
        const { data, error } = await signUp(email, password);
        if (error) {
            showNotification(`Kayıt hatası: ${error.message}`, 'error');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
        } else if (data.user) {
            setShowSuccessMessage(true);
        } else {
            showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
        setLoading(null);
    };

    return (
        <div id="auth-container" className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-8 w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src="assets/logo.png" alt="Kasamatik Logo" className="mx-auto h-16 w-auto mb-4" />
                    <p className="text-gray-400">Akıllı Bahis Takibi</p>
                </div>
                
                {!showSuccessMessage ? (
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">E-posta</label>
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-glass w-full p-3 rounded-lg text-gray-800" placeholder="ornek@mail.com" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Şifre</label>
                            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-glass w-full p-3 rounded-lg text-gray-800" placeholder="••••••••" />
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-2">
                            <Button onClick={handleLogin} loading={loading === 'login'} loadingText="Giriş yapılıyor..." className="w-full">Giriş Yap</Button>
                            <button type="button" onClick={handleSignUp} disabled={!!loading} className="w-full py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50">
                                {loading === 'signup' ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
                            </button>
                        </div>
                        {isInstallable && (
                            <div className="pt-2">
                                <button type="button" onClick={showInstallPrompt} className="w-full py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                                    ⬇️ Uygulamayı Yükle
                                </button>
                            </div>
                        )}
                        <div className="text-center mt-4">
                            <a href="#" onClick={(e) => { e.preventDefault(); setPasswordResetOpen(true); }} className="text-sm text-gray-400 hover:text-primary-blue">Şifremi Unuttum</a>
                        </div>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-xl font-bold text-white mb-2">Kayıt Başarılı!</h2>
                        <p className="text-gray-300">Giriş yapabilmek için lütfen <strong className="text-white">{email}</strong> adresinize gönderdiğimiz doğrulama linkine tıklayın.</p>
                    </div>
                )}
            </div>
            <PasswordResetModal isOpen={isPasswordResetOpen} onClose={() => setPasswordResetOpen(false)} />
        </div>
    );
};

export default Auth;
