// Bu dosyanın adı: /api/admin-result-special-odds.js
// Sadece admin tarafından tetiklenebilen, bekleyen özel oranları analiz eden fonksiyon.

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

// --- Gerekli İstemcileri Başlat ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
// FIX: Switched from `process.env.GEMINI_API_KEY` to `process.env.API_KEY` to adhere to API key guidelines.
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
        // --- 1. ADIM: Bekleyen Özel Oranları Bul ---
        const { data: pendingOdds, error: fetchError } = await supabase
            .from('special_odds')
            .select('*')
            .eq('status', 'pending');

        if (fetchError) {
            throw new Error(`Özel oranlar çekilirken hata: ${fetchError.message}`);
        }

        if (!pendingOdds || pendingOdds.length === 0) {
            return response.status(200).json({ proposals: [], message: 'Analiz edilecek bekleyen özel oran bulunmuyor.' });
        }

        const proposals = [];

        // --- 2. ADIM: Her Bir Özel Oranı Analiz Et ---
        for (const odd of pendingOdds) {
            let finalOutcome = 'pending';
            try {
                // Her bahis için aynı manuel süreçleri uygula
                const matches = await parseCoupon(odd.description);
                
                const matchResults = await Promise.all(
                    matches.map(matchDesc => getMatchResult(matchDesc)) // Özel oranların tarihi olmadığı için sadece açıklama ile arama yapıyoruz.
                );

                const evaluations = await Promise.all(
                    matchResults.map((result, index) => {
                        if (result.status !== 'finished') {
                            return { outcome: 'pending' };
                        }
                        return evaluateBet(matches[index], result);
                    })
                );
                
                // Kuponun nihai sonucunu belirle
                let couponOutcome = 'won';
                if (evaluations.some(e => e.outcome === 'lost')) {
                    couponOutcome = 'lost';
                } else if (evaluations.some(e => e.outcome === 'pending' || e.outcome === 'unknown')) {
                    couponOutcome = 'pending';
                }
                finalOutcome = couponOutcome;

            } catch (error) {
                console.error(`Özel Oran ID ${odd.id} işlenirken bir hata oluştu:`, error.message);
                finalOutcome = 'pending'; // Hata durumunda beklemeye devam et
            }

            proposals.push({
                id: odd.id,
                description: odd.description,
                platform: odd.platform,
                odds: odd.odds,
                proposedStatus: finalOutcome
            });
        }

        return response.status(200).json({ proposals });

    } catch (error) {
        console.error('Özel oran analiz fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}


// --- Yardımcı Fonksiyonlar (auto-result-bets.js'den uyarlanmıştır) ---

async function getGeminiJsonResponse(prompt, useGoogleSearch = false) {
    const config = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};
    // FIX: Corrected the model name from `gem-2.5-flash` to `gemini-2.5-flash`.
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config });
    const rawText = response.text;
    if (!rawText) throw new Error("Gemini'den boş cevap geldi.");

    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    try {
        const jsonText = jsonMatch ? jsonMatch[1] : rawText;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON parse hatası. Ham metin:", rawText);
        throw new Error("Gemini'den gelen cevap JSON formatında değil.");
    }
}

async function parseCoupon(couponDescription) {
    const prompt = `Bu kombine bahis kuponu açıklamasını analiz et ve her bir maçı ayrı bir eleman olarak içeren bir JSON dizisi oluştur. Açıklama: "${couponDescription}". Yanıt olarak SADECE ve SADECE bu JSON dizisini içeren bir markdown kod bloğu döndür.`;
    return await getGeminiJsonResponse(prompt);
}

async function getMatchResult(matchDescription) {
    // Özel oranlar genelde güncel olduğu için cache'i daha agresif kullanabiliriz.
    const cacheKey = `${matchDescription}|${new Date().toISOString().split('T')[0]}`; // Tarihsiz olduğu için bugünün tarihiyle cache'le
    
    const { data: cachedResult } = await supabase.from('match_results_cache').select('match_data').eq('match_description', cacheKey).single();
    if (cachedResult && cachedResult.match_data?.status === 'finished') {
        return cachedResult.match_data;
    }

    const prompt = `Sen bir spor veri analistisin. Şu maç tanımını analiz et: "${matchDescription}". Bu maç büyük ihtimalle bugün veya dün oynandı. Yanıt olarak SADECE bir markdown kod bloğu içinde şu yapıyı içeren bir JSON nesnesi döndür: {"status": "finished" | "in_progress" | "not_found", "winner": "takım adı" | "draw" | null, "final_score": "2-1" | null, "first_half_score": "1-0" | null, "total_goals": 3 | null, "goal_scorers": ["oyuncu1", "oyuncu2"] | null}.`;
    const resultJson = await getGeminiJsonResponse(prompt, true);
    
    if (resultJson?.status === 'finished') { // Sadece bitmişleri cache'le
        await supabase.from('match_results_cache').upsert({ match_description: cacheKey, match_data: resultJson, last_checked_at: new Date().toISOString() }, { onConflict: 'match_description' });
    }
    return resultJson || { status: 'not_found' };
}

async function evaluateBet(betDescription, matchResult) {
    const prompt = `Sen bir spor bahsi uzmanısın. Maç sonucu: ${JSON.stringify(matchResult)}. Kullanıcının bahsi: "${betDescription}". Bu bahsin sonucunu analiz et. Yanıt olarak SADECE bir markdown kod bloğu içinde {"outcome": "won" | "lost" | "unknown"} JSON nesnesi döndür.`;
    return await getGeminiJsonResponse(prompt);
}