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
        
        await supabase.from('analysis_tasks').update({ status: 'processing' }).eq('id', taskId);

        const odd = task.special_odds;
        let finalOutcome = 'pending';
        
        try {
            const matches = await parseCoupon(odd.description);
            const matchResults = await Promise.all(matches.map(match => getMatchResult(match.normalizedName, odd.created_at)));
            
            const evaluations = await Promise.all(
                matchResults.map((result, index) => {
                    if (!result || result.status !== 'finished') return { outcome: 'pending' };
                    return evaluateBet(matches[index].fullDescription, result);
                })
            );

            if (evaluations.some(e => e.outcome === 'lost')) {
                finalOutcome = 'lost';
            } else if (evaluations.some(e => e.outcome === 'pending' || e.outcome === 'unknown') || evaluations.length === 0 || evaluations.some(e => !e.outcome)) {
                finalOutcome = 'pending';
            } else {
                 finalOutcome = 'won';
            }

        } catch (error) {
            console.error(`Özel Oran ID ${odd.id} işlenirken bir hata oluştu:`, error.message);
            finalOutcome = 'pending'; // Hata durumunda beklemede bırak
        }

        const proposal = {
            id: odd.id,
            description: odd.description,
            platform: odd.platform,
            odds: odd.odds,
            proposedStatus: finalOutcome
        };

        // Görevi 'completed' olarak güncelle ve sonucu kaydet
        await supabase
            .from('analysis_tasks')
            .update({ status: 'completed', proposal: proposal })
            .eq('id', taskId);

        return response.status(200).json({ proposal });

    } catch (error) {
        const taskId = request.body.taskId;
        if(taskId) {
            await supabase.from('analysis_tasks').update({ status: 'failed' }).eq('id', taskId);
        }
        console.error('Analiz görevi işleme fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}

// --- Gemini & Cache Yardımcı Fonksiyonları ---

async function getGeminiJsonResponse(prompt, useGoogleSearch = false) {
    const config = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};
    const geminiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config });
    const rawText = geminiResponse.text;
    if (!rawText) throw new Error("Gemini'den boş cevap geldi.");

    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    try {
        const jsonText = jsonMatch ? jsonMatch[1] : rawText;
        return JSON.parse(jsonText);
    } catch (e) {
        throw new Error(`Gemini'den gelen cevap JSON formatında değil. Ham metin: ${rawText}`);
    }
}

async function parseCoupon(desc) {
    const prompt = `Bu bahis kuponu açıklamasını analiz et: "${desc}". Her bir maçı ayrı bir eleman olarak içeren bir JSON dizisi oluştur. Her eleman {"fullDescription": "...", "normalizedName": "..."} formatında olmalı. Yanıt olarak SADECE ve SADECE bu JSON dizisini içeren bir markdown kod bloğu döndür.`;
    const result = await getGeminiJsonResponse(prompt);
    if (!Array.isArray(result) || result.length === 0 || !result[0].fullDescription) {
        return [{ fullDescription: desc, normalizedName: desc }];
    }
    return result;
}

async function getMatchResult(normalizedName, date) {
    const cacheKey = `${normalizedName}|${new Date(date).toISOString().split('T')[0]}`;
    const { data: cached } = await supabase.from('match_results_cache').select('match_data, last_checked_at').eq('match_description', cacheKey).single();
    
    if (cached?.match_data?.status === 'finished') {
        return cached.match_data;
    }
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (cached && new Date(cached.last_checked_at) > fiveMinutesAgo) {
        return cached.match_data;
    }

    const prompt = `Sen bir spor veri analistisin. Şu maçı analiz et: "${normalizedName}". Maç muhtemelen şu tarihte oynandı: "${new Date(date).toLocaleDateString('tr-TR')}". Tarihi kullanarak doğru maçı bulduğundan emin ol. Yanıt olarak SADECE şu JSON yapısını markdown kod bloğunda döndür: {"status": "finished" | "in_progress" | "not_found", "winner": "takım adı" | "draw" | null, "final_score": "2-1" | null, "first_half_score": "1-0" | null, "total_goals": 3 | null, "goal_scorers": ["oyuncu1"] | null}.`;
    const result = await getGeminiJsonResponse(prompt, true);
    
    if (result && typeof result.status === 'string') {
        await supabase.from('match_results_cache').upsert({ match_description: cacheKey, match_data: result, last_checked_at: new Date().toISOString() }, { onConflict: 'match_description' });
    }
    return result || { status: 'not_found' };
}

async function evaluateBet(betDesc, matchResult) {
    const prompt = `Maç sonucu: ${JSON.stringify(matchResult)}. Bahis: "${betDesc}". Sonucu analiz et. Yanıt olarak SADECE {"outcome": "won" | "lost" | "unknown"} JSON nesnesini markdown kod bloğunda döndür.`;
    return await getGeminiJsonResponse(prompt);
}