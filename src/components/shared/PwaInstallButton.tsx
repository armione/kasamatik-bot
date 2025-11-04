
// src/components/shared/PwaInstallButton.tsx
import React from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { FaDownload } from 'react-icons/fa6';

interface PwaInstallButtonProps {
  className?: string;
}

const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({ className }) => {
  const { canInstall, handleInstall } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className={className}
    >
      <FaDownload className="mr-2" />
      Uygulamayı Yükle
    </button>
  );
};

export default PwaInstallButton;
