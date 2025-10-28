import React from 'react';
import { useAppContext } from '../../context/StateContext';
import PasswordResetModal from './PasswordResetModal';
import AddBetModal from './AddBetModal';
import BetDetailModal from './BetDetailModal';
import ConfirmationModal from './ConfirmationModal';
import InstallPWAModal from './InstallPWAModal';
import SpecialOddDetailModal from './SpecialOddDetailModal';
import AdPopupModal from './AdPopupModal';


const MODAL_COMPONENTS: { [key: string]: React.ComponentType<any> } = {
    PASSWORD_RESET: PasswordResetModal,
    ADD_BET: AddBetModal,
    BET_DETAIL: BetDetailModal,
    CONFIRMATION: ConfirmationModal,
    INSTALL_PWA: InstallPWAModal,
    SPECIAL_ODD_DETAIL: SpecialOddDetailModal,
    AD_POPUP: AdPopupModal,
};

const ModalRenderer: React.FC = () => {
    const { state } = useAppContext();
    const { modal } = state;

    if (!modal.type) {
        return null;
    }

    const SpecificModal = MODAL_COMPONENTS[modal.type];

    if (!SpecificModal) {
        return null;
    }

    return <SpecificModal {...modal.props} />;
};

export default ModalRenderer;
