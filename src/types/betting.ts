export interface BetData {
  id: string;
  date: string;
  platform: string;
  betType: string;
  amount: number;
  result: 'win' | 'loss';
  odds: number;
  payout?: number;
}

export interface DailyStats {
  date: string;
  earnings: number;
  losses: number;
  betCount: number;
  netProfit: number;
}

export interface PlatformStats {
  platform: string;
  totalBets: number;
  totalEarnings: number;
  totalLosses: number;
  netProfit: number;
  winRate: number;
}

export interface BetTypeStats {
  betType: string;
  totalBets: number;
  totalEarnings: number;
  totalLosses: number;
  netProfit: number;
  winRate: number;
}