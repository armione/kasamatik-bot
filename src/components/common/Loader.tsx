import React from 'react';

interface LoaderProps {
    fullScreen?: boolean;
    text?: string;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen = false, text = 'Yükleniyor...' }) => {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[9999]">
                <div className="loader"></div>
                <p className="text-white mt-4">{text}</p>
            </div>
        );
    }

    return <div className="loader"></div>;
};

export default Loader;
