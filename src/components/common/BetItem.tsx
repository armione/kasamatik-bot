import React from 'react';
import { Bet } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAppContext } from '../../context/StateContext';

interface BetItemProps {
    bet: Bet;
}

const BetItem: React.FC<BetItemProps> = ({ bet }) => {
    const { dispatch } = useAppContext();
    
    const statusClasses: { [key: string]: string } = {
        won: 'status-won',
        lost: 'status-lost',
        pending: 'status-pending',
        refunded: 'bg-blue-500 text-white'
    };

    const statusText: { [key: string]: string } = {
        won: 'Kazandı',
        lost: 'Kaybetti',
        pending: 'Bekliyor',
        refunded: 'İade'
    };

    const handleClick = () => {
        dispatch({ type: 'SHOW_MODAL', payload: { type: 'BET_DETAIL', props: { bet } } });
    };

    return (
        <div className={`bet-card ${bet.status}`} onClick={handleClick} role="button" tabIndex={0}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold text-white">{bet.platform}</p>
                    <p className="text-sm text-gray-400">{bet.details.substring(0, 30)}{bet.details.length > 30 ? '...' : ''}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-white">{formatCurrency(bet.bet_amount)}</p>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusClasses[bet.status]}`}>
                        @{bet.odds}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BetItem;
