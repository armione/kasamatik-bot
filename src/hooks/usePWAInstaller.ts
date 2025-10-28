import { useState, useEffect } from 'react';
import { useAppContext } from '../context/StateContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstaller = () => {
  const { dispatch } = useAppContext();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const showInstallPrompt = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        setInstallPrompt(null);
      });
    }
  };
  
  const checkAndShowSmartInstallPrompt = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isInStandaloneMode = 'standalone' in window.navigator && (window.navigator as any).standalone;

      if (installPrompt && !isInStandaloneMode) {
          dispatch({ type: 'SHOW_MODAL', payload: { type: 'INSTALL_PWA', props: { onInstall: showInstallPrompt } } });
      } else if (isIOS && !isInStandaloneMode) {
          dispatch({ type: 'SHOW_MODAL', payload: { type: 'INSTALL_PWA', props: { isIOS: true } } });
      }
  };

  return { isInstallable: !!installPrompt, showInstallPrompt, checkAndShowSmartInstallPrompt };
};
