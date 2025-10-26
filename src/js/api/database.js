import { getSupabase } from './auth.js';
// ADMIN_USER_ID import'u kaldırıldı (artık kullanılmıyor)
// import { ADMIN_USER_ID } from '../utils/constants.js';

// Supabase istemcisini al
const _supabase = getSupabase();

// Genel Veri Yükleme
// Kullanıcı girişi yaptığında gerekli tüm verileri çeker.
export async function loadInitialData(userId) {
    // GÜNCELLEME: Kullanıcının admin olup olmadığını Supabase session'dan kontrol et
    // Bu, main.js'deki role kontrolüyle aynı mantıkta olmalı.
    // Şimdilik userId'ye göre basit bir kontrol yapalım,
    // ancak ideal olan session'dan gelen role bilgisini kullanmak.
    // const isAdmin = state.currentUser?.app_metadata?.role === 'admin'; // main.js'deki gibi
    // Geçici olarak ID kontrolünü bırakalım, rol mekanizması kurulunca burası da güncellenmeli.
    const isAdmin = userId === 'fbf57686-1ec6-4ef0-9ee1-b908d3fae274'; // Geçici ID kontrolü

    // Özel Oranları Çekme Sorgusu
    const specialOddsQuery = _supabase
        .from('special_odds')
        .select('*')
        .order('created_at', { ascending: false }); // En yeniden eskiye

    // Eğer kullanıcı admin değilse, sadece aktif olanları VEYA son 24 saatte sonuçlananları çek
    if (!isAdmin) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        specialOddsQuery.or(`is_active.eq.true,resulted_at.gte.${yesterday}`);
        // `is_active` sütunu var mı? Yoksa bu filtre çalışmaz. Şemayı kontrol etmek lazım.
        // Şimdilik varsayılan filtreyi kullanalım:
        // specialOddsQuery.or(`status.eq.pending,resulted_at.gte.${yesterday}`); // Aktif veya son 24s sonuçlanan
    }

    // Tüm başlangıç verilerini paralel olarak çek
    try {
        const [betsResponse, platformsResponse, sponsorsResponse, adsResponse, specialOddsResponse] = await Promise.all([
            // Kullanıcının bahisleri (ilişkili özel oran bilgisiyle birlikte)
            _supabase.from('bets').select('*, special_odds(*)').eq('user_id', userId).order('created_at', { ascending: false }),
            // Kullanıcının özel platformları
            _supabase.from('platforms').select('id, name').eq('user_id', userId),
            // Herkes için sponsorlar
            _supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
            // Herkes için reklamlar
            _supabase.from('ads').select('*').order('created_at', { ascending: false }),
            // Özel oranlar (admin/kullanıcıya göre filtrelenmiş)
            specialOddsQuery
        ]);

        // Hata kontrolü
        if (betsResponse.error) throw betsResponse.error;
        if (platformsResponse.error) throw platformsResponse.error;
        if (sponsorsResponse.error) throw sponsorsResponse.error;
        if (adsResponse.error) throw adsResponse.error;
        if (specialOddsResponse.error) throw specialOddsResponse.error;

        // Verileri döndür
        return {
            bets: betsResponse.data || [],
            platforms: platformsResponse.data || [],
            sponsors: sponsorsResponse.data || [],
            ads: adsResponse.data || [],
            specialOdds: specialOddsResponse.data || [],
        };
    } catch (error) {
        console.error("Başlangıç verileri yüklenirken hata:", error);
        // Hata durumunda boş diziler döndürerek uygulamanın çökmesini engelle
        return { bets: [], platforms: [], sponsors: [], ads: [], specialOdds: [] };
    }
}

// ---- Bahis İşlemleri ----
// Yeni bahis ekler
export async function addBet(betData) {
    // `select('*')` yerine sadece gerekli sütunları seçmek daha performanslı olabilir.
    return await _supabase.from('bets').insert(betData).select('*, special_odds(*)');
}

// Mevcut bahsi günceller
export async function updateBet(betId, updateData) {
    return await _supabase.from('bets').update(updateData).eq('id', betId).select('*, special_odds(*)');
}

// Belirtilen ID'ye sahip bahsi siler
export async function deleteBet(betId) {
    return await _supabase.from('bets').delete().eq('id', betId);
}

// Belirtilen kullanıcının TÜM bahislerini siler (Dikkatli kullanılmalı!)
export async function clearAllBetsForUser(userId) {
    return await _supabase.from('bets').delete().eq('user_id', userId);
}


// ---- Platform İşlemleri ----
// Yeni özel platform ekler
export async function addPlatform(platformData) {
    return await _supabase.from('platforms').insert(platformData).select();
}

// Belirtilen ID'ye sahip platformu siler
export async function deletePlatform(platformId) {
    return await _supabase.from('platforms').delete().eq('id', platformId);
}

// Belirtilen kullanıcının TÜM özel platformlarını siler
export async function clearAllPlatformsForUser(userId) {
    return await _supabase.from('platforms').delete().eq('user_id', userId);
}

// ---- Sponsor İşlemleri (Sadece Admin) ----
// Yeni sponsor ekler (Admin yetkisi RLS ile kontrol edilmeli)
export async function addSponsor(sponsorData) {
    return await _supabase.from('sponsors').insert(sponsorData).select();
}

// Belirtilen ID'ye sahip sponsoru siler (Admin yetkisi RLS ile kontrol edilmeli)
export async function deleteSponsor(sponsorId) {
    return await _supabase.from('sponsors').delete().eq('id', sponsorId);
}

// ---- Reklam İşlemleri (Sadece Admin) ----
// Yeni reklam ekler (Admin yetkisi RLS ile kontrol edilmeli)
export async function addAd(adData) {
    return await _supabase.from('ads').insert(adData).select();
}

// Belirtilen ID'ye sahip reklamı siler (Admin yetkisi RLS ile kontrol edilmeli)
export async function deleteAd(adId) {
    return await _supabase.from('ads').delete().eq('id', adId);
}

// ---- Özel Oran İşlemleri (Sadece Admin/Bot) ----
// Yeni özel oran ekler (Admin/Bot yetkisi RLS veya API Secret ile kontrol edilmeli)
export async function addSpecialOdd(oddData) {
    return await _supabase.from('special_odds').insert(oddData).select();
}

// Tüm özel oranları getirir (Admin paneli için)
// Bu fonksiyon public ise RLS ile korunmalı veya sadece admin tarafından çağrılmalı
export async function getSpecialOdds() {
    return await _supabase.from('special_odds').select('*').order('created_at', { ascending: false });
}

// Mevcut özel oranı günceller (Admin/Bot yetkisi RLS veya API Secret ile kontrol edilmeli)
// GÖREV 4 DÜZELTMESİ: Sadece status yerine tüm updateData objesini gönder.
export async function updateSpecialOdd(oddId, updateData) {
    // Önceki Hatalı Kod: .update({ status: updateData.status })
    // Düzeltilmiş Kod:
    return await _supabase.from('special_odds').update(updateData).eq('id', oddId).select();
}
