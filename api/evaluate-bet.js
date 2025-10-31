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

    const apiKey = process.env.GEMINI_API_KEY;
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
        throw new Error("Gemini'den geçerli bir cevap alınamadı.");
    }

    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);

    if (!jsonMatch || !jsonMatch[1]) {
        try {
            const parsed = JSON.parse(rawText);
            return response.status(200).json(parsed);
        } catch(e) {
             throw new Error("API'den gelen cevap ayrıştırılamadı. Ham cevap: " + rawText);
        }
    }
    
    const jsonText = jsonMatch[1];
    
    response.status(200).json(JSON.parse(jsonText));

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}