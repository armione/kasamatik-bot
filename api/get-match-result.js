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
      Sen bir spor veri analistisin. Görevin, arama yeteneklerini kullanarak belirli bir spor maçının sonucunu bulmak.
      
      Şu maç tanımını analiz et: "${matchDescription}"
      
      Bu maçın nihai sonucunu bul.
      
      Yanıt olarak SADECE ve SADECE bir markdown kod bloğu içinde aşağıdaki yapıyı içeren bir JSON nesnesi döndür. Başka hiçbir metin, açıklama veya selamlama ekleme.
      JSON nesnesi şu alanları içermelidir:
      - "status": Bir string. Değerleri "finished" (bitti), "in_progress" (devam ediyor), "not_found" (bulunamadı) veya "scheduled" (planlandı) olabilir.
      - "winner": Kazanan takımın adını içeren bir string. Beraberlik durumunda değer "draw" olmalı. Maç bitmediyse bu alan null olmalıdır.
      - "score": Nihai skoru temsil eden bir string (ör. "2-1", "105-98"). Maç bitmediyse bu alan null olmalıdır.
      
      Maç için kesin bir sonuç bulamazsan, durumu "not_found" olarak ayarla ve diğer alanları null yap.
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
