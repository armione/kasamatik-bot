import React, { useEffect } from 'react';

interface ModalWrapperProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-[5000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="glass-card rounded-2xl p-6 w-full max-w-lg relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export default ModalWrapper;
