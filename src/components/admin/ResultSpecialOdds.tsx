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

interface Task {
    id: number;
    special_odd_id: number;
    description: string;
}

const ResultSpecialOdds = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [totalTasks, setTotalTasks] = useState(0);
    const [completedTasks, setCompletedTasks] = useState(0);
    const [currentTaskDescription, setCurrentTaskDescription] = useState('');
    const { updateSpecialOdd } = useDataStore();

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setProposals([]);
        setCompletedTasks(0);
        setTotalTasks(0);
        setCurrentTaskDescription('');
        const toastId = toast.loading('Analiz işi başlatılıyor...');

        try {
            // Adım 1: Analiz işini başlat ve görev listesini al
            const startResponse = await fetch('/api/start-analysis-job', { method: 'POST' });
            const startData = await startResponse.json();

            if (!startResponse.ok) {
                throw new Error(startData.message || 'Analiz işi başlatılamadı.');
            }

            const tasks: Task[] = startData.tasks;
            if (tasks.length === 0) {
                toast.success('Analiz edilecek bekleyen fırsat yok.', { id: toastId });
                setIsAnalyzing(false);
                return;
            }

            setTotalTasks(tasks.length);
            toast.loading(`Analiz başladı: ${tasks.length} fırsat işlenecek...`, { id: toastId });

            // Adım 2: Görevleri tek tek işle
            const results: Proposal[] = [];
            for (const task of tasks) {
                setCurrentTaskDescription(task.description);
                try {
                    const processResponse = await fetch('/api/process-analysis-task', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: task.id }),
                    });
                    const processData = await processResponse.json();
                    if (processResponse.ok && processData.proposal) {
                        results.push(processData.proposal);
                    }
                } catch (error) {
                    console.error(`Görev ${task.id} işlenirken hata oluştu:`, error);
                }
                setCompletedTasks(prev => prev + 1);
            }
            
            setProposals(results);
            toast.success('Analiz tamamlandı! Lütfen sonuçları onaylayın.', { id: toastId });

        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setIsAnalyzing(false);
            setCurrentTaskDescription('');
        }
    };

    const handleConfirm = async () => {
        const updatesToSubmit = proposals
            .filter(p => p.proposedStatus === 'won' || p.proposedStatus === 'lost')
            .map(p => ({ id: p.id, newStatus: p.proposedStatus, }));

        if (updatesToSubmit.length === 0) {
            toast.error('Onaylanacak net bir sonuç bulunamadı.');
            return;
        }

        setConfirming(true);
        const toastId = toast.loading('Sonuçlar onaylanıyor...');
        try {
            const response = await fetch('/api/admin-confirm-special-odd-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: updatesToSubmit }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Onaylama işlemi başarısız.');
            
            result.updatedOdds.forEach((odd: SpecialOdd) => updateSpecialOdd(odd));
            toast.success(result.message, { id: toastId });
            setProposals([]);
        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setConfirming(false);
        }
    };
    
    const getStatusChip = (status: string) => {
        switch(status) {
            case 'won': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-300">Öneri: Kazandı ✅</span>;
            case 'lost': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-300">Öneri: Kaybetti ❌</span>;
            default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-300">Beklemede ⏳</span>;
        }
    }
    
    const finalProposalCount = proposals.filter(p => p.proposedStatus !== 'pending').length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Admin: Özel Fırsatları Sonuçlandır</h3>
            <p className="text-gray-300 text-sm mb-4">Bekleyen özel oranları yapay zeka ile analiz edin ve sonuçları tek tıkla onaylayın.</p>
            
            {!isAnalyzing && (
                 <button
                    onClick={handleAnalyze}
                    disabled={confirming}
                    className="w-full gradient-button flex justify-center items-center py-2.5 rounded-lg font-semibold disabled:opacity-50"
                >
                    <FaWandMagicSparkles className="mr-2" />
                    Bekleyen Fırsatları Analiz Et
                </button>
            )}

            {isAnalyzing && (
                <div className="space-y-3">
                    <p className="text-center text-primary-blue">Analiz ediliyor, lütfen bekleyin...</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-primary-blue h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                    <p className="text-center text-sm text-gray-400 truncate">({completedTasks}/{totalTasks}) {currentTaskDescription}</p>
                </div>
            )}

            {proposals.length > 0 && !isAnalyzing && (
                <div className="mt-6 space-y-4">
                    <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                        {proposals.map(p => (
                             <div key={p.id} className="p-3 rounded-lg flex items-center justify-between bg-gray-800/50">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white truncate">{p.platform} @ {p.odds}</p>
                                    <p className="text-xs text-gray-400 truncate">{p.description}</p>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    {getStatusChip(p.proposedStatus)}
                                </div>
                             </div>
                        ))}
                    </div>
                     <button
                        onClick={handleConfirm}
                        disabled={confirming || isAnalyzing || finalProposalCount === 0}
                        className="w-full bg-green-600/80 hover:bg-green-600/100 text-white flex justify-center items-center py-2.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                        <FaCheckDouble className="mr-2" />
                        {confirming ? 'Onaylanıyor...' : `Netleşen ${finalProposalCount} Sonucu Onayla`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultSpecialOdds;
