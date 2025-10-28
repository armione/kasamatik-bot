import React from 'react';
import { useAppContext } from '../../context/StateContext';
import { SpecialOdd } from '../../types';
import ModalWrapper from './ModalWrapper';
import Button from '../common/Button';
import { addBet } from '../../api/database';
import { showNotification } from '../../utils/helpers';

interface SpecialOddDetailModalProps {
    odd: SpecialOdd;
}

const SpecialOddDetailModal: React.FC<SpecialOddDetailModalProps> = ({ odd }) => {
    const { state, dispatch } = useAppContext();

    const handlePlay = () => {
        if (!state.currentUser) return;
        const betAmount = prompt("Bu bahse ne kadar yatırmak istersiniz?", "100");
        if (betAmount) {
            const amount = parseFloat(betAmount);
            if (!isNaN(amount) && amount > 0) {
                const newBet = {
                    user_id: state.currentUser.id,
                    bet_amount: amount,
                    odds: odd.odds,
                    status: 'pending' as const,
                    platform: odd.platform,
                    details: odd.title,
                    potential_return: amount * odd.odds,
                    special_odd_id: odd.id,
                };
                
                addBet(newBet).then(({ data, error }) => {
                    if (error) {
                         showNotification("Bahis eklenirken hata oluştu.", "error");
                    } else if (data) {
                         dispatch({ type: 'ADD_BET', payload: data[0] });
                         showNotification("Bahis başarıyla kuponunuza eklendi!", "success");
                         window.open(odd.link, '_blank');
                         dispatch({ type: 'HIDE_MODAL' });
                    }
                });
            }
        }
    };

    return (
        <ModalWrapper title={odd.platform} onClose={() => dispatch({ type: 'HIDE_MODAL' })}>
            <div className="space-y-4 text-white">
                <h3 className="text-lg font-bold">{odd.title}</h3>
                <p className="text-gray-300">{odd.description}</p>
                <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                    <span className="text-gray-400">Oran</span>
                    <span className="text-2xl font-bold text-primary-blue">{odd.odds}</span>
                </div>
                 <Button onClick={handlePlay} className="w-full">
                    Bu Oranı Oyna & Siteye Git
                </Button>
            </div>
        </ModalWrapper>
    );
};

export default SpecialOddDetailModal;
