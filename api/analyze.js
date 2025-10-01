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
    
    // Model, en güncel kararlı sürüm olan 'gemini-2.5-flash' olarak ayarlandı.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // YENİ GÖREV: Seçenek 3'e uygun olarak, çok daha detaylı bir JSON yapısı istiyoruz.
    const prompt = `
      Bu bahis kuponu resmini analiz et. Cevap olarak SADECE ve SADECE bir markdown kod bloğu içinde aşağıdaki bilgileri içeren bir JSON objesi döndür:
      1. 'matches': Her biri 'matchName' (string) ve 'bets' (o maça ait bahislerin string listesi/array'i) anahtarlarını içeren objelerden oluşan bir LİSTE.
      2. 'betAmount': Kupondaki toplam bahis miktarını içeren bir sayı.
      3. 'odds': Kupondaki toplam oranı içeren bir sayı.
      Eğer bir bilgiyi bulamazsan değeri null olsun. JSON kod bloğu dışında KESİNLİKLE hiçbir açıklama, selamlama veya ek metin yazma.
    `;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ]
      }],
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
    
    // Cevap metninin içindeki JSON'u ayıklamak için kullanılan mantık.
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

