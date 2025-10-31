// Bu dosyanın adı: /api/parse-coupon.js
// Bu kod, Vercel sunucusunda çalışır ve kombine kuponları ayrıştırmak için Gemini'yi kullanır.

import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { couponDescription } = request.body;
    
    if (!couponDescription) {
      return response.status(400).json({ message: 'Kupon açıklaması gerekli.' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY ortam değişkeni bulunamadı.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Bu kombine bahis kuponu açıklamasını analiz et ve her bir maçı ayrı bir eleman olarak içeren bir JSON dizisi oluştur.
      Açıklama: "${couponDescription}"
      
      Örneğin, "Maç A (Bahis A) / Maç B (Bahis B)" açıklaması için ["Maç A (Bahis A)", "Maç B (Bahis B)"] şeklinde bir sonuç döndür.
      
      Yanıt olarak SADECE ve SADECE bu JSON dizisini içeren bir markdown kod bloğu döndür. Başka hiçbir metin veya açıklama ekleme.
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