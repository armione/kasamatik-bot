import { state } from '../state.js';

export function updateDashboardStats() {
    const actualBets = state.bets.filter(b => b.bet_type !== 'Kasa İşlemi');
    const totalProfit = actualBets.reduce((sum, bet) => sum + (bet.profit_loss > 0 ? bet.profit_loss : 0), 0);
    const totalLoss = Math.abs(actualBets.reduce((sum, bet) => sum + (bet.profit_loss < 0 ? bet.profit_loss : 0), 0));
    const totalBankroll = state.bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);

    document.getElementById('total-bets').textContent = actualBets.length;
    document.getElementById('total-profit').textContent = `+${totalProfit.toFixed(2)} ₺`;
    document.getElementById('total-loss').textContent = `-${totalLoss.toFixed(2)} ₺`;
    
    const bankrollEl = document.getElementById('total-bankroll');
    bankrollEl.textContent = `${totalBankroll.toFixed(2)} ₺`;
    bankrollEl.className = `text-2xl font-montserrat font-bold ${totalBankroll >= 0 ? 'text-green-400' : 'text-red-400'}`;
}

export function renderRecentBets() {
    const container = document.getElementById('recent-bets');
    if (!container) return;

    const recentBets = state.bets.filter(b => b.bet_type !== 'Kasa İşlemi').slice(0, 5);
    if (recentBets.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-400">📝 Henüz bahis yok.</div>`;
        return;
    }
    container.innerHTML = recentBets.map(bet => {
        const statusClass = { pending: 'status-pending', won: 'status-won', lost: 'status-lost' };
        const statusText = { pending: '⏳', won: '✅', lost: '❌' };
        const profitColor = bet.profit_loss > 0 ? 'text-green-400' : bet.profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
        return `
            <div class="bet-item">
                <div class="flex justify-between items-center">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="font-medium text-white text-sm">${bet.platform}</span>
                            <span class="px-2 py-1 rounded-full text-xs ${statusClass[bet.status]}">${statusText[bet.status]}</span>
                        </div>
                        <p class="text-gray-300 text-xs truncate">${bet.description}</p>
                    </div>
                    <div class="text-right ml-2">
                        <div class="font-bold text-sm">${bet.bet_amount.toFixed(2)} ₺</div>
                        ${bet.status !== 'pending' ? `<div class="font-bold ${profitColor} text-sm">${bet.profit_loss >= 0 ? '+' : ''}${bet.profit_loss.toFixed(2)} ₺</div>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

export function renderDashboardBannerAd() {
    const dashboardAdBanner = document.getElementById('dashboard-ad-banner');
    if (!dashboardAdBanner) return;

    const bannerAd = state.ads.find(ad => ad.location === 'dashboard_banner');
    if (bannerAd) {
        dashboardAdBanner.innerHTML = `
            <a href="${bannerAd.target_url}" target="_blank" rel="noopener noreferrer">
                <img src="${bannerAd.image_url}" alt="Reklam" class="rounded-2xl w-full object-cover">
            </a>
        `;
        dashboardAdBanner.style.display = 'block';
    } else {
        dashboardAdBanner.innerHTML = '';
        dashboardAdBanner.style.display = 'none';
    }
}