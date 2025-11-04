// src/types/index.ts
// Uygulama genelindeki veri yapıları için TypeScript tanımlamaları

export interface SpecialOdd {
  id: number;
  created_at: string;
  description: string;
  odds: number;
  platform: string;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  max_bet_amount: number | null;
  primary_link_url: string | null;
  primary_link_text: string | null;
  secondary_link_url: string | null;
  secondary_link_text: string | null;
  play_count: number;
  is_active: boolean;
  resulted_at: string | null;
  telegram_message_id: number | null;
  matches: string[] | null;
}

export interface Bet {
  id: number;
  created_at: string;
  user_id: string;
  platform: string;
  bet_type: 'Spor Bahis' | 'Canlı Bahis' | 'Özel Oran' | 'Kasa İşlemi';
  description: string;
  bet_amount: number;
  odds: number;
  date: string;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  win_amount: number;
  profit_loss: number;
  special_odd_id: number | null;
  special_odds: SpecialOdd | null; // Supabase join sorgusu için
}

export interface Platform {
  id: number;
  name: string;
  user_id: string;
}

export interface Sponsor {
  id: number;
  created_at: string;
  name: string;
  logo_url: string;
  target_url: string;
}

export interface Ad {
  id: number;
  created_at: string;
  image_url: string;
  target_url: string;
  location: 'dashboard_banner' | 'login_popup';
}
