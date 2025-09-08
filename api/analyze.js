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

    // === TÜM KUPON TÜRLERİNİ ANLAMAK İÇİN TASARLANMIŞ NİHAİ MASTER PROMPT ===
    const prompt = `
      Sen, her türlü spor ve bahis türü (futbol, basketbol vb.) kupon formatını mükemmel anlayan, iddia diline ve jargonuna hakim bir veri çıkarma uzmanısın. Görevin, resimdeki bilgileri analiz edip istenen JSON formatında sunmaktır.

      ANALİZ SÜRECİ:
      1.  **Kuponun Yapısını Anla:** Kuponu dikkatlice incele ve aşağıdaki temel yapılardan hangisine uyduğunu tespit et:
          * **Yapı A (Her Maça Ayrı Bahis):** Her maçın bahsi kendi yanında veya altında mı belirtilmiş? ("Maç Sonucu: 1", "2.5 ÜST" gibi)
          * **Yapı B (Tüm Maçlara Ortak Kural):** Tüm maçlar için geçerli tek bir kural mı var? ("Tüm Maçlar Karşılıklı Gol Olur", "Maçlarda İlk Yarı 1.5 Üst Olur" gibi)
          * **Yapı C (Kazananlar Listesi):** Maçlar listelenmiş ve ayrı bir yerde kazanan takımlar mı belirtilmiş? ("Almanya, Hollanda, Belçika Kazanır" gibi). Bu listeye bazen "ve Maçlar 3.5 Üst Olur" gibi ek bir genel kural eşlik edebilir.
          * **Yapı D (Tek Maç, Çoklu Şart / Bet Builder):** Tek bir maç için birden fazla şart mı sıralanmış? ("İtalya Kazanır, 3.5 Üst, Retegui Gol Atar" gibi)
          * **Yapı E (Karışık Kurallar):** Bazı maçlara özel bahisler atanırken, belirli başka maçlara VEYA geri kalan tüm maçlara farklı bir kural mı uygulanıyor? (Örn: "Çekya & Hırvatistan Kazanır, Slovenya-İsveç ve Danimarka-İskoçya Maçları Karşılıklı Gol Olur")

      2.  **Maçları ve Bahisleri Eşleştir:** Tespit ettiğin yapıya göre bahisleri maçlarla doğru şekilde birleştir.
          * "Maç Sonucu: 1" ev sahibi kazanır, "Maç Sonucu: 2" deplasman takımı kazanır demektir.
          * "Karşılıklı Gol Olur" veya "KG Var" gibi ifadeleri doğru yorumla.
          * Karmaşık kuralları dikkatlice ayır ve ilgili maçlara ata. Örneğin "Çekya & Hırvatistan Kazanır" kuralından Çekya ve Hırvatistan'a "Kazanır" bahsi ata. "Slovenya-İsveç ve Danimarka-İskoçya Maçları Karşılıklı Gol Olur" kuralından bu iki maça "Karşılıklı Gol Olur" bahsi ata.

      3.  **Çıktıyı Formatla:** Eşleştirdiğin bahisleri "Takım A - Takım B (Yapılan Bahis)" formatında, aralarına noktalı virgül (;) koyarak birleştir.

      İSTENEN JSON ÇIKTISI:
      {
        "description": "Yukarıdaki analiz sürecini uygulayarak oluşturduğun nihai metin.",
        "betAmount": "Resimdeki 'Max Bahis', 'Maksimum bahis', 'Tutar', 'EN YÜKSEK BAHİS TUTARI' vb. anahtar kelimelerden bahis tutarını sayı olarak çıkar.",
        "odds": "Resimdeki 'Oran', 'Özel Oran', 'KATI' vb. anahtar kelimelerden toplam oranı sayı olarak çıkar."
      }

      Eğer bir bilgiyi bulamazsan değeri null olsun.
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
