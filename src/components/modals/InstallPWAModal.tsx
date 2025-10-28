import React from 'react';
import { useAppContext } from '../../context/StateContext';
import ModalWrapper from './ModalWrapper';
import Button from '../common/Button';

interface InstallPWAModalProps {
    onInstall: () => void;
    isIOS?: boolean;
}

const InstallPWAModal: React.FC<InstallPWAModalProps> = ({ onInstall, isIOS = false }) => {
    const { dispatch } = useAppContext();

    return (
        <ModalWrapper title="Uygulamayı Yükle" onClose={() => dispatch({ type: 'HIDE_MODAL' })}>
            <div className="text-center">
                <img src="/assets/logo_192.png" alt="Kasamatik Logo" className="mx-auto h-20 w-auto mb-4" />
                <p className="text-gray-300 mb-6">
                    Kasamatik'i ana ekranınıza ekleyerek daha hızlı erişim ve daha iyi bir deneyim elde edin!
                </p>
                {isIOS ? (
                    <div className="text-left bg-gray-800 p-4 rounded-lg">
                        <p className="font-semibold">iOS Kurulum Adımları:</p>
                        <ol className="list-decimal list-inside text-sm mt-2">
                            <li>Tarayıcınızda 'Paylaş' ikonuna dokunun.</li>
                            <li>Açılan menüden 'Ana Ekrana Ekle' seçeneğini bulun.</li>
                            <li>'Ekle' diyerek işlemi tamamlayın.</li>
                        </ol>
                    </div>
                ) : (
                    <Button onClick={onInstall}>
                        Şimdi Yükle
                    </Button>
                )}
            </div>
        </ModalWrapper>
    );
};

export default InstallPWAModal;
