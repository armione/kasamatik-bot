// src/lib/utils.ts
import { Bet } from '../types';

/**
 * Bir bahsin kar/zarar durumunu, özel oran olup olmamasına göre doğru bir şekilde hesaplar.
 * @param {Bet} bet - Bahis objesi.
 * @returns {number} Kar/Zarar tutarı.
 */
export function calculateProfitLoss(bet: Bet): number {
  if (!bet) return 0;

  // Kasa işlemleri, profit_loss değerini doğrudan içerir.
  if (bet.bet_type === 'Kasa İşlemi') {
    return bet.profit_loss;
  }

  const isSpecialOdd = !!bet.special_odd_id;
  // Join ile special_odds verisi gelmemişse, ana bet objesindeki status'u kullan.
  const status = isSpecialOdd && bet.special_odds ? bet.special_odds.status : bet.status;

  if (status === 'pending' || status === 'refunded') return 0;

  if (status === 'won') {
    // Özel oranların kazancı, ana bet'in oranından hesaplanır.
    if (isSpecialOdd) {
      return (bet.bet_amount * bet.odds) - bet.bet_amount;
    }
    // Normal bahislerin kazancı, win_amount'tan hesaplanır.
    return bet.win_amount - bet.bet_amount;
  }

  if (status === 'lost') {
    return -bet.bet_amount;
  }

  // Varsayılan olarak 0 döndür, beklenmedik bir durum için.
  return 0;
}
