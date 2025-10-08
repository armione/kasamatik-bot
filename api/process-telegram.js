import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

// Not: KEYWORD_LINKS'i önceki dosyanızdan buraya kopyalayabilirsiniz.
const KEYWORD_LINKS = {
    "grandpashabet": { text: "GRANDPASHABET GİRİŞ", url: "https://ozeloran.site/grandpashabet" }
    // ...diğer linkler
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY ortam değişkeni bulunamadı.");
    
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const parts = [];
    const prompt = `Bu Telegram gönderisini analiz et. Cevap olarak SADECE markdown kod bloğu içinde bir JSON objesi döndür. JSON şu alanları içermeli:
1. 'is_offer': (boolean) Bu bir bahis fırsatı mı?
2. 'platform': (string) Platformun adı.
3. 'description': (string) Bahsin tam ve standartlaştırılmış açıklaması. Her maçı "Takım A - Takım B: Bahis Türü" formatında yaz ve aralarına " / " koy. Açıklamanın her zaman tutarlı olması çok önemli.
4. 'odds': (number) Bahsin toplam oranı.
5. 'max_bet': (number) Maksimum bahis miktarı (yoksa null).
6. 'play_count_start': (number) "MİN MAKS X ₺ BAHİS" gibi bir ifade varsa X sayısını al, yoksa 0.
Eğer bu bir bahis fırsatı değilse, sadece {'is_offer': false} döndür. JSON dışında hiçbir metin yazma.
Metin: "${message}"`;

    parts.push({ text: prompt });
    if (photo) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: photo } });
    }

    const payload = { contents: [{ parts }] };
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) throw new Error(`Gemini API hatası: ${await geminiResponse.text()}`);

    const result = await geminiResponse.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini'den geçerli bir cevap alınamadı.");
    
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) return response.status(200).json({ status: 'gemini_parse_error', text: rawText });
    
    const parsedJson = JSON.parse(jsonMatch[1]);

    if (!parsedJson.is_offer) {
        return response.status(200).json({ status: 'not_an_offer' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase ortam değişkenleri bulunamadı.");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const platformKey = (parsedJson.platform || "").toLowerCase().replace(/\s/g, '');
    const linkInfo = KEYWORD_LINKS[platformKey] || { text: `${parsedJson.platform} GİRİŞ`, url: null };

    // Veritabanındaki akıllı fonksiyonu çağır
    const { data, error } = await supabase.rpc('upsert_special_odd', {
        p_platform: parsedJson.platform,
        p_description: parsedJson.description,
        p_odds: parseFloat(parsedJson.odds),
        p_max_bet_amount: parsedJson.max_bet ? parseFloat(parsedJson.max_bet) : null,
        p_primary_link_url: linkInfo.url || (message.match(/https?:\/\/[^\s]+/g) || [null])[0],
        p_primary_link_text: linkInfo.text,
        p_play_count_start: parsedJson.play_count_start || 0
    });

    if (error) {
        console.error('Supabase RPC Hatası:', error);
        throw new Error(`Veritabanı fonksiyonu hatası: ${error.message}`);
    }

    return response.status(200).json(data);

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}
