import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/StateContext';

const AdPopupModal: React.FC = () => {
    const { state } = useAppContext();
    const { ads } = state;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const adShown = sessionStorage.getItem('adShown');
        if (!adShown && ads.length > 0) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('adShown', 'true');
            }, 3000); // Show ad after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [ads]);

    if (!isOpen || ads.length === 0) return null;

    const ad = ads[0]; // Show the first ad

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-[6000] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="glass-card rounded-2xl p-6 w-full max-w-md relative text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white">&times;</button>
                <h2 className="text-2xl font-bold text-primary-blue mb-2">{ad.title}</h2>
                <p className="text-gray-300 mb-4">{ad.description}</p>
                <a 
                    href={ad.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="gradient-button inline-block py-2 px-6 rounded-lg"
                    onClick={() => setIsOpen(false)}
                >
                    Şimdi Göz At!
                </a>
            </div>
        </div>
    );
};

export default AdPopupModal;
