// Bu dosyanın adı: /api/auto-result-bets.js
// Bu kod, Vercel sunucusunda çalışır ve bir Cron Job tarafından tetiklenir.
// Amacı: Bekleyen ve zamanı gelmiş tüm bahisleri otomatik olarak sonuçlandırmak.

import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

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
    // Cron Job güvenliği için secret key kontrolü
    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
        return response.status(401).json({ message: 'Yetkisiz Erişim.' });
    }

    try {
        // --- 1. ADIM: Sonuçlandırılacak Bahisleri Bul ---
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        const { data: betsToProcess, error: fetchError } = await supabase
            .from('bets')
            .select('*')
            .eq('status', 'pending')
            .eq('bet_type', 'Özel Oran', false) // Özel oranları hariç tut
            .lte('date', new Date().toISOString().split('T')[0]) // Bugünden ve geçmişten olanlar
            .filter('created_at', 'lte', threeHoursAgo); // Maçın bitmesi için zaman tanı

        if (fetchError) {
            throw new Error(`Bahisler çekilirken hata: ${fetchError.message}`);
        }

        if (!betsToProcess || betsToProcess.length === 0) {
            return response.status(200).json({ message: 'Sonuçlandırılacak yeni bahis bulunmuyor.' });
        }

        let updatedCount = 0;

        // --- 2. ADIM: Her Bahsi Döngüye Al ve İşle ---
        for (const bet of betsToProcess) {
            try {
                // Her bahis için aynı manuel süreçleri uygula
                const matches = await parseCoupon(bet.description);
                
                const matchResults = await Promise.all(
                    matches.map(matchDesc => getMatchResult(matchDesc, bet.date))
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
                let finalCouponOutcome = 'won';
                if (evaluations.some(e => e.outcome === 'lost')) {
                    finalCouponOutcome = 'lost';
                } else if (evaluations.some(e => e.outcome === 'pending' || e.outcome === 'unknown')) {
                    finalCouponOutcome = 'pending';
                }

                // --- 3. ADIM: Sonuç Netse Veritabanını Güncelle ---
                if (finalCouponOutcome === 'won' || finalCouponOutcome === 'lost') {
                    const win_amount = finalCouponOutcome === 'won' ? bet.bet_amount * bet.odds : 0;
                    const profit_loss = win_amount - bet.bet_amount;

                    const { error: updateError } = await supabase
                        .from('bets')
                        .update({ status: finalCouponOutcome, win_amount, profit_loss })
                        .eq('id', bet.id);

                    if (updateError) {
                        console.error(`Bahis ID ${bet.id} güncellenirken hata:`, updateError.message);
                    } else {
                        updatedCount++;
                    }
                }

            } catch (error) {
                console.error(`Bahis ID ${bet.id} işlenirken bir hata oluştu:`, error.message);
                // Bir bahis hata verirse diğerlerini etkilemeden devam et
                continue;
            }
        }

        return response.status(200).json({ 
            message: 'Otomatik sonuçlandırma tamamlandı.',
            processed: betsToProcess.length,
            updated: updatedCount 
        });

    } catch (error) {
        console.error('Otomatik sonuçlandırma ana fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}


// --- Yardımcı Fonksiyonlar (Diğer API dosyalarından uyarlanmıştır) ---

async function parseCoupon(couponDescription) {
    const prompt = `Bu kombine bahis kuponu açıklamasını analiz et ve her bir maçı ayrı bir eleman olarak içeren bir JSON dizisi oluştur. Açıklama: "${couponDescription}". Yanıt olarak SADECE ve SADECE bu JSON dizisini içeren bir markdown kod bloğu döndür.`;
    const result = await getGeminiJsonResponse(prompt);
    if (!Array.isArray(result)) return [couponDescription]; // Fallback
    return result;
}

async function getMatchResult(matchDescription, matchDate) {
    const cacheKey = `${matchDescription}|${matchDate}`;
    const { data: cachedResult } = await supabase.from('match_results_cache').select('match_data').eq('match_description', cacheKey).single();
    if (cachedResult && cachedResult.match_data?.status === 'finished') {
        return cachedResult.match_data;
    }

    const prompt = `Sen bir spor veri analistisin. Şu maç tanımını analiz et: "${matchDescription}". Bu maçın oynandığı tarih yaklaşık olarak: "${matchDate}". Yanıt olarak SADECE bir markdown kod bloğu içinde şu yapıyı içeren bir JSON nesnesi döndür: {"status": "finished" | "in_progress" | "not_found", "winner": "takım adı" | "draw" | null, "final_score": "2-1" | null, "first_half_score": "1-0" | null, "total_goals": 3 | null, "goal_scorers": ["oyuncu1", "oyuncu2"] | null}.`;
    const resultJson = await getGeminiJsonResponse(prompt, true); // googleSearch=true
    
    if (resultJson) {
        await supabase.from('match_results_cache').upsert({ match_description: cacheKey, match_data: resultJson, last_checked_at: new Date().toISOString() }, { onConflict: 'match_description' });
    }
    return resultJson;
}

async function evaluateBet(betDescription, matchResult) {
    const prompt = `Sen bir spor bahsi uzmanısın. Maç sonucu: ${JSON.stringify(matchResult)}. Kullanıcının bahsi: "${betDescription}". Bu bahsin sonucunu analiz et. Yanıt olarak SADECE bir markdown kod bloğu içinde {"outcome": "won" | "lost" | "unknown"} JSON nesnesi döndür.`;
    return await getGeminiJsonResponse(prompt);
}


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
        console.error("JSON parse hatası. Ham metin:", rawText);
        throw new Error("Gemini'den gelen cevap JSON formatında değil.");
    }
}