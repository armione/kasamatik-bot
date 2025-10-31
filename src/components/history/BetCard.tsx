// src/components/history/BetCard.tsx
import { useState } from 'react';
import { Bet } from '../../types';
import { calculateProfitLoss } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { FaTrash, FaPen, FaFootball, FaSatelliteDish, FaStar, FaWandMagicSparkles } from 'react-icons/fa6';
// FIX: Add missing React import
import React from 'react';

interface BetCardProps {
    bet: Bet;
}

const BetCard: React.FC<BetCardProps> = ({ bet }) => {
    const { openEditBetModal } = useUiStore();
    const { deleteBet: deleteBetFromStore } = useDataStore();
    const [isFetchingResult, setIsFetchingResult] = useState(false);
    const [aiResult, setAiResult] = useState<string[] | null>(null);

    const isSpecialOdd = !!bet.special_odd_id;
    const status = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;
    const profit_loss = calculateProfitLoss(bet);
    
    const statusInfo = {
        pending: { class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'Bekleyen' },
        won: { class: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Kazandı' },
        lost: { class: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Kaybetti' },
        refunded: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'İade' },
    };

    const betTypeIcon = {
        'Spor Bahis': <FaFootball />,
        'Canlı Bahis': <FaSatelliteDish />,
        'Özel Oran': <FaStar />,
        'Kasa İşlemi': null
    };

    const handleDelete = async () => {
        if (!window.confirm('Bu bahsi silmek istediğinizden emin misiniz?')) return;
        
        const toastId = toast.loading('Bahis siliniyor...');
        const { error } = await supabase.from('bets').delete().eq('id', bet.id);

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            deleteBetFromStore(bet.id);
            toast.success('Bahis silindi.', { id: toastId });
        }
    };
    
    const handleFindResult = async () => {
        setIsFetchingResult(true);
        setAiResult(null);
        const toastId = toast.loading('Yapay zeka analiz için hazırlanıyor...');

        let matches: string[];
        try {
            // Step 1: Parse the coupon description
            const parseResponse = await fetch('/api/parse-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ couponDescription: bet.description }),
            });
            if (!parseResponse.ok) throw new Error('Kupon ayrıştırılamadı.');
            
            const parsedMatches = await parseResponse.json();
            if (!Array.isArray(parsedMatches) || parsedMatches.length === 0) throw new Error('Ayrıştırma sonucu geçersiz.');
            
            matches = parsedMatches;
        } catch (e) {
            // Fallback: treat the whole description as one match
            matches = [bet.description];
        }

        try {
            toast.loading(`Analiz ediliyor (${matches.length} maç)...`, { id: toastId });

            // Step 2: Get results for all matches
            setAiResult(matches.map(m => `- ${m.substring(0, 40)}... ⏳`));

            const matchResults = await Promise.all(
                matches.map(async (matchDesc) => {
                    const res = await fetch('/api/get-match-result', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ matchDescription: matchDesc }),
                    });
                    if (!res.ok) return { status: 'not_found', error: `API hatası: ${res.status}` };
                    return res.json();
                })
            );

            // Step 3: Evaluate each match
            const evaluations = await Promise.all(
                matchResults.map((result, index) => {
                    const currentMatchDesc = matches[index];
                    if (result.status !== 'finished' || !result.winner) {
                        return Promise.resolve({ outcome: 'pending', result });
                    }

                    return fetch('/api/evaluate-bet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ betDescription: currentMatchDesc, matchResult: result }),
                    }).then(res => res.json()).then(evalResult => ({ ...evalResult, result }));
                })
            );
            
            // Step 4: Display results and determine coupon outcome
            let finalCouponOutcome: 'won' | 'lost' | 'pending' | 'unknown' = 'pending';
            const resultTextLines: string[] = [];
            let allLegsWon = true;
            let anyLegLost = false;
            let anyLegPending = false;

            evaluations.forEach((evalItem, index) => {
                const matchDesc = matches[index];
                const score = evalItem.result.final_score ? `(${evalItem.result.final_score})` : '';
                let line = `- ${matchDesc} ${score}`;

                if (evalItem.outcome === 'won') {
                    line += ' ✅';
                } else if (evalItem.outcome === 'lost') {
                    line += ' ❌';
                    allLegsWon = false;
                    anyLegLost = true;
                } else { // unknown or pending
                    const infoText = evalItem.result.status === 'in_progress' ? '(Devam ediyor)' : '(Sonuç bulunamadı)';
                    line += ` ⏳ ${infoText}`;
                    allLegsWon = false;
                    anyLegPending = true;
                }
                resultTextLines.push(line);
            });
            
            if (matches.length > 1) {
                resultTextLines.push('---');
                if (anyLegLost) {
                    finalCouponOutcome = 'lost';
                    resultTextLines.push('🏁 Kupon Sonucu: Kaybetti');
                } else if (anyLegPending) {
                    finalCouponOutcome = 'pending';
                    resultTextLines.push('⏳ Kupon Sonucu: Beklemede (henüz bitmemiş maçlar var)');
                } else if (allLegsWon) {
                    finalCouponOutcome = 'won';
                    resultTextLines.push('🏆 Kupon Sonucu: Kazandı!');
                } else {
                    finalCouponOutcome = 'unknown';
                    resultTextLines.push('❓ Kupon Sonucu: Belirsiz (bazı maçlar yorumlanamadı)');
                }
            } else { // Single bet logic
                finalCouponOutcome = evaluations[0]?.outcome === 'won' ? 'won' : evaluations[0]?.outcome === 'lost' ? 'lost' : 'pending';
            }

            setAiResult(resultTextLines);

            // Step 5: Open modal if conclusive
            if (finalCouponOutcome === 'won' || finalCouponOutcome === 'lost') {
                 const prefilledData = {
                    status: finalCouponOutcome,
                    win_amount: finalCouponOutcome === 'won' ? bet.bet_amount * bet.odds : 0,
                };
                openEditBetModal(bet, prefilledData);
                toast.success('Bahis sonucu yorumlandı! Lütfen onaylayın.', { id: toastId });
            } else {
                toast('Maç sonuçları bulundu, ancak kupon sonucu net değil. Lütfen manuel kontrol edin.', { id: toastId, icon: 'ℹ️' });
            }
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
            setAiResult([`Bir hata oluştu: ${error.message}`]);
        } finally {
            setIsFetchingResult(false);
        }
    };


    return (
        <div className={`glass-card rounded-2xl p-4 border-l-4 ${statusInfo[status].class}`}>
            <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl text-primary-blue">{betTypeIcon[bet.bet_type]}</div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{bet.platform}</h3>
                            <p className="text-gray-400 text-sm">{bet.bet_type}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo[status].class}`}>{statusInfo[status].text}</span>
                </div>
                <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3 text-gray-300">
                    <p>{bet.description}</p>
                </div>

                {aiResult && (
                    <div className="p-3 bg-gray-900/40 rounded-lg text-sm text-cyan-300 border border-cyan-500/20">
                        <p className="font-semibold flex items-center gap-2">
                           <FaWandMagicSparkles /> Yapay Zeka Analizi:
                        </p>
                        <div className="pl-1 mt-1 space-y-1 font-mono text-xs">
                            {aiResult.map((line, index) => (
                                <p key={index} className="break-words">{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center"><div className="text-xs text-gray-400 mb-1">Tarih</div><div className="font-semibold">{new Date(bet.date).toLocaleDateString('tr-TR')}</div></div>
                    <div className="text-center"><div className="text-xs text-gray-400 mb-1">Miktar</div><div className="font-semibold">{bet.bet_amount.toFixed(2)} ₺</div></div>
                    <div className="text-center"><div className="text-xs text-gray-400 mb-1">Oran</div><div className="font-semibold">{bet.odds}</div></div>
                    {status !== 'pending' && <div className="text-center"><div className="text-xs text-gray-400 mb-1">Kar/Zarar</div><div className={`font-bold ${profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit_loss >= 0 ? '+' : ''}{profit_loss.toFixed(2)} ₺</div></div>}
                </div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-600/50">
                    {isSpecialOdd ? (
                        <div className="flex-1 text-center text-sm text-gray-400 italic py-2">Sadece yönetici sonuçlandırabilir.</div>
                    ) : (
                         <>
                            {status === 'pending' && (
                                <button onClick={handleFindResult} disabled={isFetchingResult} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/50 text-white text-sm rounded-lg hover:bg-purple-600/80 transition-colors disabled:opacity-50 disabled:cursor-wait">
                                    {isFetchingResult ? 'Aranıyor...' : <><FaWandMagicSparkles /> Sonucu Bul</>}
                                </button>
                            )}
                            <button onClick={() => openEditBetModal(bet)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/50 text-white text-sm rounded-lg hover:bg-blue-600/80 transition-colors">
                                <FaPen /> {status === 'pending' ? 'Sonuçlandır' : 'Düzenle'}
                            </button>
                         </>
                    )}
                   
                    <button onClick={handleDelete} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-red-800/50 text-white text-sm rounded-lg hover:bg-red-800/80 transition-colors">
                        <FaTrash /> Sil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BetCard;