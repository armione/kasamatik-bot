// src/components/special_odds/SpecialOddCard.tsx
import React, { useState } from 'react';
import { SpecialOdd } from '../../types';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaUsers, FaCoins, FaExternalLinkAlt, FaTag, FaCheck, FaTimes, FaUndo } from 'react-icons/fa';

interface SpecialOddCardProps {
    odd: SpecialOdd;
}

const SpecialOddCard: React.FC<SpecialOddCardProps> = ({ odd }) => {
    const { openPlaySpecialOddModal } = useUiStore();
    // FIX: Replaced hardcoded ADMIN_USER_ID with a role-based check.
    const { user, profileRole } = useAuthStore();
    const { updateSpecialOdd } = useDataStore();
    const [loading, setLoading] = useState(false);

    // FIX: Use profileRole to determine admin status, consistent with other components.
    const isAdmin = profileRole === 'admin' || profileRole === 'moderator';

    const handleResultUpdate = async (newStatus: 'won' | 'lost' | 'refunded') => {
        setLoading(true);
        const toastId = toast.loading('Sonuç güncelleniyor...');
        
        try {
            const { data, error } = await supabase
                .from('special_odds')
                .update({ status: newStatus, resulted_at: new Date().toISOString() })
                .eq('id', odd.id)
                .select()
                .single();

            if (error) throw error;
            
            if (data) {
                updateSpecialOdd(data);
                toast.success('Fırsat başarıyla sonuçlandırıldı!', { id: toastId });
            }
        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const statusInfo = {
        pending: { class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'Bekliyor' },
        won: { class: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Kazandı' },
        lost: { class: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Kaybetti' },
        refunded: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'İade' },
    };

    return (
        <div className={`glass-card rounded-2xl flex flex-col border-l-4 ${statusInfo[odd.status].class}`}>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg">{odd.platform}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo[odd.status].class}`}>{statusInfo[odd.status].text}</span>
                </div>
                <p className="text-gray-300 text-sm mb-4 overflow-hidden break-words line-clamp-3">{odd.description}</p>

                <div className="flex justify-between items-center text-sm text-gray-400 border-t border-b border-gray-600/50 py-2">
                    <div className="flex items-center gap-2" title="Oynanma Sayısı">
                        <FaUsers />
                        <span>{odd.play_count}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-primary-blue text-lg" title="Oran">
                        <FaTag />
                        <span>{odd.odds.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2" title="Maksimum Bahis">
                        <FaCoins />
                        <span>{odd.max_bet_amount ? `${odd.max_bet_amount}₺` : 'N/A'}</span>
                    </div>
                </div>

                {odd.primary_link_url && (
                    <a href={odd.primary_link_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full text-center px-4 py-2 bg-gray-700/50 rounded-lg text-sm font-semibold text-primary-blue hover:bg-gray-700/80 transition-colors">
                        <FaExternalLinkAlt />
                        {odd.primary_link_text || `${odd.platform} Sitesine Git`}
                    </a>
                )}
            </div>
            
            {/* Admin Controls */}
            {isAdmin && odd.status === 'pending' && (
                <div className="p-2 border-t border-gray-600/50 bg-gray-900/30">
                    <div className="flex justify-around gap-2">
                         <button onClick={() => handleResultUpdate('won')} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait bg-green-500/20 hover:bg-green-500/40 text-green-300">
                             <FaCheck /> Kazandı
                         </button>
                         <button onClick={() => handleResultUpdate('lost')} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait bg-red-500/20 hover:bg-red-500/40 text-red-300">
                             <FaTimes /> Kaybetti
                         </button>
                         <button onClick={() => handleResultUpdate('refunded')} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait bg-blue-500/20 hover:bg-blue-500/40 text-blue-300">
                             <FaUndo /> İade
                         </button>
                    </div>
                </div>
            )}

            <div className="p-4 border-t border-gray-600/50">
                <button
                    onClick={() => openPlaySpecialOddModal(odd)}
                    disabled={odd.status !== 'pending' || loading}
                    className="w-full gradient-button px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-transform duration-150 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    Fırsatı Oyna
                </button>
            </div>
        </div>
    );
};

export default SpecialOddCard;