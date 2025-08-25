import { BetData } from '../types/betting';
import { subDays, format } from 'date-fns';

// Generate mock betting data for the last 90 days
export const generateMockBetData = (): BetData[] => {
  const platforms = ['Bet365', 'Betfair', 'William Hill', 'Paddy Power', 'Unibet'];
  const betTypes = ['Futbol', 'Basketbol', 'Tenis', 'Voleybol', 'E-Spor'];
  const data: BetData[] = [];

  for (let i = 0; i < 90; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const dailyBets = Math.floor(Math.random() * 8) + 2; // 2-10 bets per day

    for (let j = 0; j < dailyBets; j++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
      const amount = Math.floor(Math.random() * 500) + 50; // 50-550 TL
      const odds = Math.random() * 4 + 1.2; // 1.2-5.2 odds
      const result = Math.random() > 0.45 ? 'win' : 'loss'; // 55% win rate
      
      data.push({
        id: `${date}-${j}`,
        date,
        platform,
        betType,
        amount,
        result,
        odds,
        payout: result === 'win' ? amount * odds : 0
      });
    }
  }

  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const mockBetData = generateMockBetData();