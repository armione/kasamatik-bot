import { getSupabase } from './supabase';
import { ADMIN_USER_ID } from '../utils/constants';
import { Bet, Platform, Sponsor, Ad, SpecialOdd } from '../types';

const supabase = getSupabase();

export interface InitialData {
    bets: Bet[];
    platforms: Platform[];
    sponsors: Sponsor[];
    ads: Ad[];
    specialOdds: SpecialOdd[];
}

// Genel Veri Yükleme
export async function loadInitialData(userId: string): Promise<InitialData> {
    const isAdmin = userId === ADMIN_USER_ID;

    const specialOddsQuery = supabase.from('special_odds').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        specialOddsQuery.or(`is_active.eq.true,resulted_at.gte.${yesterday}`);
    }

    const [betsResponse, platformsResponse, sponsorsResponse, adsResponse, specialOddsResponse] = await Promise.all([
        supabase.from('bets').select('*, special_odds(*)').eq('user_id', userId).order('created_at', { ascending: false }),
        // FIX: The Platform type requires `user_id`, but the query was only selecting `id` and `name`. Changed to select all columns to resolve the type error.
        supabase.from('platforms').select('*').eq('user_id', userId),
        supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
        supabase.from('ads').select('*').order('created_at', { ascending: false }),
        specialOddsQuery
    ]);
    
    return {
        bets: betsResponse.data || [],
        platforms: platformsResponse.data || [],
        sponsors: sponsorsResponse.data || [],
        ads: adsResponse.data || [],
        specialOdds: specialOddsResponse.data || [],
    };
}

// Bahis İşlemleri
export async function addBet(betData: Omit<Bet, 'id' | 'created_at' | 'special_odds'>) {
    return await supabase.from('bets').insert(betData).select('*, special_odds(*)');
}

export async function updateBet(betId: number, updateData: Partial<Bet>) {
    return await supabase.from('bets').update(updateData).eq('id', betId).select('*, special_odds(*)');
}

export async function deleteBet(betId: number) {
    return await supabase.from('bets').delete().eq('id', betId);
}

export async function clearAllBetsForUser(userId: string) {
    return await supabase.from('bets').delete().eq('user_id', userId);
}


// Platform İşlemleri
export async function addPlatform(platformData: { name: string; user_id: string }) {
    return await supabase.from('platforms').insert(platformData).select();
}

export async function deletePlatform(platformId: number) {
    return await supabase.from('platforms').delete().eq('id', platformId);
}

export async function clearAllPlatformsForUser(userId: string) {
    return await supabase.from('platforms').delete().eq('user_id', userId);
}

// Sponsor İşlemleri (Admin)
export async function addSponsor(sponsorData: Omit<Sponsor, 'id' | 'created_at'>) {
    return await supabase.from('sponsors').insert(sponsorData).select();
}

export async function deleteSponsor(sponsorId: number) {
    return await supabase.from('sponsors').delete().eq('id', sponsorId);
}

// Reklam İşlemleri (Admin)
export async function addAd(adData: Omit<Ad, 'id' | 'created_at'>) {
    return await supabase.from('ads').insert(adData).select();
}

export async function deleteAd(adId: number) {
    return await supabase.from('ads').delete().eq('id', adId);
}

// ÖZEL ORAN İŞLEMLERİ (Admin)
export async function addSpecialOdd(oddData: Omit<SpecialOdd, 'id' | 'created_at' | 'play_count' | 'is_active' | 'resulted_at'>) {
    return await supabase.from('special_odds').insert(oddData).select();
}

export async function updateSpecialOdd(oddId: number, updateData: Partial<SpecialOdd>) {
    return await supabase.from('special_odds').update(updateData).eq('id', oddId).select();
}