// Bu dosyanın adı /api/analyze.js
// Bu kod, Vercel sunucusunda çalışır ve API anahtarlarınızı gizli tutar.

// --- BİRİNCİL VE YEDEK API FONKSİYONLARI ---

// 1. Google Gemini API Çağrısı
async function callGeminiApi(base64ImageData, apiKey, prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
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

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Hatası: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    return JSON.parse(jsonText);
}

// 2. OpenAI (GPT-5 nano) API Çağrısı (Yedek)
async function callOpenAiApi(base64ImageData, apiKey, prompt) {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const payload = {
        // ----> İSTEĞİNİZE GÖRE MODEL GÜNCELLENDİ <----
        model: "gpt-5-nano", 
        // ---------------------------------------------
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: prompt
            },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64ImageData}`
                        }
                    }
                ]
            }
        ]
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API Hatası: ${response.status} - ${errorBody}`);
    }
    
    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
}


// --- ANA SUNUCU FONKSİYONU ---

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }

    try {
        const { base64ImageData } = request.body;
        if (!base64ImageData) {
            return response.status(400).json({ message: 'Resim verisi gerekli.' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        const openAiApiKey = process.env.OPENAI_API_KEY;

        if (!geminiApiKey || !openAiApiKey) {
            throw new Error("Gerekli API anahtarları (GEMINI_API_KEY ve OPENAI_API_KEY) Vercel ortam değişkenlerinde bulunamadı.");
        }

        const prompt = `
          Sen, bir bahis kuponundan veri çıkaran bir uzmansın. Görevin, resimdeki maçları ve bahisleri analiz ederek istenen JSON formatında, olabildiğince hızlı bir şekilde cevap vermektir.

          **KURALLAR:**
          1.  **description:** Maçları ve bahisleri "Takım A - Takım B (Yapılan Bahis)" formatında birleştir. Her birini noktalı virgül (;) ile ayır.
          2.  **betAmount:** Resimdeki 'Bahis Miktarı', 'Max Bahis' gibi ifadelerden tutarı sayı olarak çıkar.
          3.  **odds:** Resimdeki 'Toplam Oran', 'Özel Oran', 'BOMBA ORAN' gibi ifadelerden oranı sayı olarak çıkar.

          **JARGON:**
          * "1" = Ev Sahibi Kazanır, "2" = Deplasman Kazanır, "İY" = İlk Yarı, "KG Var" = Karşılıklı Gol Var.
          * "Hepsi İY Kazanır" gibi ifadelerde, her takıma "İY Kazanır" bahsini ata.
          
          Sadece istenen { "description": "...", "betAmount": ..., "odds": ... } JSON objesini, başka hiçbir ek metin olmadan döndür.
        `;

        let result;
        try {
            // Önce Gemini'yi dene
            console.log("Birincil API deneniyor: Gemini");
            result = await callGeminiApi(base64ImageData, geminiApiKey, prompt);
            
        } catch (geminiError) {
            console.warn("Gemini API hatası, yedek API'ye geçiliyor:", geminiError.message);
            
            // Gemini başarısız olursa OpenAI'yi dene
            try {
                console.log("Yedek API deneniyor: OpenAI");
                result = await callOpenAiApi(base64ImageData, openAiApiKey, prompt);
            } catch (openAiError) {
                console.error("Yedek API (OpenAI) de başarısız oldu:", openAiError.message);
                throw new Error("Her iki yapay zeka servisi de kuponu okuyamadı.");
            }
        }
        
        response.status(200).json(result);

    } catch (error) {
        console.error('Sunucu fonksiyonunda genel hata:', error);
        response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}

