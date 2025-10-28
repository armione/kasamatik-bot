import React, { useState } from 'react';
import { resetPasswordForEmail } from '../../api/supabase';
import { showNotification } from '../../utils/helpers';
import ModalWrapper from './ModalWrapper';
import Button from '../common/Button';

interface PasswordResetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await resetPasswordForEmail(email);
        if (error) {
            showNotification(`Hata: ${error.message}`, 'error');
        } else {
            setIsSent(true);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <ModalWrapper title="Şifre Sıfırlama" onClose={onClose}>
            {!isSent ? (
                <form onSubmit={handleReset} className="space-y-4">
                    <p className="text-gray-400 text-sm">Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.</p>
                    <div>
                        <label htmlFor="reset-email" className="sr-only">E-posta</label>
                        <input
                            type="email"
                            id="reset-email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="input-glass w-full p-3 rounded-lg text-gray-800"
                            placeholder="ornek@mail.com"
                        />
                    </div>
                    <div className="pt-2 flex justify-end">
                        <Button type="submit" loading={loading} loadingText="Gönderiliyor...">
                            Sıfırlama Linki Gönder
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="text-center">
                    <p className="text-green-400 font-semibold">Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.</p>
                </div>
            )}
        </ModalWrapper>
    );
};

export default PasswordResetModal;
