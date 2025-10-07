import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Base64 görseller için boyutu artır
        },
    },
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { secret, message, photo } = request.body;

    const botSecret = process.env.TELEGRAM_BOT_SECRET;
    if (!botSecret || secret !== botSecret) {
      return response.status(401).json({ message: 'Yetkisiz Erişim.' });
    }

    // --- Gemini ile Multi-Modal Analiz ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY ortam değişkeni bulunamadı.");
    
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Gemini'a gönderilecek içeriği dinamik olarak oluştur
    const parts = [];
    
    // Geliştirilmiş, multi-modal prompt
    let prompt = `Bu Telegram gönderisini analiz et. Hem metni hem de (varsa) görseli dikkate al. Bu bir spor bahsi özel oranıysa, bana SADECE markdown kod bloğu içinde bir JSON objesi döndür. JSON objesi şu alanları içermeli:
1. 'is_offer': (boolean) Bu bir bahis fırsatı mı?
2. 'platform': (string) Platformun adı (Örn: "Grandpashabet").
3. 'description': (string) Bahsin tam ve detaylı açıklaması. Görseldeki maç isimleri, takımlar ve bahis türünü metinle birleştirerek oluştur. (Örn: "Almanya-Luxembourg, Belçika-Makedonya / Tüm Maçlar Üst 3.5").
4. 'odds': (number) Bahsin toplam oranı.
5. 'max_bet': (number) Maksimum bahis miktarı (eğer belirtilmemişse null).
6. 'primary_link_url': (string) Metindeki ilk http linki (eğer yoksa null).
7. 'primary_link_text': (string) Genellikle linkin üzerindeki veya platform adıyla ilişkili metin (Örn: "GRANDPASHABET GİRİŞ"). Eğer bulamazsan platform adını kullan.

Eğer bu bir reklam veya alakasız içerikse, bana sadece {'is_offer': false} döndür.
Başka hiçbir ek metin, selamlama veya açıklama yazma.
İşte metin: "${message}"`;

    parts.push({ text: prompt });

    // Eğer görsel varsa, payload'a ekle
    if (photo) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: photo
        }
      });
    }

    const payload = { contents: [{ parts }] };

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error("Gemini API Hatası:", errorBody);
        throw new Error(`Gemini API isteği başarısız oldu: ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini'den geçerli bir cevap alınamadı.");
    
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
        console.error("API'den gelen cevapta JSON bulunamadı:", rawText);
        return response.status(200).json({ status: 'gemini_parse_error', reason: 'Gemini JSON formatında cevap vermedi.' });
    }
    
    const parsedJson = JSON.parse(jsonMatch[1]);

    if (parsedJson.is_offer === false || !parsedJson.platform || !parsedJson.odds || !parsedJson.description) {
        return response.status(200).json({ status: 'not_an_offer', reason: 'Gemini, içeriğin bir fırsat olmadığına karar verdi.' });
    }

    // --- Veritabanına Kaydetme ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase ortam değişkenleri (URL ve SERVICE_KEY) bulunamadı.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const newOddData = {
        description: parsedJson.description,
        odds: parseFloat(parsedJson.odds),
        platform: parsedJson.platform,
        max_bet_amount: parsedJson.max_bet ? parseFloat(parsedJson.max_bet) : null,
        primary_link_url: parsedJson.primary_link_url || null,
        primary_link_text: parsedJson.primary_link_text || null,
        status: 'pending'
    };

    const { error } = await supabase.from('special_odds').insert([newOddData]);

    if (error) {
        console.error('Supabase Ekleme Hatası:', error);
        throw new Error(`Veritabanına eklenirken hata oluştu: ${error.message}`);
    }
    
    return response.status(201).json({ status: 'success', message: 'Fırsat başarıyla eklendi.', data: newOddData });

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}

