// Bu dosyanın adı: /api/update-status.js
// Bu kod, Vercel sunucusunda çalışır ve sadece özel oranların durumunu güncellemekle görevlidir.

import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  // Sadece POST metoduyla gelen istekleri kabul et
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const { secret, original_message_id, new_status } = request.body;

    // Vercel'e gizli olarak eklediğimiz bot anahtarını kontrol et
    const botSecret = process.env.TELEGRAM_BOT_SECRET;
    if (!botSecret || secret !== botSecret) {
      return response.status(401).json({ message: 'Yetkisiz Erişim.' });
    }
    
    // Gerekli bilgiler eksikse hata döndür
    if (!original_message_id || !new_status) {
        return response.status(400).json({ message: 'Mesaj ID ve yeni durum bilgisi gerekli.' });
    }

    // Supabase bağlantı bilgilerini güvenli bir şekilde al
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase ortam değişkenleri bulunamadı.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Veritabanında, gelen telegram_message_id'ye sahip olan özel oranı bul ve durumunu güncelle
    const { data, error } = await supabase
      .from('special_odds')
      .update({ 
          status: new_status,
          resulted_at: new Date().toISOString() // Sonuçlanma zamanını kaydet
      })
      .eq('telegram_message_id', original_message_id)
      .select();

    // Veritabanı işlemi sırasında bir hata oluşursa
    if (error) {
        console.error('Supabase Güncelleme Hatası:', error);
        throw new Error(`Veritabanı güncellenirken hata: ${error.message}`);
    }

    // Eğer o ID'ye sahip bir fırsat bulunamazsa
    if (!data || data.length === 0) {
        return response.status(404).json({ status: 'not_found', message: 'Belirtilen ID ile eşleşen bir fırsat bulunamadı.' });
    }

    // Her şey yolundaysa başarı mesajı döndür
    return response.status(200).json({ status: 'success_updated', updated_odd: data[0] });

  } catch (error) {
    console.error('Sunucu fonksiyonunda hata:', error.message);
    return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
  }
}
