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
    
    // Model versiyonu "gemini-1.5-flash-latest" olarak kullanılıyor.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    // GÜNCELLENMİŞ "KURŞUN GEÇİRMEZ" TALİMAT:
    const prompt = `
      Sen, bahis kuponlarındaki verileri çıkarmak için eğitilmiş uzman bir veri çıkarma botusun. Görevin, sağlanan kupon resmini analiz etmek ve aşağıdaki kurallara harfiyen uyarak bir JSON nesnesi döndürmektir:

      1.  **Kupon Bilgileri (JSON Alanları):**
          * `description`: Kupondaki tüm maçları veya ana bahis tanımını içeren metin.
          * `betAmount`: Sayı olarak bahis miktarı.
          * `odds`: Sayı olarak toplam oran.
          * `analysis`: Kupon için kısa bir risk analizi.

      2.  **Veri Çıkarma Kuralları (ÇOK ÖNEMLİ):**
          * **'betAmount' (Bahis Miktarı) için:** SADECE "Miktar", "Tutar", "Yatırım", "Bahis Tutarı" gibi etiketlere sahip ve para birimi (₺, $, €) içeren sayıları ara. "Çekim Limiti", "Bonus", "x KATI" gibi metinleri ve promosyonel rakamları KESİNLİKLE 'betAmount' olarak alma. Eğer bu etiketlere sahip net bir bahis miktarı yoksa, değeri KESİNLİKLE null olarak ayarla.
          * **'odds' (Oran) için:** ÖNCELİKLE "Oran" veya "Toplam Oran" etiketli sayıları ara. Eğer etiket yoksa ve 100'den büyük bir sayı (örneğin 1000, 2500.00 gibi) varsa, bu sayıyı 'odds' olarak kabul et.
          * **'analysis' (Analiz):** Kupondaki takımlara/oyunculara bakarak 2-3 maddelik kısa ve net bir risk analizi yap.

      Bu kurallara göre resmi analiz et ve sonucu tek bir JSON objesi olarak döndür.
    `;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "description": { "type": "STRING" },
            "betAmount": { "type": "NUMBER" },
            "odds": { "type": "NUMBER" },
            "analysis": { "type": "STRING" }
          }
        }
      }
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
    const jsonText = result.candidates[0].content.parts[0].text;
    
    // Sonucu sitenize geri gönder
    response.status(200).json(JSON.parse(jsonText));

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}
