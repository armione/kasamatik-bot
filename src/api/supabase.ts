import { createClient, Session, User } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/constants';
import { showNotification } from '../utils/helpers';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getSupabase() {
    return supabase;
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 6 karakter):");
            if (newPassword && newPassword.length >= 6) {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                    showNotification(`Şifre güncellenemedi: ${error.message}`, 'error');
                } else {
                    showNotification('Şifreniz başarıyla güncellendi!', 'success');
                }
            } else if (newPassword) {
                 showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
            }
        }
        callback(event, session);
    });
}

export async function signUp(email: string, password: string): Promise<{ data: { user: User | null, session: Session | null }, error: any }> {
    return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string): Promise<{ data: { user: User | null, session: Session | null }, error: any }> {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut(): Promise<{ error: any }> {
    return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string): Promise<{ data: {}, error: any }> {
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, 
    });
}

export async function updateUserPassword(newPassword: string): Promise<{ data: { user: User | null }, error: any }> {
    return supabase.auth.updateUser({ password: newPassword });
}
