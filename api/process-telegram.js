import { createClient } from '@supabase/supabase-js';

// Bu fonksiyon, Vercel üzerinde sunucusuz bir API uç noktası olarak çalışır.
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { secret, message } = request.body;

    // --- 1. Güvenlik ve Girdi Kontrolü ---
    const botSecret = process.env.TELEGRAM_BOT_SECRET;
    if (!botSecret || secret !== botSecret) {
      return response.status(401).json({ message: 'Yetkisiz Erişim.' });
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return response.status(400).json({ message: 'Mesaj metni gerekli.' });
    }

    // --- 2. Akıllı Ön Filtreleme ---
    const footerKeywords = [
      'XBONUS GÜVENİLİR SPONSORLAR',
      'ÖZEL ORAN SİTELER'
    ];
    let cleanedMessage = message;
    for (const keyword of footerKeywords) {
      const footerStartIndex = cleanedMessage.indexOf(keyword);
      if (footerStartIndex !== -1) {
        cleanedMessage = cleanedMessage.substring(0, footerStartIndex).trim();
      }
    }
    
    const lowerCaseMessage = cleanedMessage.toLowerCase();
    const negativeKeywords = ['form', 'etkinlik', 'freespin', 'kayıt ol', 'üye ol', 'deneme bonusu'];
    if (negativeKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        return response.status(200).json({ status: 'filtered', reason: `Alakasız anahtar kelime içeriyor: ${negativeKeywords.find(k => lowerCaseMessage.includes(k))}` });
    }
    
    const positiveKeywords = ['özel oran', 'oran', 'max'];
    if (!positiveKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        return response.status(200).json({ status: 'filtered', reason: 'Gerekli anahtar kelimeler bulunamadı.' });
    }
    
    // --- 3. Gemini ile Analiz (gemini-2.5-flash ile) ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY ortam değişkeni bulunamadı.");
    
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Bu metni analiz et. Eğer bu bir spor bahsi özel oranı ise, bana platform(string), description(string), odds(number), max_bet(number, eğer yoksa null), ve primary_link_url(string, metindeki ilk http linki, yoksa null) bilgilerini içeren bir JSON objesi ver. Eğer bu bir reklam, duyuru veya alakasız bir içerikse, bana sadece {'is_offer': false} şeklinde bir JSON objesi döndür. Cevap olarak SADECE ve SADECE markdown kod bloğu içinde JSON objesi döndür. Başka hiçbir şey yazma. Metin: "${cleanedMessage}"`;

    const payload = { contents: [{ parts: [{ text: prompt }] }] };

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

    // --- 4. Veritabanına Kaydetme ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase ortam değişkenleri (URL ve ANON_KEY) bulunamadı.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const newOddData = {
        description: parsedJson.description,
        odds: parseFloat(parsedJson.odds),
        platform: parsedJson.platform,
        max_bet_amount: parsedJson.max_bet ? parseFloat(parsedJson.max_bet) : null,
        primary_link_url: parsedJson.primary_link_url || null,
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

