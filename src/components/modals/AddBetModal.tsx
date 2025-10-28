import React, { useState } from 'react';
import { useAppContext } from '../../context/StateContext';
import ModalWrapper from './ModalWrapper';
import Button from '../common/Button';

const AddBetModal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [betAmount, setBetAmount] = useState('');
    // ... other form states

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Add bet logic here
        console.log("Adding bet with amount:", betAmount);
        dispatch({ type: 'HIDE_MODAL' });
    };

    return (
        <ModalWrapper title="Yeni Bahis Ekle" onClose={() => dispatch({ type: 'HIDE_MODAL' })}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300">
                        Yatırım Miktarı
                    </label>
                    <input
                        type="number"
                        id="betAmount"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="input-glass mt-1 block w-full text-black"
                        placeholder="100"
                        required
                    />
                </div>
                {/* Other form fields will go here */}
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => dispatch({ type: 'HIDE_MODAL' })} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-700">İptal</button>
                    <Button type="submit">Bahsi Ekle</Button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default AddBetModal;
