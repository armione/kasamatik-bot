import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    isProfit?: boolean;
    profitAmount?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isProfit = false, profitAmount = 0 }) => {
    
    const profitClass = profitAmount > 0 ? 'text-green-400' : 'text-red-400';
    
    return (
        <div className="stat-card">
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className={`text-3xl font-bold ${isProfit ? profitClass : 'text-white'}`}>
                {value}
            </p>
        </div>
    );
};

export default StatCard;
