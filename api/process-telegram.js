import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

const KEYWORD_LINKS = {
    "artemisbet": { text: "ARTEMİSBET", url: "https://ozeloran.site/artemisbet" },
    "cashwin": { text: "CASHWİN", url: "https://ozeloran.site/cashwin" },
    "betgit": { text: "BETGİT", url: "https://ozeloran.site/betgit" },
    "parobet": { text: "PAROBET", url: "https://ozeloran.site/parobet" },
    "dumanbet": { text: "DUMANBET", url: "https://ozeloran.site/dumanbet" },
    "holiganbet": { text: "HOLİGANBET", url: "https://ozeloran.site/holiganbet" },
    "kavbet": { text: "KAVBET", url: "https://ozeloran.site/kavbet" },
    "lunabet": { text: "LUNABET", url: "https://ozeloran.site/lunabet" },
    "betorspin": { text: "BETORSPİN", url: "https://ozeloran.site/betorspin" },
    "merso": { text: "MERSOBAHİS GÜNCEL GİRİŞ", url: "https://ozeloran.site/mersobahis" },
    "mersobahis": { text: "MERSOBAHİS GÜNCEL GİRİŞ", url: "https://ozeloran.site/mersobahis" },
    "jojobet": { text: "JOJOBET", url: "https://ozeloran.site/jojobet" },
    "superbetin": { text: "SUPERBETİN", url: "https://ozeloran.site/superbetin" },
    "turkbet süper oran": { text: "TURKBET", url: "https://ozeloran.site/turkbet" },
    "turkbet": { text: "TURKBET", url: "https://ozeloran.site/turkbet" },
    "nakitbahis": { text: "NAKİTBAHİS", url: "https://ozeloran.site/nakitbahis" },
    "pusulabet": { text: "PUSULABET", url: "https://ozeloran.site/pusulabet" },
    "sekabet": { text: "SEKABET", url: "https://ozeloran.site/sekabet" },
    "şanscasino": { text: "ŞANSCASİNO GÜNCEL GİRİŞ", url: "https://ozeloran.site/sanscasino" },
    "harbiwin": { text: "HARBİWİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/harbiwin" },
    "piabet": { text: "PİABET GÜNCEL GİRİŞ", url: "https://kisa.to/Xbonuspia" },
    "asyabahis": { text: "ASYABAHİS", url: "https://ozeloran.site/asyabahis" },
    "maltcasino": { text: "MALTCASİNO", url: "https://ozeloran.site/maltcasino" },
    "pinbahis": { text: "PİN BAHİS", url: "https://ozeloran.site/pinbahis" },
    "olabahis": { text: "OLA BAHİS", url: "https://ozeloran.site/olabahis" },
    "zirvebet": { text: "ZİRVEBET", url: "https://ozeloran.site/zirvebet" },
    "bibubet": { text: "BİBUBET", url: "https://ozeloran.site/bibubet" },
    "megabahis": { text: "MEGABAHİS", url: "https://ozeloran.site/megabahis" },
    "matbet": { text: "MATBET", url: "https://ozeloran.site/matbet" },
    "betcio": { text: "BETCİO", url: "https://ozeloran.site/betcio" },
    "imajbet": { text: "İMAJBET", url: "https://ozeloran.site/imajbet" },
    "odeonbet": { text: "ODEONBET", url: "https://ozeloran.site/odeonbet" },
    "baywin": { text: "BAYWİN", url: "https://ozeloran.site/baywin" },
    "zlot": { text: "ZLOT", url: "https://ozeloran.site/zlot" },
    "matixbet": { text: "MATİXBET", url: "https://matixortaklik.com/git/matixsosyal/" },
    "betsmove": { text: "BETSMOVE", url: "https://ozeloran.site/betsmove" },
    "padişahbet": { text: "PADİŞAHBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/padisahbet" },
    "bycasino": { text: "BYCASİNO GÜNCEL GİRİŞ", url: "https://ozeloran.site/bycasino" },
    "maxwin": { text: "MAXWİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/maxwin" },
    "mavibet": { text: "MAVİBET", url: "https://ozeloran.site/mavibet" },
    "bethand": { text: "BETHAND GÜNCEL GİRİŞ", url: "https://ozeloran.site/bethand" },
    "hitbet": { text: "HİTBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/hitbet" },
    "biabet": { text: "BİABET", url: "https://ozeloran.site/biabet" },
    "roketbahis": { text: "ROKETBAHİS", url: "https://cutt.ly/2rS3rxfX" },
    "starzbet": { text: "STARZBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/starzbet" },
    "nerobet": { text: "NEROEBET GÜNCEL GİRİŞ", url: "https://t2m.io/e416FBxD" },
    "tipbom": { text: "TİPBOM GÜNCEL GİRİŞ", url: "https://cutt.ly/TipBomxBonus" },
    "amgbahis": { text: "AMGBAHİS GÜNCEL GİRİŞ", url: "https://t2m.io/nebulaaa" },
    "makrobet": { text: "MAKROBET GÜNCEL GİRİŞ", url: "https://t2m.io/makroxbonus" },
    "zenginsin": { text: "ZENGİNSİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/zenginsin" },
    "tokyobet": { text: "TOKYOBET GÜNCEL GİRİŞ", url: "https://tokyoaff.com/qnzhdoup" },
    "slotin": { text: "SLOTİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/slotin" },
    "bahisfanatik": { text: "BAHİS FANATİK GÜNCEL GİRİŞ", url: "https://linkany.pro/XBonus" },
    "grandpashabet": { text: "GRANDPASHABET GİRİŞ", url: "https://ozeloran.site/grandpashabet" }
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
    const prompt = `Bu Telegram gönderisini analiz et. Hem metni hem de (varsa) görseli dikkate al. Bu bir spor bahsi özel oranıysa, bana SADECE markdown kod bloğu içinde bir JSON objesi döndür. JSON objesi şu alanları içermeli:
1. 'is_offer': (boolean) Bu bir bahis fırsatı mı?
2. 'platform': (string) Platformun adı (Örn: "Grandpashabet").
3. 'description': (string) Bahsin tam ve standartlaştırılmış açıklaması. Birden fazla maç varsa, aralarına " / " koy. Her maçı "Takım A - Takım B: Bahis Türü" formatında yaz. 'toplam gol 3.5 üst', 'tüm maçlar 3.5 ü' gibi farklı ifadeleri 'Toplam 3.5 Gol Üstü' gibi her zaman aynı standart formata çevir. AÇIKLAMANIN HER ZAMAN TUTARLI OLMASI ÇOK ÖNEMLİ.
4. 'odds': (number) Bahsin toplam oranı.
5. 'max_bet': (number) Maksimum bahis miktarı (eğer belirtilmemişse null).
6. 'play_count_start': (number) Metin veya görselde "MİN MAKS X ₺ BAHİS" veya benzeri bir ifade varsa, oradaki X sayısını al. Eğer böyle bir ifade bulamazsan, bu değeri 0 olarak ayarla.

Eğer bu bir reklam veya alakasız içerikse, bana sadece {'is_offer': false} döndür.
Başka hiçbir ek metin, selamlama veya açıklama yazma.
İşte metin: "${message}"`;

    parts.push({ text: prompt });

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
        return response.status(200).json({ status: 'gemini_parse_error' });
    }
    
    const parsedJson = JSON.parse(jsonMatch[1]);

    if (parsedJson.is_offer === false || !parsedJson.platform || !parsedJson.odds || !parsedJson.description) {
        return response.status(200).json({ status: 'not_an_offer' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase ortam değişkenleri bulunamadı.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // --- Mükerrerlik Kontrolü ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingOdds, error: selectError } = await supabase
      .from('special_odds')
      .select('id')
      .eq('platform', parsedJson.platform)
      .eq('description', parsedJson.description)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1);

    if (selectError) {
        console.error('Supabase Sorgu Hatası:', selectError);
        throw new Error(`Veritabanı sorgulanırken hata: ${selectError.message}`);
    }
    
    const platformKey = parsedJson.platform.toLowerCase().replace(/\s/g, '');
    const linkInfo = KEYWORD_LINKS[platformKey];

    const dataToUpsert = {
        description: parsedJson.description,
        odds: parseFloat(parsedJson.odds),
        platform: parsedJson.platform,
        max_bet_amount: parsedJson.max_bet ? parseFloat(parsedJson.max_bet) : null,
        primary_link_url: linkInfo ? linkInfo.url : (message.match(/https?:\/\/[^\s]+/g) || [null])[0],
        primary_link_text: linkInfo ? linkInfo.text : `${parsedJson.platform} GİRİŞ`,
        status: 'pending'
    };

    if (existingOdds && existingOdds.length > 0) {
        // --- GÜNCELLEME ---
        const existingOddId = existingOdds[0].id;
        
        // ÖNEMLİ: Kaydın zaman damgasını yenileyerek "temizle" ve "güncel tut"
        dataToUpsert.created_at = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('special_odds')
            .update(dataToUpsert)
            .eq('id', existingOddId);

        if (updateError) {
            console.error('Supabase Güncelleme Hatası:', updateError);
            throw new Error(`Fırsat güncellenirken hata: ${updateError.message}`);
        }
        return response.status(200).json({ status: 'success_updated', message: 'Fırsat başarıyla güncellendi.' });
    } else {
        // --- YENİ EKLEME ---
         dataToUpsert.play_count = parsedJson.play_count_start || 0; // Sadece yeni eklenirken başlangıç sayacını ayarla
        const { error: insertError } = await supabase.from('special_odds').insert([dataToUpsert]);

        if (insertError) {
            console.error('Supabase Ekleme Hatası:', insertError);
            throw new Error(`Veritabanına eklenirken hata: ${insertError.message}`);
        }
        return response.status(201).json({ status: 'success_created', message: 'Fırsat başarıyla eklendi.' });
    }

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}

