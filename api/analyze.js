// Bu dosyanın adı /api/analyze.js
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

    // === ZAMAN ARALIĞI BAHİSLERİ İÇİN GELİŞTİRİLMİŞ NİHAİ PROMPT ===
    const prompt = `
      Sen, bir bahis kuponundan veri çıkaran bir uzmansın. Görevin, resimdeki maçları ve bahisleri analiz ederek istenen JSON formatında, olabildiğince hızlı bir şekilde cevap vermektir.

      **KURALLAR:**
      1.  **description:** Maçları ve bahisleri "Takım A - Takım B (Yapılan Bahis)" formatında birleştir. Her birini noktalı virgül (;) ile ayır.
          * **Genel Kurallar:** "Tüm Maçlar 2.5 Üst" veya "0.15 Dakikalar Arası 0.5 ÜST" gibi bir ifade varsa, bu bahsin tamamını listedeki TÜM maçlara uygula.
          * **Liste Kuralları:** "İsveç, İtalya, İsviçre Kazanır" gibi bir ifade varsa, her takıma kendi maçında "Kazanır" bahsi ata. Eğer ifade "Hepsi İY Kazanır" şeklinde ise, her takıma "İY Kazanır" (İlk Yarı Kazanır) bahsini ata.
          * **Karmaşık Kurallar:** "Hırvatistan Kazanır, 3.5 Üst, Kramaric Gol Atar" gibi tek maça ait çoklu bahisleri virgülle ayırarak aynı parantez içine yaz.
          * **Karışık Kurallar:** "Yunanistan ve İtalya Kazanır/ Diğerleri 2.5 Üst" gibi ifadelerde, ilk kuralı ilgili takımlara, ikinci kuralı ise geriye kalan maçlara uygula.
          * **Jargon:** "1" = Ev Sahibi Kazanır, "2" = Deplasman Kazanır, "İY" = İlk Yarı, "KG Var" = Karşılıklı Gol Var.
      2.  **betAmount:** Resimdeki 'Bahis Miktarı', 'Max Bahis' gibi ifadelerden tutarı sayı olarak çıkar.
      3.  **odds:** Resimdeki 'Toplam Oran', 'Özel Oran', 'BOMBA ORAN' gibi ifadelerden oranı sayı olarak çıkar.

      Sadece istenen JSON objesini, başka hiçbir ek metin olmadan döndür.
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
            "odds": { "type": "NUMBER" }
          }
        }
      }
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
    const jsonText = result.candidates[0].content.parts[0].text;
    
    response.status(200).json(JSON.parse(jsonText));

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error);
    response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}
