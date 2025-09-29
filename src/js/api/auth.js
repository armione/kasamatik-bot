import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/constants.js';
import { showNotification } from '../utils/helpers.js';

const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function onAuthStateChange(callback) {
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 6 karakter):");
            if (newPassword && newPassword.length >= 6) {
                const { error } = await _supabase.auth.updateUser({ password: newPassword });
                if (error) {
                    showNotification(`Şifre güncellenemedi: ${error.message}`, 'error');
                } else {
                    showNotification('Şifreniz başarıyla güncellendi!', 'success');
                }
            } else if (newPassword) {
                 showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
            }
        }
        callback(session);
    });
}

export async function signUp(email, password) {
    return await _supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
    return await _supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
    return await _supabase.auth.signOut();
}

export async function resetPasswordForEmail(email) {
    return await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href, 
    });
}

export async function updateUserPassword(newPassword) {
    return await _supabase.auth.updateUser({ password: newPassword });
}

export function getSupabase() {
    return _supabase;
}