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

    // === İDDİA DİLİNE HAKİM, GELİŞTİRİLMİŞ TALİMAT ===
    const prompt = `
      Sen, karmaşık bahis kuponlarını ve iddia dilini hatasız okuyan bir veri çıkarma uzmanısın. Sana gönderilen kupon resmini analiz et ve aşağıdaki formatta, tek bir JSON objesi olarak cevap ver:

      'description': Senin görevin, kupondaki bahisleri en doğru şekilde tek bir açıklama metnine dönüştürmek.
      1.  Öncelikle kuponda listelenen TÜM maçları (örneğin, "Takım A - Takım B") tespit et.
      2.  Ardından, bu maçlarla ilgili olan "HIRVATİSTAN - İSKOÇYA KAZANIR" veya "YUNANİSTAN - DANİMARKA MAÇI 2.5 ÜST BİTER" gibi özel bahis açıklamalarını bul. Bunlar iddia jargonudur ve doğru yorumlanmalıdır.
      3.  Tespit ettiğin maçlar ile özel bahis açıklamalarını DİKKATLİCE eşleştir. Örneğin, "Hırvatistan - İskoçya Kazanır" gibi bir ifade varsa, bu bahsi hem Hırvatistan'ın kendi maçı için ("Hırvatistan Kazanır" olarak) hem de İskoçya'nın kendi maçı için ("İskoçya Kazanır" olarak) geçerli kabul et.
      4.  Sonuç olarak, her bir bahsi "Takım A - Takım B (Yapılan Bahis)" formatında, aralarına noktalı virgül (;) koyarak tek bir metin olarak birleştir. Eğer bir maç için özel bir bahis açıklaması bulamazsan, o maçı çıktıya dahil etme. Sadece resimde AÇIKÇA belirtilen bahisleri ve takımları kullan.
      
      'betAmount': "Bahis Tutarı", "Miktar", "Yatırılan", "Tutar" veya "Max Bahis" gibi anahtar kelimeleri arayarak bahis miktarını sayı olarak çıkar.
      
      'odds': "Oran" veya "Toplam Oran" kelimelerini arayarak toplam oranı sayı olarak çıkar.
      
      Bir bilgiyi bulamazsan değeri null olsun.
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
