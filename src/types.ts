export interface Bet {
    id: number;
    created_at: string;
    user_id: string;
    bet_amount: number;
    odds: number;
    status: 'pending' | 'won' | 'lost' | 'refunded';
    platform: string;
    details: string;
    potential_return?: number;
    special_odd_id?: number;
    special_odds?: SpecialOdd; // İlişkili veri için
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
    image_url: string;
    link: string;
}

export interface Ad {
    id: number;
    created_at: string;
    title: string;
    description: string;
    link: string;
}

export interface SpecialOdd {
    id: number;
    created_at: string;
    platform: string;
    title: string;
    description: string;
    odds: number;
    status: 'pending' | 'won' | 'lost' | 'refunded';
    link: string;
    is_active: boolean;
    play_count: number;
    resulted_at?: string;
}
