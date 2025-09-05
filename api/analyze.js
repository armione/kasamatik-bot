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

    // GÜNCELLENMİŞ VE DAHA AKILLI TALİMAT
    const prompt = `
      Sen, bahis kuponlarındaki metinleri hatasız okuyan bir veri çıkarma uzmanısın. Sana gönderilen kupon resmini analiz et ve aşağıdaki formatta, tek bir JSON objesi olarak cevap ver:

      1.  **Kupon Bilgileri ('description', 'betAmount', 'odds'):**
          * **Önce kupona bütün olarak bak ve TÜM MAÇLAR için geçerli ORTAK bir bahis türü var mı diye kontrol et** (örneğin "Karşılaşmalarda İlk Yarı 1.5 Üst Olur" gibi).
          * 'description': Kupondaki maçları "Takım A - Takım B (Yapılan Bahis)" formatında, her bir maçı noktalı virgül (;) ile ayırarak listele. Eğer resimde ortak bir bahis türü bulduysan, HER MAÇIN sonuna o bahsi ekle. Eğer her maçın kendi bahsi varsa, onu ekle. Resimde açıkça belirtilmeyen bir bahis türünü (örneğin "MS 1") ASLA kendin tahmin etme. Sadece resimde ne yazıyorsa onu çıkar.
          * 'betAmount': "Bahis Tutarı", "Miktar", "Yatırılan" veya "Tutar" gibi anahtar kelimeleri arayarak toplam bahis miktarını sayı olarak çıkar.
          * 'odds': Toplam oranı sayı olarak çıkar.
          * Bir bilgiyi bulamazsan değeri null olsun.
      
      2.  **Detaylı Risk Analizi ('analysis'):**
          * Kupon hakkında kısa ve dürüst bir giriş yap.
          * Ardından kupondaki HER BİR maçı, kendi bilgine dayanarak TAHMİNİ BİR KAZANMA YÜZDESİ (%xx ihtimal) ile birlikte ayrı ayrı değerlendir.
          * Yorumlarını kısa, net ve cesur bir dille yap.
          * Tüm metni, başlıkları kalın (bold) yapacak şekilde, tek bir string olarak 'analysis' alanına ekle.
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
