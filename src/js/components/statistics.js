import { state } from '../state.js';

/**
 * İstatistikler sayfası için tarih filtrelerini okur ve ilgili bahisleri döndürür.
 * @returns {Array} Tarihe göre filtrelenmiş bahisler dizisi.
 */
function getFilteredStatsBets() {
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    
    const startDate = document.getElementById('stats-start-date-filter').value;
    const endDate = document.getElementById('stats-end-date-filter').value;

    return actualBets.filter(bet => {
        return (!startDate || bet.date >= startDate) && (!endDate || bet.date <= endDate);
    });
}

/**
 * İstatistikler sayfasını filtrelenmiş verilere göre yeniden oluşturan ana fonksiyon.
 */
export function renderStatistics() {
    const filteredBets = getFilteredStatsBets();
    updateStatisticsCards(filteredBets);
    updateCharts(filteredBets);
}

/**
 * Filtrelenmiş bahis verilerine göre istatistik kartlarını günceller.
 * @param {Array} actualBets Hesaplanacak bahisler.
 */
function updateStatisticsCards(actualBets) {
    if (!document.getElementById('statistics')) return;

    if (actualBets.length === 0) {
        document.getElementById('stats-total-bets').textContent = '0';
        document.getElementById('stats-bet-breakdown').textContent = `Spor: 0 | Canlı: 0`;
        document.getElementById('stats-win-rate').textContent = `0.0%`;
        document.getElementById('stats-win-breakdown').textContent = `Kazanan: 0 | Kaybeden: 0`;
        document.getElementById('stats-avg-odds').textContent = '0.00';
        document.getElementById('stats-odds-range').textContent = `En düşük: 0.00 | En yüksek: 0.00`;
        document.getElementById('stats-roi').textContent = `0.0%`;
        document.getElementById('stats-roi-breakdown').textContent = `Yatırım: 0.00₺ | Net kar: 0.00₺`;
        document.getElementById('stats-roi').style.color = 'var(--success-green)';
        document.getElementById('stats-avg-bet').textContent = `0.00₺`;
        document.getElementById('stats-bet-range').textContent = `En düşük: 0.00₺ | En yüksek: 0.00₺`;
        document.getElementById('stats-best-platform').textContent = '-';
        document.getElementById('stats-platform-profit').textContent = `Kar: 0.00₺`;
        return;
    }

    const settledBets = actualBets.filter(b => b.status !== 'pending');
    const wonBets = settledBets.filter(b => b.status === 'won');
    
    document.getElementById('stats-total-bets').textContent = actualBets.length;
    const sportsBetsCount = actualBets.filter(b => b.bet_type === 'Spor Bahis').length;
    const liveBetsCount = actualBets.filter(b => b.bet_type === 'Canlı Bahis').length;
    document.getElementById('stats-bet-breakdown').textContent = `Spor: ${sportsBetsCount} | Canlı: ${liveBetsCount}`;
    
    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
    document.getElementById('stats-win-rate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('stats-win-breakdown').textContent = `Kazanan: ${wonBets.length} | Kaybeden: ${settledBets.length - wonBets.length}`;
    
    const sportsBets = actualBets.filter(b => (b.bet_type === 'Spor Bahis' || b.bet_type === 'Canlı Bahis') && b.odds > 0);
    const avgOdds = sportsBets.length > 0 ? sportsBets.reduce((sum, b) => sum + b.odds, 0) / sportsBets.length : 0;
    document.getElementById('stats-avg-odds').textContent = avgOdds.toFixed(2);
    const odds = sportsBets.map(b => b.odds);
    document.getElementById('stats-odds-range').textContent = `En düşük: ${odds.length ? Math.min(...odds).toFixed(2) : '0.00'} | En yüksek: ${odds.length ? Math.max(...odds).toFixed(2) : '0.00'}`;
    
    const totalInvested = actualBets.reduce((sum, b) => sum + b.bet_amount, 0);
    const netProfit = actualBets.reduce((sum, b) => sum + b.profit_loss, 0);
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
    document.getElementById('stats-roi').textContent = `${roi.toFixed(1)}%`;
    document.getElementById('stats-roi-breakdown').textContent = `Yatırım: ${totalInvested.toFixed(2)}₺ | Net kar: ${netProfit.toFixed(2)}₺`;
    document.getElementById('stats-roi').style.color = roi >= 0 ? 'var(--success-green)' : 'var(--danger-red)';
    
    const avgBet = actualBets.length > 0 ? totalInvested / actualBets.length : 0;
    document.getElementById('stats-avg-bet').textContent = `${avgBet.toFixed(2)}₺`;
    const amounts = actualBets.map(b => b.bet_amount);
    document.getElementById('stats-bet-range').textContent = `En düşük: ${amounts.length ? Math.min(...amounts).toFixed(2) : '0.00'}₺ | En yüksek: ${amounts.length ? Math.max(...amounts).toFixed(2) : '0.00'}₺`;
    
    const platformProfits = {};
    actualBets.forEach(bet => {
        if (!platformProfits[bet.platform]) platformProfits[bet.platform] = 0;
        platformProfits[bet.platform] += bet.profit_loss;
    });
    const bestPlatform = Object.entries(platformProfits).sort((a, b) => b[1] - a[1])[0];
    if (bestPlatform && bestPlatform[1] > 0) {
        document.getElementById('stats-best-platform').textContent = bestPlatform[0];
        document.getElementById('stats-platform-profit').textContent = `Kar: +${bestPlatform[1].toFixed(2)}₺`;
    } else {
        document.getElementById('stats-best-platform').textContent = '-';
        document.getElementById('stats-platform-profit').textContent = `Kar: 0.00₺`;
    }
}

/**
 * Filtrelenmiş bahis verilerine göre grafikleri günceller.
 * @param {Array} actualBets Çizdirilecek bahisler.
 */
export function updateCharts(actualBets) {
    const profitCtx = document.getElementById('profitChart')?.getContext('2d');
    const platformCtx = document.getElementById('platformChart')?.getContext('2d');

    if (!profitCtx || !platformCtx) return;

    if (state.profitChart) state.profitChart.destroy();
    if (state.platformChart) state.platformChart.destroy();

    if (actualBets.length === 0) {
        // Veri yoksa grafik çizme, canvas'ı boş bırak.
        return;
    }

    let cumulativeProfit = 0;
    const profitData = [...actualBets].reverse().map(bet => {
        cumulativeProfit += bet.profit_loss;
        return cumulativeProfit;
    });

    state.profitChart = new Chart(profitCtx, {
        type: 'line',
        data: {
            labels: [...actualBets].reverse().map((b, i) => `${i + 1}`),
            datasets: [{
                label: 'Kümülatif Kar/Zarar',
                data: profitData,
                borderColor: 'rgba(139, 179, 240, 0.8)',
                backgroundColor: 'rgba(139, 179, 240, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: 'rgba(255,255,255,0.7)' } },
                x: { ticks: { color: 'rgba(255,255,255,0.7)' } }
            }
        }
    });

    const platformCounts = actualBets.reduce((acc, bet) => {
        acc[bet.platform] = (acc[bet.platform] || 0) + 1;
        return acc;
    }, {});

    state.platformChart = new Chart(platformCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(platformCounts),
            datasets: [{
                label: 'Platformlara Göre Bahis Sayısı',
                data: Object.values(platformCounts),
                backgroundColor: ['#8db3f0', '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#a855f7'],
                borderColor: 'rgba(0,0,0,0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
             plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

