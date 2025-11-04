// api/process-analysis-task.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase ortam değişkenleri bulunamadı.");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to call other API endpoints internally
const internalApiCall = async (endpoint, body) => {
    // Construct the base URL for API calls. In Vercel, use VERCEL_URL.
    // Fallback to localhost for local development.
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const url = `${baseUrl}/api/${endpoint}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Internal API call to ${endpoint} failed: ${errorData.message || response.statusText}`);
    }
    return response.json();
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }

    try {
        const { taskId } = request.body;
        if (!taskId) {
            return response.status(400).json({ message: 'Görev ID gerekli.' });
        }

        // 1. Görevi ve ilgili özel oranı al
        await supabase.from('analysis_tasks').update({ status: 'processing' }).eq('id', taskId);

        const { data: task, error: taskError } = await supabase
            .from('analysis_tasks')
            .select('id, special_odds(id, description, created_at)')
            .eq('id', taskId)
            .single();

        if (taskError) throw new Error(`Görev ${taskId} bulunamadı: ${taskError.message}`);
        if (!task.special_odds) throw new Error(`Görev ${taskId} için özel oran bulunamadı.`);

        const odd = task.special_odds;
        let finalOutcome = 'unknown';

        try {
            // 2. Kuponu ayrıştır
            const parsedMatches = await internalApiCall('parse-coupon', { couponDescription: odd.description });
            if (!Array.isArray(parsedMatches) || parsedMatches.length === 0) {
                 throw new Error('Kupon ayrıştırılamadı.');
            }

            // 3. Her maçın sonucunu al
            const matchResults = await Promise.all(
                parsedMatches.map(match =>
                    internalApiCall('get-match-result', {
                        matchDescription: match.normalizedName,
                        matchDate: new Date(odd.created_at).toISOString().split('T')[0]
                    })
                )
            );

            // 4. Her bahsi değerlendir
            const evaluations = await Promise.all(
                matchResults.map((result, index) => {
                    if (result.status !== 'finished') return { outcome: 'pending' };
                    return internalApiCall('evaluate-bet', {
                        betDescription: parsedMatches[index].fullDescription,
                        matchResult: result
                    });
                })
            );

            // 5. Nihai sonucu belirle
            let allLegsWon = true;
            let anyLegLost = false;
            
            for (const evalItem of evaluations) {
                if (evalItem.outcome === 'lost') {
                    anyLegLost = true;
                    allLegsWon = false;
                    break;
                }
                if (evalItem.outcome !== 'won') {
                    allLegsWon = false;
                }
            }

            if (anyLegLost) {
                finalOutcome = 'lost';
            } else if (allLegsWon) {
                finalOutcome = 'won';
            } else {
                finalOutcome = 'unknown'; // Some legs are pending or unknown
            }

        } catch (analysisError) {
            console.error(`Analysis error for task ${taskId}:`, analysisError);
            finalOutcome = 'unknown';
        }

        // 6. Görev durumunu güncelle
        await supabase
            .from('analysis_tasks')
            .update({ status: 'completed', result: finalOutcome })
            .eq('id', taskId);
            
        // 7. Sonucu döndür
        return response.status(200).json({ suggestedStatus: finalOutcome });

    } catch (error) {
        console.error('Analiz görevi işleme fonksiyonunda hata:', error);
        // If the task itself fails, try to mark it as failed in the DB
        if (request.body.taskId) {
            await supabase
                .from('analysis_tasks')
                .update({ status: 'failed', result: error.message })
                .eq('id', request.body.taskId);
        }
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}
