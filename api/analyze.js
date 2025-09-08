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

    // === TÜM ÖRNEKLERDEN ÖĞRENEN, JARGON SÖZLÜKLÜ NİHAİ PROMPT ===
    const prompt = `
      Sen, her türlü spor ve bahis türü (futbol, basketbol vb.) kupon formatını mükemmel anlayan, iddia diline ve jargonuna hakim bir veri çıkarma uzmanısın. Görevin, resimdeki bilgileri analiz edip istenen JSON formatında sunmaktır.

      **JARGON SÖZLÜĞÜ (Bu terimleri gördüğünde ne anlama geldiklerini bil):**
      * "1": Ev sahibi takım kazanır.
      * "2": Deplasman takımı kazanır.
      * "1x" veya "X1": Ev sahibi takım kazanır veya berabere kalır (Çifte Şans).
      * "2x" veya "X2": Deplasman takımı kazanır veya berabere kalır (Çifte Şans).
      * "İY": İlk Yarı demektir. "İY Sonucu: 1" = İlk Yarı Ev Sahibi Kazanır.
      * "KG Var" veya "İki Takım da Gol Atar: Evet": Karşılıklı Gol Var.
      * "Kazanan1": Ev sahibi takım kazanır.
      * "Deplasman": Deplasman takımı.
      * Karmaşık bahisleri olduğu gibi al, örneğin "Çifte Şans ve Toplam: 1x ve Üst (1.5)".

      **ANALİZ SÜRECİ:**
      1.  **Kuponun Yapısını Anla:** Kuponu dikkatlice incele ve temel yapısını anla (Her maça ayrı bahis mi? Tüm maçlara ortak kural mı? Kazananlar listesi mi? Tek maç çoklu şart mı? Karışık kurallar mı?).
      2.  **Maçları ve Bahisleri Eşleştir:** Tespit ettiğin yapıya ve yukarıdaki jargon sözlüğüne göre bahisleri maçlarla doğru şekilde birleştir.
          * **Karışık Kurallar Örneği:** "Çekya & Hırvatistan Kazanır, Slovenya-İsveç Maçı Karşılıklı Gol Olur" gibi bir ifadede, ilk kuralı ilk iki takıma, ikinci kuralı ise adı geçen üçüncü maça uygula.
          * **Liste Halindeki Kazananlar Örneği:** "isveç-isviçre-iskoçya / Hepsi İY Kazanır" gibi bir ifadede, listelenen tüm takımların ilk yarıyı kazanacağı bahsini her birinin kendi maçına uygula.
      3.  **Çıktıyı Formatla:** Eşleştirdiğin bahisleri "Takım A - Takım B (Yapılan Bahis)" formatında, aralarına noktalı virgül (;) koyarak birleştir. Karmaşık bahisleri virgülle ayır (Örn: Maç Sonucu: 1, 2.5 Üst).

      **İSTENEN JSON ÇIKTISI:**
      {
        "description": "Yukarıdaki analiz sürecini uygulayarak oluşturduğun nihai metin.",
        "betAmount": "Resimdeki 'Bahis Miktarı', 'Max Bahis', 'EN YÜKSEK BAHİS TUTARI' vb. anahtar kelimelerden bahis tutarını sayı olarak çıkar.",
        "odds": "Resimdeki 'TOPLAM ORAN', 'Özel Oran', 'BOMBA ORAN' vb. anahtar kelimelerden toplam oranı sayı olarak çıkar."
      }
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
