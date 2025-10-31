// Bu dosyanın adı: /api/get-match-result.js
// Bu kod, Vercel sunucusunda çalışır ve bir maçın sonucunu bulmak için Gemini'yi kullanır.
// YENİ: Sonuçları akıllı ve tarih-odaklı bir şekilde önbelleğe alma mantığı eklendi.

import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Supabase istemcisini başlat
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase ortam değişkenleri bulunamadı.");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Gemini'den gelen JSON verisinin beklenen şemaya uyup uymadığını kontrol eder.
 * @param {object} data - Gemini'den gelen JSON nesnesi.
 * @returns {object|null} - Veri geçerliyse temizlenmiş nesneyi, değilse null döndürür.
 */
function validateAndSanitize(data) {
  if (!data || typeof data.status !== 'string') {
    return null;
  }

  // Temel şema kontrolü
  const expectedFields = ['status', 'winner', 'final_score', 'first_half_score', 'total_goals', 'goal_scorers'];
  for (const field of expectedFields) {
    if (!(field in data)) {
      console.warn(`Gemini yanıtında eksik alan: ${field}`);
      return null; // Alan eksikse geçersiz say
    }
  }

  // Sadece beklenen alanları içeren temiz bir nesne döndür
  return {
    status: data.status,
    winner: data.winner,
    final_score: data.final_score,
    first_half_score: data.first_half_score,
    total_goals: data.total_goals,
    goal_scorers: data.goal_scorers,
  };
}


export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { matchDescription, matchDate } = request.body;
    
    if (!matchDescription || !matchDate) {
      return response.status(400).json({ message: 'Maç açıklaması ve tarihi gerekli.' });
    }
    
    const cacheKey = `${matchDescription}|${matchDate}`;

    // --- 1. ADIM: Önbelleği Kontrol Et ---
    const { data: cachedResult, error: cacheError } = await supabase
      .from('match_results_cache')
      .select('match_data, last_checked_at')
      .eq('match_description', cacheKey)
      .single();
      
    if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Cache okuma hatası:", cacheError);
    }

    if (cachedResult && cachedResult.match_data) {
        const matchData = cachedResult.match_data;

        // EĞER MAÇ BİTMİŞSE: Sonuç kalıcıdır. API'ye tekrar sorma, direkt önbellekten döndür.
        if (matchData.status === 'finished') {
            return response.status(200).json(matchData);
        }

        // EĞER MAÇ BİTMEMİŞSE (devam ediyor, bulunamadı vb.):
        // Kısa bir süre önce kontrol edildiyse, API'yi tekrar meşgul etme.
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const lastChecked = new Date(cachedResult.last_checked_at);
        if (lastChecked > fiveMinutesAgo) {
            return response.status(200).json(matchData);
        }
    }


    // --- 2. ADIM: Gemini'ye Sor (Önbellekte yoksa veya eski/geçici bir kayıt varsa) ---
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API anahtarı Vercel ortam değişkenlerinde bulunamadı.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Sen bir spor veri analistisin. Görevin, Google Search yeteneklerini kullanarak belirli bir spor maçı hakkında detaylı bilgi bulmak.
      
      Şu maç tanımını analiz et: "${matchDescription}"
      Bu maçın oynandığı tarih yaklaşık olarak: "${matchDate}"
      
      Bu maçla ilgili bulabildiğin en detaylı bilgileri topla. Tarihi kullanarak doğru maçı bulduğundan emin ol.
      
      Yanıt olarak SADECE ve SADECE bir markdown kod bloğu içinde aşağıdaki yapıyı içeren bir JSON nesnesi döndür. Başka hiçbir metin, açıklama veya selamlama ekleme.
      JSON nesnesi şu alanları içermelidir:
      - "status": (string) Maçın durumu. Değerleri "finished", "in_progress", "not_found", "scheduled" olabilir.
      - "winner": (string) Kazanan takımın adı. Beraberlik durumunda değer "draw" olmalı. Maç bitmediyse bu alan null olmalıdır.
      - "final_score": (string) Nihai skor (ör. "2-1", "105-98"). Maç bitmediyse null.
      - "first_half_score": (string) İlk yarı skoru. Bulunamazsa null.
      - "total_goals": (number) Maçtaki toplam gol/sayı sayısı. Bulunamazsa null.
      - "goal_scorers": (string dizisi) Gol atan oyuncuların listesi. Bulunamazsa null.
      
      Eğer bir bilgiyi bulamazsan, o alanın değerini null olarak ayarla. Maç için hiçbir bilgi bulamazsan, durumu "not_found" yap ve diğer tüm alanları null bırak.
    `;

    const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
    });
    
    const rawText = geminiResponse.text;
    let resultJson;
    
    if (rawText) {
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
        try {
            const jsonText = jsonMatch ? jsonMatch[1] : rawText;
            resultJson = JSON.parse(jsonText);
        } catch (e) {
            console.error("JSON parse hatası, ham metin:", rawText);
            resultJson = null; // Parse edilemezse null yap
        }
    } else {
        throw new Error("Gemini'den geçerli bir cevap alınamadı.");
    }
    
    const validatedData = validateAndSanitize(resultJson);
    const finalData = validatedData || { status: 'not_found', winner: null, final_score: null, first_half_score: null, total_goals: null, goal_scorers: null };


    // --- 3. ADIM: Sonucu Önbelleğe Kaydet/Güncelle ---
    const { error: upsertError } = await supabase
        .from('match_results_cache')
        .upsert({ 
            match_description: cacheKey, 
            match_data: finalData,
            last_checked_at: new Date().toISOString()
        }, { onConflict: 'match_description' });

    if (upsertError) {
        console.error("Cache yazma hatası:", upsertError);
    }
    
    // Sonucu kullanıcıya gönder
    response.status(200).json(finalData);

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}