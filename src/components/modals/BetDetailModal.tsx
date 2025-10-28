import React from 'react';
import { useAppContext } from '../../context/StateContext';
import { Bet } from '../../types';
import ModalWrapper from './ModalWrapper';

interface BetDetailModalProps {
    bet: Bet;
}

const BetDetailModal: React.FC<BetDetailModalProps> = ({ bet }) => {
    const { dispatch } = useAppContext();

    // Logic to update/delete bet would go here

    return (
        <ModalWrapper title="Bahis Detayları" onClose={() => dispatch({ type: 'HIDE_MODAL' })}>
            <div className="space-y-4 text-white">
                <p><strong>Platform:</strong> {bet.platform}</p>
                <p><strong>Yatırım:</strong> {bet.bet_amount} TRY</p>
                <p><strong>Oran:</strong> {bet.odds}</p>
                <p><strong>Durum:</strong> {bet.status}</p>
                <p><strong>Detaylar:</strong> {bet.details}</p>
            </div>
        </ModalWrapper>
    );
};

export default BetDetailModal;
