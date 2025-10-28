import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
}

const Button: React.FC<ButtonProps> = ({
    children,
    loading = false,
    loadingText = 'Yükleniyor...',
    className,
    ...props
}) => {
    return (
        <button
            className={`gradient-button py-3 px-6 rounded-lg flex items-center justify-center ${className}`}
            disabled={loading}
            {...props}
        >
            {loading ? (
                <>
                    <div className="btn-loader mr-2"></div>
                    <span className="btn-text">{loadingText}</span>
                </>
            ) : (
                <span className="btn-text">{children}</span>
            )}
        </button>
    );
};

export default Button;
