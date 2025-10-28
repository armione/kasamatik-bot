import React from 'react';
import { useAppContext } from '../../context/StateContext';
import ModalWrapper from './ModalWrapper';
import Button from '../common/Button';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm }) => {
    const { dispatch } = useAppContext();

    const handleConfirm = () => {
        onConfirm();
        dispatch({ type: 'HIDE_MODAL' });
    };

    return (
        <ModalWrapper title={title} onClose={() => dispatch({ type: 'HIDE_MODAL' })}>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
                <button type="button" onClick={() => dispatch({ type: 'HIDE_MODAL' })} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-700">
                    İptal
                </button>
                <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
                    Onayla
                </Button>
            </div>
        </ModalWrapper>
    );
};

export default ConfirmationModal;
