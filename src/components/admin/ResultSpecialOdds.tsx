// src/components/admin/ResultSpecialOdds.tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDataStore } from '../../stores/dataStore';
import { SpecialOdd } from '../../types';
import { FaWandMagicSparkles, FaCheckDouble } from 'react-icons/fa6';

interface Proposal {
    id: number;
    description: string;
    platform: string;
    odds: number;
    proposedStatus: 'won' | 'lost' | 'pending';
}

const ResultSpecialOdds = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [selectedUpdates, setSelectedUpdates] = useState<Record<number, 'won' | 'lost' | 'refunded'>>({});
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const { updateSpecialOdd } = useDataStore();

    const handleAnalyze = async () => {
        setLoading(true);
        setProposals([]);
        setSelectedUpdates({});
        const toastId = toast.loading('Yapay zeka bekleyen fırsatları analiz ediyor...');
        try {
            const response = await fetch('/api/admin-result-special-odds', { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Analiz başarısız oldu.');
            }
            
            setProposals(data.proposals || []);
            
            const initialSelections: Record<number, 'won' | 'lost' | 'refunded'> = {};
            if (data.proposals) {
                data.proposals.forEach((p: Proposal) => {
                    if (p.proposedStatus !== 'pending') {
                        initialSelections[p.id] = p.proposedStatus as 'won' | 'lost' | 'refunded';
                    }
                });
            }
            setSelectedUpdates(initialSelections);

            toast.success(data.message || `${data.proposals?.length || 0} fırsat analiz edildi.`, { id: toastId });
        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSelectionChange = (id: number, status: 'won' | 'lost' | 'refunded') => {
        setSelectedUpdates(prev => {
            const newUpdates = { ...prev };
            if (newUpdates[id]) {
                delete newUpdates[id];
            } else {
                newUpdates[id] = status;
            }
            return newUpdates;
        });
    };

    const handleConfirm = async () => {
        const updatesToSubmit = Object.entries(selectedUpdates).map(([id, newStatus]) => ({
            id: parseInt(id, 10),
            newStatus,
        }));

        if (updatesToSubmit.length === 0) {
            toast.error('Onaylanacak bir sonuç seçilmedi.');
            return;
        }

        setConfirming(true);
        const toastId = toast.loading('Seçili sonuçlar onaylanıyor...');
        try {
            const response = await fetch('/api/admin-confirm-special-odd-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: updatesToSubmit }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Onaylama işlemi başarısız.');
            }
            
            // Update local state
            result.updatedOdds.forEach((updatedOdd: SpecialOdd) => {
                updateSpecialOdd(updatedOdd);
            });

            toast.success(result.message, { id: toastId });
            setProposals([]);
            setSelectedUpdates({});

        } catch (error: any)
        {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setConfirming(false);
        }
    };
    
    const getStatusChip = (status: string) => {
        switch(status) {
            case 'won': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-300">Kazandı</span>;
            case 'lost': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-300">Kaybetti</span>;
            default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-300">Bekliyor</span>;
        }
    }

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Admin: Özel Fırsatları Sonuçlandır</h3>
            <p className="text-gray-300 text-sm mb-4">Bekleyen özel oranları yapay zeka ile analiz edin ve sonuçları tek tıkla onaylayın.</p>
            <button
                onClick={handleAnalyze}
                disabled={loading || confirming}
                className="w-full gradient-button flex justify-center items-center py-2.5 rounded-lg font-semibold disabled:opacity-50"
            >
                <FaWandMagicSparkles className="mr-2" />
                {loading ? 'Analiz Ediliyor...' : 'Bekleyen Fırsatları Analiz Et'}
            </button>

            {proposals.length > 0 && (
                <div className="mt-6 space-y-4">
                    <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                        {proposals.map(p => (
                             <div key={p.id} className={`p-3 rounded-lg flex items-center justify-between ${selectedUpdates[p.id] ? 'bg-blue-900/40 border border-primary-blue' : 'bg-gray-800/50'}`}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white truncate">{p.platform} @ {p.odds}</p>
                                    <p className="text-xs text-gray-400 truncate">{p.description}</p>
                                </div>
                                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                    <div className="w-24 text-center">
                                        {getStatusChip(p.proposedStatus)}
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={!!selectedUpdates[p.id]}
                                        disabled={p.proposedStatus === 'pending' || confirming}
                                        onChange={() => handleSelectionChange(p.id, p.proposedStatus as 'won'|'lost'|'refunded')}
                                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-primary-blue focus:ring-primary-blue disabled:opacity-50"
                                    />
                                </div>
                             </div>
                        ))}
                    </div>
                     <button
                        onClick={handleConfirm}
                        disabled={confirming || loading || Object.keys(selectedUpdates).length === 0}
                        className="w-full bg-green-600/80 hover:bg-green-600/100 text-white flex justify-center items-center py-2.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                        <FaCheckDouble className="mr-2" />
                        {confirming ? 'Onaylanıyor...' : `Seçili ${Object.keys(selectedUpdates).length} Sonucu Onayla`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultSpecialOdds;
