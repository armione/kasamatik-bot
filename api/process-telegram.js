import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

const KEYWORD_LINKS = {
    "artemisbet": { text: "ARTEMİSBET GİRİŞ", url: "http://artelinks2.com/telegram" },
    "cashwin": { text: "CASHWİN GİRİŞ", url: "https://bit.ly/giriscashwin" },
    "betgit": { text: "BETGİT GİRİŞ", url: "https://3xl.ink/bgitguncel" },
    "parobet": { text: "PAROBET GİRİŞ", url: "https://t.ly/parogir" },
    "dumanbet": { text: "DUMANBET GİRİŞ", url: "https://t2m.io/dbtwitter2" },
    "holiganbet": { text: "HOLİGANBET GİRİŞ", url: "https://dub.pro/holiguncel" },
    "kavbet": { text: "KAVBET GİRİŞ", url: "https://tracker.kavbetpartners1.com/link?btag=58804675_363847" },
    "lunabet": { text: "LUNABET GİRİŞ", url: "https://lunalinks.org/lunabest" },
    "betorspin": { text: "BETORSPİN GİRİŞ", url: "https://cutt.ly/lwZC7EWV" },
    "merso": { text: "MERSOBAHİS GİRİŞ", url: "https://mth.tc/mersoxnbl" },
    "mersobahis": { text: "MERSOBAHİS GİRİŞ", url: "https://mth.tc/mersoxnbl" },
    "jojobet": { text: "JOJOBET GİRİŞ", url: "https://dub.pro/jojoozeloran" },
    "superbetin": { text: "SUPERBETİN GİRİŞ", url: "https://sbtmcdn.com/C.ashx?btag=a_10122b_681c_&affid=22692&siteid=10122&adid=681&c=" },
    "turkbet": { text: "TURKBET GİRİŞ", url: "https://trk85cdn.com/C.ashx?btag=a_10123b_689c_&affid=22693&siteid=10123&adid=689&c=" },
    "nakitbahis": { text: "NAKİTBAHİS GİRİŞ", url: "https://dub.is/nakitozel" },
    "pusulabet": { text: "PUSULABET GİRİŞ", url: "https://cutt.ly/pusulaozeloran" },
    "sekabet": { text: "SEKABET GİRİŞ", url: "https://t2m.io/sekaguncelgiris" },
    "şanscasino": { text: "ŞANSCASİNO GİRİŞ", url: "https://t.ly/xbonus" },
    "harbiwin": { text: "HARBİWİN GİRİŞ", url: "https://t2m.io/YDPLog3f" },
    "piabet": { text: "PİABET GİRİŞ", url: "https://kisa.to/Xbonuspia" },
    "asyabahis": { text: "ASYABAHİS GİRİŞ", url: "https://t2m.io/asyaguncelgiris" },
    "maltcasino": { text: "MALTCASİNO GİRİŞ", url: "https://t2m.io/maltguncelgiris" },
    "pinbahis": { text: "PİN BAHİS GİRİŞ", url: "https://t2m.io/twttrpnbhs24" },
    "olabahis": { text: "OLA BAHİS GİRİŞ", url: "https://t2m.io/txolabhs" },
    "zirvebet": { text: "ZİRVEBET GİRİŞ", url: "https://zirve.ink/zirve-oran" },
    "bibubet": { text: "BİBUBET GİRİŞ", url: "https://dub.link/bibuguncel" },
    "megabahis": { text: "MEGABAHİS GİRİŞ", url: "https://dub.is/megaguncel" },
    "matbet": { text: "MATBET GİRİŞ", url: "https://dub.is/matguncel" },
    "betcio": { text: "BETCİO GİRİŞ", url: "https://t2m.io/cioxbonus" },
    "imajbet": { text: "İMAJBET GİRİŞ", url: "https://linkin.bio/imajbet" },
    "odeonbet": { text: "ODEONBET GİRİŞ", url: "http://dub.pro/odeonozeloran" },
    "baywin": { text: "BAYWİN GİRİŞ", url: "https://cutt.ly/5eVWdeoW" },
    "zlot": { text: "ZLOT GİRİŞ", url: "https://cutt.ly/9r0pZGAS" },
    "matixbet": { text: "MATİXBET GİRİŞ", url: "https://matixortaklik.com/git/matixsosyal/" },
    "betsmove": { text: "BETSMOVE GİRİŞ", url: "http://dub.is/betsmoveguncel" },
    "padişahbet": { text: "PADİŞAHBET GİRİŞ", url: "http://t2m.io/2YqDMK0" },
    "bycasino": { text: "BYCASİNO GİRİŞ", url: "https://cutt.ly/arVwJiFm" },
    "maxwin": { text: "MAXWİN GİRİŞ", url: "https://cutt.ly/maxmedia" },
    "mavibet": { text: "MAVİBET GİRİŞ", url: "https://dub.pro/maviozeloran" },
    "bethand": { text: "BETHAND GİRİŞ", url: "https://cutt.ly/GrWexqYB" },
    "hitbet": { text: "HİTBET GİRİŞ", url: "https://cutt.ly/Hitbet-Vip-MH" },
    "biabet": { text: "BİABET GİRİŞ", url: "https://biabetlink.com" },
    "roketbahis": { text: "ROKETBAHİS GİRİŞ", url: "https://cutt.ly/2rS3rxfX" },
    "starzbet": { text: "STARZBET GİRİŞ", url: "https://cutt.ly/lreDfZTd" },
    "nerobet": { text: "NEROBET GİRİŞ", url: "https://t2m.io/e416FBxD" },
    "tipbom": { text: "TİPBOM GİRİŞ", url: "https://cutt.ly/TipBomxBonus" },
    "amgbahis": { text: "AMGBAHİS GİRİŞ", url: "https://t2m.io/nebulaaa" },
    "makrobet": { text: "MAKROBET GİRİŞ", url: "https://t2m.io/makroxbonus" },
    "zenginsin": { text: "ZENGİNSİN GİRİŞ", url: "https://tinyurl.com/wgpaff?t=ZGVkNTIz" },
    "tokyobet": { text: "TOKYOBET GİRİŞ", url: "https://tokyoaff.com/qnzhdoup" },
    "slotin": { text: "SLOTİN GİRİŞ", url: "https://cutt.ly/mrlBd9hr" },
    "bahisfanatik": { text: "BAHİS FANATİK GİRİŞ", url: "https://linkany.pro/XBonus" },
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
    
    const platformKey = parsedJson.platform.toLowerCase().replace(/\s/g, '');
    const linkInfo = KEYWORD_LINKS[platformKey] || { text: `${parsedJson.platform} GİRİŞ`, url: null };

    // Veritabanı fonksiyonunu (RPC) çağır
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
        throw new Error(`Veritabanı fonksiyonu çalıştırılırken hata: ${error.message}`);
    }

    return response.status(200).json(data);

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}
