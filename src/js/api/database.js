import { getSupabase } from './auth.js';

const _supabase = getSupabase();

// Genel Veri Yükleme
export async function loadInitialData(userId) {
    const [betsResponse, platformsResponse, sponsorsResponse, adsResponse] = await Promise.all([
        _supabase.from('bets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        _supabase.from('platforms').select('id, name').eq('user_id', userId),
        _supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
        _supabase.from('ads').select('*').order('created_at', { ascending: false })
    ]);
    return {
        bets: betsResponse.data || [],
        platforms: platformsResponse.data || [],
        sponsors: sponsorsResponse.data || [],
        ads: adsResponse.data || []
    };
}

// Bahis İşlemleri
export async function addBet(betData) {
    return await _supabase.from('bets').insert(betData).select();
}

export async function updateBet(betId, updateData) {
    return await _supabase.from('bets').update(updateData).eq('id', betId).select();
}

export async function deleteBet(betId) {
    return await _supabase.from('bets').delete().eq('id', betId);
}

export async function clearAllBetsForUser(userId) {
    return await _supabase.from('bets').delete().eq('user_id', userId);
}


// Platform İşlemleri
export async function addPlatform(platformData) {
    return await _supabase.from('platforms').insert(platformData).select();
}

export async function deletePlatform(platformId) {
    return await _supabase.from('platforms').delete().eq('id', platformId);
}

export async function clearAllPlatformsForUser(userId) {
    return await _supabase.from('platforms').delete().eq('user_id', userId);
}

// Sponsor İşlemleri (Admin)
export async function addSponsor(sponsorData) {
    return await _supabase.from('sponsors').insert(sponsorData).select();
}

export async function deleteSponsor(sponsorId) {
    return await _supabase.from('sponsors').delete().eq('id', sponsorId);
}

// Reklam İşlemleri (Admin)
export async function addAd(adData) {
    return await _supabase.from('ads').insert(adData).select();
}

export async function deleteAd(adId) {
    return await _supabase.from('ads').delete().eq('id', adId);
}