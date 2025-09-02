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

    // GÜNCELLENMİŞ "UZUN TALİMAT": Kullanıcının istediği spesifik formatta analiz yapacak.
    const prompt = `
      Sen, veriye dayalı analizler yapan profesyonel bir bahis yorumcususun. Sana gönderilen kupon resmini analiz et ve aşağıdaki formatta, tek bir JSON objesi olarak cevap ver:

      1.  **Kupon Bilgileri:** Resimden 'description', 'betAmount' ve 'odds' bilgilerini çıkar. Bir bilgiyi bulamazsan değeri null olsun.
      
      2.  **Detaylı Risk Analizi ('analysis'):**
          * İlk olarak kupon hakkında "Dürüst olayım: ..." gibi genel bir giriş yap.
          * Ardından "🔎 Kısa analiz:" başlığı altında, kupondaki HER BİR maçı OK İŞARETİ (→) kullanarak ayrı ayrı değerlendir.
          * Her maç için, kendi bilgine dayanarak TAHMİNİ BİR KAZANMA YÜZDESİ (%xx ihtimal) belirt.
          * Yüzdenin yanına "çok güvenilir", "en riskli parçalardan biri", "çiftlerde sürpriz çok olur" gibi kısa, net ve cesur yorumlar ekle.
          * Tüm metni tek bir string olarak 'analysis' alanına ekle.
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
        // JSON ŞEMASI: 'analysis' alanı dahil.
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
