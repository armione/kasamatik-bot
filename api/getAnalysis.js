// Dosya Adı: /api/getAnalysis.js
// Bu fonksiyon, bahis verilerini alıp Gemini'ye analiz ettirir.

export default async function handler(request, response) {
  // Sadece POST metoduyla gelen istekleri kabul et
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { bets } = request.body;

    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return response.status(400).json({ message: 'Analiz için bahis verisi gerekli.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API anahtarı Vercel ortam değişkenlerinde bulunamadı.");
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Gemini'ye gönderilecek talimat (prompt)
    const prompt = `
      Sen bir profesyonel bahis analistisin. Sana bir kullanıcının bahis verilerini JSON formatında vereceğim. 
      Bu verileri analiz et ve kullanıcıya performansı hakkında kısa, anlaşılır ve eyleme geçirilebilir 3-4 maddelik bir özet sun. 
      Analizinde şu noktalara odaklan: en karlı platform, en başarılı/başarısız bahis türü, en iyi/kötü oran aralığı ve genel bir tavsiye. 
      Cevabını Markdown formatında, her maddeyi bir emoji ile başlatarak ver.
      İşte kullanıcının bahis verileri: ${JSON.stringify(bets)}
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

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
    const analysisText = result.candidates[0].content.parts[0].text;
    
    // Analiz sonucunu siteye geri gönder
    response.status(200).json({ analysis: analysisText });

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Analiz alınırken sunucuda bir hata oluştu.', error: error.message });
  }
}
