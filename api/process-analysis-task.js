// api/process-analysis-task.js
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const apiKey = process.env.API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !apiKey) {
    throw new Error("Gerekli ortam değişkenleri (Supabase, Gemini) bulunamadı.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey });

// --- Ana Fonksiyon ---
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }

    try {
        const { taskId } = request.body;
        if (!taskId) {
            return response.status(400).json({ message: 'Görev IDsi gerekli.' });
        }

        // 1. Görevi ve ilgili özel oranı al
        const { data: task, error: taskError } = await supabase
            .from('analysis_tasks')
            .select('id, special_odd_id, special_odds(*)')
            .eq('id', taskId)
            .single();

        if (taskError || !task || !task.special_odds) {
            throw new Error(`Görev bulunamadı veya ilişkili özel oran yok: ${taskId}`);
        }
        
        // Görevin durumunu 'processing' olarak güncelle
        await supabase.from('analysis_tasks').update({ status: 'processing' }).eq('id', taskId);

        const odd = task.special_odds;
        let finalOutcome = 'pending';
        let proposal = {};

        try {
            const matches = await parseCoupon(odd.description);
            const matchResults = await Promise.all(matches.map(desc => getMatchResult(desc)));
            const evaluations = await Promise.all(
                matchResults.map((result, index) => {
                    if (result.status !== 'finished') return { outcome: 'pending' };
                    return evaluateBet(matches[index], result);
                })
            );

            if (evaluations.some(e => e.outcome === 'lost')) {
                finalOutcome = 'lost';
            } else if (evaluations.some(e => e.outcome === 'pending' || e.outcome === 'unknown')) {
                finalOutcome = 'pending';
            } else {
                 finalOutcome = 'won';
            }

        } catch (error) {
            console.error(`Özel Oran ID ${odd.id} işlenirken bir hata oluştu:`, error.message);
            finalOutcome = 'pending';
        }

        proposal = {
            id: odd.id,
            description: odd.description,
            platform: odd.platform,
            odds: odd.odds,
            proposedStatus: finalOutcome
        };

        // Görevi 'completed' olarak güncelle ve sonucu kaydet
        const { error: updateError } = await supabase
            .from('analysis_tasks')
            .update({ status: 'completed', proposal: proposal })
            .eq('id', taskId);
            
        if(updateError) {
            console.error(`Görev ${taskId} güncellenirken hata:`, updateError);
        }

        return response.status(200).json({ proposal });

    } catch (error) {
        console.error('Analiz görevi işleme fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}

// --- Gemini Yardımcı Fonksiyonları ---
async function getGeminiJsonResponse(prompt, useGoogleSearch = false) {
    const config = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config });
    const rawText = response.text;
    if (!rawText) throw new Error("Gemini'den boş cevap geldi.");
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    try {
        const jsonText = jsonMatch ? jsonMatch[1] : rawText;
        return JSON.parse(jsonText);
    } catch (e) {
        throw new Error("Gemini'den gelen cevap JSON formatında değil.");
    }
}
async function parseCoupon(desc) { return await getGeminiJsonResponse(`Bu kombine bahis kuponu açıklamasını analiz et: "${desc}". Her maçı içeren bir JSON dizisi döndür. Yanıt olarak SADECE JSON dizisini markdown kod bloğunda döndür.`); }
async function getMatchResult(desc) {
    const cacheKey = `${desc}|${new Date().toISOString().split('T')[0]}`;
    const { data: cached } = await supabase.from('match_results_cache').select('match_data').eq('match_description', cacheKey).single();
    if (cached?.match_data?.status === 'finished') return cached.match_data;
    const prompt = `Şu maçı analiz et: "${desc}". Maç muhtemelen bugün veya dün oynandı. Yanıt olarak SADECE şu JSON yapısını markdown kod bloğunda döndür: {"status": "finished" | "not_found", "winner": "takım" | "draw", "final_score": "2-1", "first_half_score": "1-0", "total_goals": 3, "goal_scorers": ["oyuncu1"]}.`;
    const result = await getGeminiJsonResponse(prompt, true);
    if (result?.status === 'finished') {
        await supabase.from('match_results_cache').upsert({ match_description: cacheKey, match_data: result, last_checked_at: new Date().toISOString() }, { onConflict: 'match_description' });
    }
    return result || { status: 'not_found' };
}
async function evaluateBet(betDesc, matchResult) { return await getGeminiJsonResponse(`Maç sonucu: ${JSON.stringify(matchResult)}. Bahis: "${betDesc}". Sonucu analiz et. Yanıt olarak SADECE {"outcome": "won" | "lost" | "unknown"} JSON nesnesini markdown kod bloğunda döndür.`); }
