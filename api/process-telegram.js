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
    "avvabet": { text: "AVVABET GİRİŞ", url: "https://fishytv.link/avvabet" },
    "asyabahis": { text: "ASYABAHİS", url: "https://ozeloran.site/asyabahis" },
    "bahisfanatik": { text: "BAHİS FANATİK GÜNCEL GİRİŞ", url: "https://linkany.pro/XBonus" },
    "baywin": { text: "BAYWİN", url: "https://ozeloran.site/baywin" },
    "betcio": { text: "BETCİO", url: "https://ozeloran.site/betcio" },
    "betgit": { text: "BETGİT", url: "https://ozeloran.site/betgit" },
    "bethand": { text: "BETHAND GÜNCEL GİRİŞ", url: "https://ozeloran.site/bethand" },
    "betine": { text: "BETİNE GİRİŞ", url: "https://linkgo.in/Betine" },
    "betixir": { text: "BETİXİR GİRİŞ", url: "https://bit.ly/betixirgir" },
    "betorspin": { text: "BETORSPİN", url: "https://ozeloran.site/betorspin" },
    "betsmove": { text: "BETSMOVE", url: "https://ozeloran.site/betsmove" },
    "biabet": { text: "BİABET", url: "https://ozeloran.site/biabet" },
    "bibubet": { text: "BİBUBET", url: "https://ozeloran.site/bibubet" },
    "bycasino": { text: "BYCASİNO GÜNCEL GİRİŞ", url: "https://ozeloran.site/bycasino" },
    "cashwin": { text: "CASHWİN", url: "https://ozeloran.site/cashwin" },
    "dumanbet": { text: "DUMANBET", url: "https://ozeloran.site/dumanbet" },
    "grandpashabet": { text: "GRANDPASHABET GİRİŞ", url: "https://ozeloran.site/grandpashabet" },
    "harbiwin": { text: "HARBİWİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/harbiwin" },
    "hitbet": { text: "HİTBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/hitbet" },
    "holiganbet": { text: "HOLİGANBET", url: "https://ozeloran.site/holiganbet" },
    "imajbet": { text: "İMAJBET", url: "https://ozeloran.site/imajbet" },
    "jojobet": { text: "JOJOBET", url: "https://ozeloran.site/jojobet" },
    "kavbet": { text: "KAVBET", url: "https://ozeloran.site/kavbet" },
    "lunabet": { text: "LUNABET", url: "https://ozeloran.site/lunabet" },
    "makrobet": { text: "MAKROBET GÜNCEL GİRİŞ", url: "https://t2m.io/makroxbonus" },
    "maltcasino": { text: "MALTCASİNO", url: "https://ozeloran.site/maltcasino" },
    "matbet": { text: "MATBET", url: "https://ozeloran.site/matbet" },
    "matixbet": { text: "MATİXBET", url: "https://matixortaklik.com/git/matixsosyal/" },
    "mavibet": { text: "MAVİBET", url: "https://ozeloran.site/mavibet" },
    "maxwin": { text: "MAXWİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/maxwin" },
    "megabahis": { text: "MEGABAHİS", url: "https://ozeloran.site/megabahis" },
    "merso": { text: "MERSOBAHİS GÜNCEL GİRİŞ", url: "https://ozeloran.site/mersobahis" },
    "mersobahis": { text: "MERSOBAHİS GÜNCEL GİRİŞ", url: "https://ozeloran.site/mersobahis" },
    "nakitbahis": { text: "NAKİTBAHİS", url: "https://ozeloran.site/nakitbahis" },
    "nerobet": { text: "NEROEBET GÜNCEL GİRİŞ", url: "https://t2m.io/e416FBxD" },
    "odeonbet": { text: "ODEONBET", url: "https://ozeloran.site/odeonbet" },
    "olabahis": { text: "OLA BAHİS", url: "https://ozeloran.site/olabahis" },
    "padişahbet": { text: "PADİŞAHBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/padisahbet" },
    "parobet": { text: "PAROBET", url: "https://ozeloran.site/parobet" },
    "piabet": { text: "PİABET GÜNCEL GİRİŞ", url: "https://kisa.to/Xbonuspia" },
    "pinbahis": { text: "PİN BAHİS", url: "https://ozeloran.site/pinbahis" },
    "pusulabet": { text: "PUSULABET", url: "https://ozeloran.site/pusulabet" },
    "roketbahis": { text: "ROKETBAHİS", url: "https://cutt.ly/2rS3rxfX" },
    "sekabet": { text: "SEKABET", url: "https://ozeloran.site/sekabet" },
    "slotin": { text: "SLOTİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/slotin" },
    "starzbet": { text: "STARZBET GÜNCEL GİRİŞ", url: "https://ozeloran.site/starzbet" },
    "superbetin": { text: "SUPERBETİN", url: "https://ozeloran.site/superbetin" },
    "şanscasino": { text: "ŞANSCASİNO GÜNCEL GİRİŞ", url: "https://ozeloran.site/sanscasino" },
    "taksimbet": { text: "TAKSİMBET GİRİŞ", url: "https://bit.ly/taksimbet" },
    "tipbom": { text: "TİPBOM GÜNCEL GİRİŞ", url: "https://cutt.ly/TipBomxBonus" },
    "tokyobet": { text: "TOKYOBET GÜNCEL GİRİŞ", url: "https://tokyoaff.com/qnzhdoup" },
    "turkbet süper oran": { text: "TURKBET", url: "https://ozeloran.site/turkbet" },
    "turkbet": { text: "TURKBET", url: "https://ozeloran.site/turkbet" },
    "yedibahis": { text: "YEDİBAHİS GİRİŞ", url: "https://t2m.io/ydxbonus?utm_medium=social&utm_source=heylink.me" },
    "zenginsin": { text: "ZENGİNSİN GÜNCEL GİRİŞ", url: "https://ozeloran.site/zenginsin" },
    "zirvebet": { text: "ZİRVEBET", url: "https://ozeloran.site/zirvebet" },
    "zlot": { text: "ZLOT", url: "https://ozeloran.site/zlot" },
    "amgbahis": { text: "AMGBAHİS GÜNCEL GİRİŞ", url: "https://t2m.io/nebulaaa" }
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { secret, message, photo, telegram_message_id } = request.body;

    const botSecret = process.env.TELEGRAM_BOT_SECRET;
    if (!botSecret || secret !== botSecret) {
      return response.status(401).json({ message: 'Yetkisiz Erişim.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY ortam değişkeni bulunamadı.");
    
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const parts = [];
    const prompt = `Bu Telegram gönderisini analiz et. Bu bir spor bahsi özel oranıysa, bana SADECE markdown kod bloğu içinde bir JSON objesi döndür. JSON objesi şu alanları içermeli:
1. 'is_offer': (boolean) Bu bir bahis fırsatı mı?
2. 'platform': (string) Platformun adı.
3. 'matches': (string dizisi/array) Kupondaki maçların listesi. Her maçı SADECE "Takım A - Takım B" formatında yaz.
4. 'bet_type': (string) Tüm maçlar için geçerli olan bahis türü. Örneğin: "Ev Sahibi Kazanır", "Toplam 4.5 Gol Üstü", "Karşılıklı Gol Var". Bu açıklamayı her zaman standart ve tutarlı yap.
5. 'odds': (number) Bahsin toplam oranı.
6. 'max_bet': (number) Maksimum bahis miktarı (eğer belirtilmemişse null).
7. 'play_count_start': (number) Metindeki "min maks X" veya benzeri ifadelerden X sayısını al, yoksa 0.

Eğer bu bir reklam veya alakasız içerikse, bana sadece {'is_offer': false} döndür.
Başka hiçbir ek metin yazma.
İşte metin: "${message}"`;

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

    if (parsedJson.is_offer === false || !parsedJson.platform || !parsedJson.odds || !Array.isArray(parsedJson.matches) || parsedJson.matches.length === 0 || !parsedJson.bet_type) {
        return response.status(200).json({ status: 'not_an_offer' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase ortam değişkenleri bulunamadı.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const description = parsedJson.matches.join(' / ') + ' - ' + parsedJson.bet_type;

    const platformKey = parsedJson.platform.toLowerCase().replace(/\s/g, '');
    const linkInfo = KEYWORD_LINKS[platformKey];

    // DÜZELTME: Sadece KEYWORD_LINKS listesinde varsa linki al, yoksa null bırak.
    const primaryUrl = linkInfo ? linkInfo.url : null;
    const primaryText = linkInfo ? linkInfo.text : (primaryUrl ? `${parsedJson.platform} GİRİŞ` : null);

    const rpcParams = {
        p_platform: parsedJson.platform,
        p_description: description,
        p_odds: parseFloat(parsedJson.odds),
        p_max_bet_amount: parsedJson.max_bet ? parseInt(parsedJson.max_bet, 10) : null,
        p_primary_link_url: primaryUrl,
        p_primary_link_text: primaryText,
        p_secondary_link_url: null,
        p_secondary_link_text: null,
        p_play_count_start: parsedJson.play_count_start || 0,
        p_matches: parsedJson.matches,
        p_telegram_message_id: telegram_message_id
    };

    const { data, error } = await supabase.rpc('upsert_special_odd', rpcParams);

    if (error) {
        console.error('Supabase RPC Hatası:', error);
        throw new Error(`Veritabanı fonksiyonu çalıştırılırken hata: ${error.message}`);
    }

    const resultData = data; 
    const statusCode = resultData.status === 'success_created' ? 201 : 200;
    return response.status(statusCode).json(resultData);

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}

