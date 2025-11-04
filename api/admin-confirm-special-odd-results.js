// Bu dosyanın adı: /api/admin-confirm-special-odd-results.js
// Yönetici onayından sonra özel oranları toplu olarak günceller.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase ortam değişkenleri bulunamadı.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Sadece POST istekleri kabul edilir.' });
    }

    try {
        const { updates } = request.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return response.status(400).json({ message: 'Güncellenecek veri bulunamadı.' });
        }

        // Güncellenecek her bir özel oran için bir Promise oluştur
        const updatePromises = updates.map(update => {
            if (update.id && (update.newStatus === 'won' || update.newStatus === 'lost')) {
                return supabase
                    .from('special_odds')
                    .update({
                        status: update.newStatus,
                        resulted_at: new Date().toISOString()
                    })
                    .eq('id', update.id)
                    .select()
                    .single();
            }
            return Promise.resolve(null); // Geçersiz güncellemeleri atla
        });
        
        // Tüm güncelleme işlemlerini paralel olarak çalıştır
        const results = await Promise.all(updatePromises);

        const updatedOdds = results.filter(r => r && !r.error); // Başarılı güncellemeleri filtrele
        const errors = results.filter(r => r && r.error);

        if (errors.length > 0) {
            console.error('Toplu güncelleme sırasında hatalar oluştu:', errors);
        }

        return response.status(200).json({
            message: `${updatedOdds.length} özel oran başarıyla güncellendi.`,
            updatedCount: updatedOdds.length,
            updatedOdds: updatedOdds.map(o => o.data),
            errors: errors.map(e => e.error.message)
        });

    } catch (error) {
        console.error('Özel oranları onaylama fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}