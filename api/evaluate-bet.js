// Bu dosyanın adı: /api/evaluate-bet.js
// Bu kod, bir maç sonucu ve bir bahis açıklaması alarak bahsin kazanıp kazanmadığını değerlendirir.

import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { betDescription, matchResult } = request.body;
    
    if (!betDescription || !matchResult) {
      return response.status(400).json({ message: 'Bahis açıklaması ve maç sonucu gerekli.' });
    }

    // FIX: Switched from `process.env.GEMINI_API_KEY` to `process.env.API_KEY` to adhere to API key guidelines.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API anahtarı Vercel ortam değişkenlerinde bulunamadı.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Sen bir spor bahsi uzmanısın. Görevin, verilen detaylı maç sonuçlarına göre bir bahsin kazanıp kazanmadığını belirlemek.
      
      İşte maçın detaylı sonuçları (JSON formatında):
      ${JSON.stringify(matchResult, null, 2)}
      
      İşte kullanıcının bahsi:
      "${betDescription}"
      
      Bu bilgilere dayanarak, kullanıcının bahsinin sonucunu analiz et. Özellikle şunlara dikkat et:
      - "2.5 Üstü/Altı" gibi bahisler için 'total_goals' alanını kullan.
      - "İlk Yarı" veya "İY" ile ilgili bahisler için 'first_half_score' alanını kullan.
      - "X oyuncu gol atar" gibi bahisler için 'goal_scorers' listesini kontrol et.
      - Maç sonucu bahisleri için 'winner' alanını kullan.
      
      Yanıt olarak SADECE ve SADECE bir markdown kod bloğu içinde aşağıdaki yapıyı içeren bir JSON nesnesi döndür. Başka hiçbir metin, açıklama veya selamlama ekleme.
      JSON nesnesi şu alanı içermelidir:
      - "outcome": Bir string. Değerleri "won" (kazandı), "lost" (kaybetti), veya "unknown" (elindeki verilerle bahsi sonuçlandırmak için yeterli bilgi yoksa) olabilir.
    `;

    const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const rawText = geminiResponse.text;
    if (!rawText) {
        // Gemini'den boş cevap gelirse 'unknown' olarak kabul et
        return response.status(200).json({ outcome: 'unknown' });
    }

    let parsedJson;
    try {
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : rawText;
        parsedJson = JSON.parse(jsonText);
        // Doğrulama: Gelen JSON'da 'outcome' alanı var mı?
        if (typeof parsedJson.outcome !== 'string') {
            parsedJson = { outcome: 'unknown' };
        }
    } catch (e) {
        console.error('Bet evaluation JSON parse hatası, ham metin:', rawText);
        // Hata durumunda güvenli bir şekilde 'unknown' döndür
        parsedJson = { outcome: 'unknown' };
    }
    
    response.status(200).json(parsedJson);

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}