// api/start-analysis-job.js
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
        // 0. Önceki tamamlanmamış görevleri temizle
        await supabase.from('analysis_tasks').delete().neq('status', 'completed');

        // 1. Bekleyen tüm özel oranları bul
        const { data: pendingOdds, error: fetchError } = await supabase
            .from('special_odds')
            .select('id, description')
            .eq('status', 'pending');

        if (fetchError) {
            throw new Error(`Özel oranlar çekilirken hata: ${fetchError.message}`);
        }

        if (!pendingOdds || pendingOdds.length === 0) {
            return response.status(200).json({ tasks: [], message: 'Analiz edilecek bekleyen özel oran bulunmuyor.' });
        }
        
        // 2. Her bir özel oran için bir görev oluştur
        const tasksToInsert = pendingOdds.map(odd => ({
            special_odd_id: odd.id,
            status: 'pending'
        }));

        // 3. Görevleri veritabanına ekle
        const { data: createdTasks, error: insertError } = await supabase
            .from('analysis_tasks')
            .insert(tasksToInsert)
            .select('id, special_odd_id, special_odds(description)'); // Dönen veride açıklama da olsun

        if (insertError) {
            throw new Error(`Analiz görevleri oluşturulurken hata: ${insertError.message}`);
        }
        
        // 4. Oluşturulan görevleri arayüze geri döndür
        const tasksForFrontend = createdTasks.map(task => ({
            id: task.id,
            special_odd_id: task.special_odd_id,
            description: task.special_odds.description // Join sayesinde gelen açıklama
        }));
        
        return response.status(200).json({ tasks: tasksForFrontend });

    } catch (error) {
        console.error('Analiz işi başlatma fonksiyonunda hata:', error);
        return response.status(500).json({ message: 'Sunucuda bir hata oluştu.', error: error.message });
    }
}
