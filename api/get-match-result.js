// Bu dosyanın adı: /api/get-match-result.js
// Bu kod, Vercel sunucusunda çalışır ve bir maçın sonucunu bulmak için Gemini'yi kullanır.

import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { matchDescription } = request.body;
    
    if (!matchDescription) {
      return response.status(400).json({ message: 'Maç açıklaması gerekli.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API anahtarı Vercel ortam değişkenlerinde bulunamadı.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Sen bir spor veri analistisin. Görevin, Google Search yeteneklerini kullanarak belirli bir spor maçı hakkında detaylı bilgi bulmak.
      
      Şu maç tanımını analiz et: "${matchDescription}"
      
      Bu maçla ilgili bulabildiğin en detaylı bilgileri topla.
      
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
    if (!rawText) {
        throw new Error("Gemini'den geçerli bir cevap alınamadı.");
    }

    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);

    if (!jsonMatch || !jsonMatch[1]) {
        console.error("API'den gelen cevapta JSON bulunamadı:", rawText);
        // Gemini bazen markdown olmadan sadece JSON döndürebilir, bu durumu da kontrol edelim.
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