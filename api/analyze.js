// Bu dosyanın adı: /api/analyze.js
// Bu kod, Vercel sunucusunda çalışır ve API anahtarınızı gizli tutar.

export default async function handler(request, response) {
  // Sadece POST metoduyla gelen istekleri kabul et
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    // Sitenizden gönderilen resim verisini al
    const { base64ImageData } = request.body;
    
    if (!base64ImageData) {
      return response.status(400).json({ message: 'Resim verisi gerekli.' });
    }

    // Vercel'e gizli olarak eklediğiniz API anahtarını güvenli bir şekilde al
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API anahtarı Vercel ortam değişkenlerinde bulunamadı.");
    }
    
    // HATA DÜZELTMESİ: Model, daha kararlı olan 'gemini-pro-vision' olarak değiştirildi.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

    // HATA DÜZELTMESİ: gemini-pro-vision modeliyle daha uyumlu bir talimat (prompt) hazırlandı.
     const prompt = `
      Bu bahis kuponu resmini analiz et ve SADECE aşağıdaki bilgileri içeren bir JSON objesi döndür:
      1. 'description': Kupondaki tüm maçları ve bahisleri içeren tek bir metin.
      2. 'betAmount': Kupondaki toplam bahis miktarını içeren bir sayı.
      3. 'odds': Kupondaki toplam oranı içeren bir sayı.
      Bir bilgiyi bulamazsan değeri null olsun. Ekstra açıklama veya metin ekleme.
    `;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ]
      }],
      // Not: generationConfig, gemini-pro-vision için kaldırıldı ve prompt içine eklendi.
    };

    // Google Gemini API'sine güvenli isteği gönder
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Hatası:", errorBody);
      throw new Error(`API isteği başarısız oldu: ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();
    
    // HATA DÜZELTMESİ: Cevap metninin içindeki JSON'u ayıklamak için yeni mantık eklendi.
    const rawText = result.candidates[0].content.parts[0].text;
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);

    if (!jsonMatch || !jsonMatch[1]) {
        console.error("API'den gelen cevapta JSON bulunamadı:", rawText);
        throw new Error("API'den gelen cevap ayrıştırılamadı.");
    }
    
    const jsonText = jsonMatch[1];
    
    // Sonucu sitenize geri gönder
    response.status(200).json(JSON.parse(jsonText));

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}

