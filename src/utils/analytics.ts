import { BetData, DailyStats, PlatformStats, BetTypeStats } from '../types/betting';
import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';

export const calculateDailyStats = (bets: BetData[]): DailyStats[] => {
  const dailyMap = new Map<string, DailyStats>();

  bets.forEach(bet => {
    const date = bet.date;
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        earnings: 0,
        losses: 0,
        betCount: 0,
        netProfit: 0
      });
    }

    const stats = dailyMap.get(date)!;
    stats.betCount++;

    if (bet.result === 'win') {
      const profit = (bet.payout || 0) - bet.amount;
      stats.earnings += profit;
      stats.netProfit += profit;
    } else {
      stats.losses += bet.amount;
      stats.netProfit -= bet.amount;
    }
  });

  return Array.from(dailyMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const calculateWeeklyStats = (bets: BetData[]): DailyStats[] => {
  const weeklyMap = new Map<string, DailyStats>();

  bets.forEach(bet => {
    const weekStart = format(startOfWeek(parseISO(bet.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, {
        date: weekStart,
        earnings: 0,
        losses: 0,
        betCount: 0,
        netProfit: 0
      });
    }

    const stats = weeklyMap.get(weekStart)!;
    stats.betCount++;

    if (bet.result === 'win') {
      const profit = (bet.payout || 0) - bet.amount;
      stats.earnings += profit;
      stats.netProfit += profit;
    } else {
      stats.losses += bet.amount;
      stats.netProfit -= bet.amount;
    }
  });

  return Array.from(weeklyMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const calculateMonthlyStats = (bets: BetData[]): DailyStats[] => {
  const monthlyMap = new Map<string, DailyStats>();

  bets.forEach(bet => {
    const monthStart = format(startOfMonth(parseISO(bet.date)), 'yyyy-MM-dd');
    
    if (!monthlyMap.has(monthStart)) {
      monthlyMap.set(monthStart, {
        date: monthStart,
        earnings: 0,
        losses: 0,
        betCount: 0,
        netProfit: 0
      });
    }

    const stats = monthlyMap.get(monthStart)!;
    stats.betCount++;

    if (bet.result === 'win') {
      const profit = (bet.payout || 0) - bet.amount;
      stats.earnings += profit;
      stats.netProfit += profit;
    } else {
      stats.losses += bet.amount;
      stats.netProfit -= bet.amount;
    }
  });

  return Array.from(monthlyMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const calculatePlatformStats = (bets: BetData[]): PlatformStats[] => {
  const platformMap = new Map<string, PlatformStats>();

  bets.forEach(bet => {
    if (!platformMap.has(bet.platform)) {
      platformMap.set(bet.platform, {
        platform: bet.platform,
        totalBets: 0,
        totalEarnings: 0,
        totalLosses: 0,
        netProfit: 0,
        winRate: 0
      });
    }

    const stats = platformMap.get(bet.platform)!;
    stats.totalBets++;

    if (bet.result === 'win') {
      const profit = (bet.payout || 0) - bet.amount;
      stats.totalEarnings += profit;
      stats.netProfit += profit;
    } else {
      stats.totalLosses += bet.amount;
      stats.netProfit -= bet.amount;
    }
  });

  // Calculate win rates
  platformMap.forEach((stats, platform) => {
    const wins = bets.filter(bet => bet.platform === platform && bet.result === 'win').length;
    stats.winRate = (wins / stats.totalBets) * 100;
  });

  return Array.from(platformMap.values()).sort((a, b) => b.netProfit - a.netProfit);
};

export const calculateBetTypeStats = (bets: BetData[]): BetTypeStats[] => {
  const betTypeMap = new Map<string, BetTypeStats>();

  bets.forEach(bet => {
    if (!betTypeMap.has(bet.betType)) {
      betTypeMap.set(bet.betType, {
        betType: bet.betType,
        totalBets: 0,
        totalEarnings: 0,
        totalLosses: 0,
        netProfit: 0,
        winRate: 0
      });
    }

    const stats = betTypeMap.get(bet.betType)!;
    stats.totalBets++;

    if (bet.result === 'win') {
      const profit = (bet.payout || 0) - bet.amount;
      stats.totalEarnings += profit;
      stats.netProfit += profit;
    } else {
      stats.totalLosses += bet.amount;
      stats.netProfit -= bet.amount;
    }
  });

  // Calculate win rates
  betTypeMap.forEach((stats, betType) => {
    const wins = bets.filter(bet => bet.betType === betType && bet.result === 'win').length;
    stats.winRate = (wins / stats.totalBets) * 100;
  });

  return Array.from(betTypeMap.values()).sort((a, b) => b.netProfit - a.netProfit);
};