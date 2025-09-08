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

    // === ADIM ADIM DÜŞÜNME MANTIĞI İLE YAZILMIŞ, EN GELİŞMİŞ TALİMAT ===
    const prompt = `
      Sen, bahis kuponlarındaki metinleri ve iddia jargonunu mükemmel anlayan bir uzmansın. Görevin, resimdeki bilgileri çıkarıp JSON formatında sunmak.

      ADIM ADIM DÜŞÜNEREK HAREKET ET:
      1.  **Maçları Listele:** Resimdeki tüm maçları "Takım A - Takım B" formatında bul.
      2.  **Bahisleri Bul:** Resimdeki "HIRVATİTAN - İSKOÇYA KAZANIR" veya "YUNANİSTAN - DANİMARKA MAÇI 2.5 ÜST BİTER" gibi tüm bahis kurallarını tespit et.
      3.  **Eşleştirme Yap:** 1. adımda bulduğun her maçı, 2. adımda bulduğun ilgili bahis kuralıyla eşleştir.
          * Eğer bir kural birden fazla takımı içeriyorsa (örneğin "Hırvatistan - İskoçya Kazanır"), o kuralı ilgili takımların HER BİRİNİN KENDİ maçına uygula. (Yani, Hırvatistan'ın maçına "Hırvatistan Kazanır", İskoçya'nın maçına "İskoçya Kazanır" ekle).
          * Eğer bir kural tek bir maça özgüyse (örneğin "Yunanistan - Danimarka Maçı 2.5 Üst Biter"), o kuralı sadece o maça uygula.
      4.  **Formatla:** Eşleştirdiğin her maçı "Takım A - Takım B (Uygulanan Bahis)" formatında yaz. Her birini noktalı virgül (;) ile ayırarak birleştir.

      İSTENEN JSON ÇIKTISI:
      {
        "description": "Yukarıdaki 4 adımı izleyerek oluşturduğun nihai metin. Resimde bahsi açıkça belirtilmeyen hiçbir maçı bu alana dahil ETME.",
        "betAmount": "Resimdeki 'Max Bahis', 'Tutar', 'Miktar' vb. anahtar kelimelerden bahis tutarını sayı olarak çıkar.",
        "odds": "Resimdeki 'Oran' kelimesinden toplam oranı sayı olarak çıkar.",
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
