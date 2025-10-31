// src/components/admin/ResultSpecialOdds.tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDataStore } from '../../stores/dataStore';
import { FaPlay, FaCheck, FaTimes, FaQuestion } from 'react-icons/fa6';
import { SpecialOdd } from '../../types';

interface AnalysisTask {
    id: number;
    special_odd_id: number;
    description: string;
}

interface AnalysisResult extends AnalysisTask {
    suggestedStatus: 'won' | 'lost' | 'unknown';
}

const ResultSpecialOdds = () => {
    const [tasks, setTasks] = useState<AnalysisTask[]>([]);
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [confirmedResults, setConfirmedResults] = useState<Record<number, 'won' | 'lost'>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [progress, setProgress] = useState(0);
    const { updateSpecialOdd } = useDataStore();

    const handleStartAnalysis = async () => {
        setIsAnalyzing(true);
        setProgress(0);
        setTasks([]);
        setResults([]);
        setConfirmedResults({});
        const toastId = toast.loading('Analiz işi başlatılıyor...');

        try {
            // Step 1: Start the job and get tasks
            const startRes = await fetch('/api/start-analysis-job', { method: 'POST' });
            if (!startRes.ok) {
                const errorData = await startRes.json();
                throw new Error(errorData.message || 'Analiz başlatılamadı.');
            }
            const { tasks: fetchedTasks, message } = await startRes.json();

            if (!fetchedTasks || fetchedTasks.length === 0) {
                toast.success(message || 'Analiz edilecek öğe yok.', { id: toastId });
                setIsAnalyzing(false);
                return;
            }

            setTasks(fetchedTasks);
            toast.loading(`Analiz ediliyor: 0/${fetchedTasks.length}`, { id: toastId });

            // Step 2: Process tasks one by one
            const newResults: AnalysisResult[] = [];
            
            for (let i = 0; i < fetchedTasks.length; i++) {
                const task = fetchedTasks[i];
                try {
                    const processRes = await fetch('/api/process-analysis-task', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: task.id }),
                    });

                    if (!processRes.ok) {
                       throw new Error(`Görev ${task.id} işlenemedi.`);
                    }

                    const resultData = await processRes.json();
                    const result: AnalysisResult = { ...task, suggestedStatus: resultData.suggestedStatus };
                    newResults.push(result);
                    
                    // Pre-fill confirmation if AI is confident
                    if (result.suggestedStatus === 'won' || result.suggestedStatus === 'lost') {
                         setConfirmedResults(prev => ({
                            ...prev,
                            [task.special_odd_id]: result.suggestedStatus
                        }));
                    }

                } catch (taskError) {
                    console.error(taskError);
                    newResults.push({ ...task, suggestedStatus: 'unknown' });
                }
                
                setResults([...newResults]);
                const newProgress = ((i + 1) / fetchedTasks.length) * 100;
                setProgress(newProgress);
                toast.loading(`Analiz ediliyor: ${i + 1}/${fetchedTasks.length}`, { id: toastId });
            }

            toast.success('Analiz tamamlandı! Lütfen sonuçları kontrol edip onaylayın.', { id: toastId });

        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleConfirmResultChange = (specialOddId: number, status: 'won' | 'lost') => {
        setConfirmedResults(prev => ({ ...prev, [specialOddId]: status }));
    };

    const handleConfirmAll = async () => {
        setIsConfirming(true);
        const toastId = toast.loading('Sonuçlar kaydediliyor...');
        
        const updates = Object.entries(confirmedResults).map(([oddId, status]) => ({
            id: parseInt(oddId, 10),
            newStatus: status,
        }));

        try {
            const res = await fetch('/api/admin-confirm-special-odd-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Onaylama başarısız oldu.');
            }
            
            const { updatedCount, updatedOdds } = await res.json();
            
            // Update local state store
            if (updatedOdds) {
                updatedOdds.forEach((odd: SpecialOdd) => updateSpecialOdd(odd));
            }

            toast.success(`${updatedCount} fırsat güncellendi.`, { id: toastId });
            
            // Reset state
            setTasks([]);
            setResults([]);
            setConfirmedResults({});

        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsConfirming(false);
        }
    };
    
    const getStatusInfo = (status: 'won' | 'lost' | 'unknown') => {
        switch(status) {
            case 'won': return { class: 'border-green-500/50 text-green-300', text: 'Kazandı', icon: <FaCheck/> };
            case 'lost': return { class: 'border-red-500/50 text-red-300', text: 'Kaybetti', icon: <FaTimes /> };
            default: return { class: 'border-yellow-500/50 text-yellow-300', text: 'Belirsiz', icon: <FaQuestion /> };
        }
    };


    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Admin: Bekleyen Fırsatları Sonuçlandır</h3>
            
            {!isAnalyzing && results.length === 0 && (
                <>
                    <p className="text-gray-300 mb-4">
                        Bekleyen tüm özel oranları yapay zeka ile analiz etmek için butona tıklayın. Analiz sonuçları aşağıda listelenecektir.
                    </p>
                    <button onClick={handleStartAnalysis} disabled={isAnalyzing} className="gradient-button w-full flex justify-center items-center py-2.5 rounded-lg font-semibold">
                        <FaPlay className="mr-2" />
                        Analizi Başlat
                    </button>
                </>
            )}

            {isAnalyzing && (
                <div>
                    <p className="text-center text-gray-300 mb-2">{tasks.length > 0 ? `Analiz ediliyor: ${results.length}/${tasks.length}` : 'İş hazırlanıyor...'}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-primary-blue h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                    </div>
                </div>
            )}
            
            {results.length > 0 && (
                <div className="space-y-4 mt-6">
                    <h4 className="text-lg font-semibold text-white">Analiz Sonuçları</h4>
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {results.map(result => {
                        const statusInfo = getStatusInfo(result.suggestedStatus);
                        return (
                            <div key={result.id} className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-300 mb-3">{result.description}</p>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className={`flex items-center gap-2 text-sm font-semibold border ${statusInfo.class} px-3 py-1.5 rounded-md`}>
                                        {statusInfo.icon}
                                        <span>AI Önerisi: {statusInfo.text}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button 
                                            onClick={() => handleConfirmResultChange(result.special_odd_id, 'won')}
                                            className={`flex-1 transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${confirmedResults[result.special_odd_id] === 'won' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'}`}
                                        >
                                            <FaCheck /> Kazandı
                                        </button>
                                         <button 
                                            onClick={() => handleConfirmResultChange(result.special_odd_id, 'lost')}
                                            className={`flex-1 transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${confirmedResults[result.special_odd_id] === 'lost' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'}`}
                                        >
                                            <FaTimes /> Kaybetti
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                    
                    <button 
                        onClick={handleConfirmAll} 
                        disabled={isConfirming || Object.keys(confirmedResults).length === 0}
                        className="gradient-button w-full flex justify-center items-center py-2.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                        <FaCheck className="mr-2" />
                        {isConfirming ? 'Onaylanıyor...' : `${Object.keys(confirmedResults).length} Sonucu Onayla`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultSpecialOdds;