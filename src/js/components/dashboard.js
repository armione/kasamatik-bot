import { state } from '../state.js';

export function updateDashboardStats() {
    const actualBets = state.bets.filter(b => b.bet_type !== 'Kasa İşlemi');
    const totalBankroll = state.bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
    const netProfitLoss = actualBets.reduce((sum, bet) => sum + bet.profit_loss, 0);
    const totalInvestment = actualBets.reduce((sum, bet) => sum + bet.bet_amount, 0);

    document.getElementById('total-bets').textContent = actualBets.length;
    document.getElementById('total-investment').textContent = `${totalInvestment.toFixed(2)} ₺`;

    const bankrollEl = document.getElementById('total-bankroll');
    bankrollEl.textContent = `${totalBankroll.toFixed(2)} ₺`;
    bankrollEl.className = `text-2xl font-montserrat font-bold ${totalBankroll >= 0 ? 'text-green-400' : 'text-red-400'}`;
    
    const netProfitLossEl = document.getElementById('net-profit-loss');
    netProfitLossEl.textContent = `${netProfitLoss >= 0 ? '+' : ''}${netProfitLoss.toFixed(2)} ₺`;
    netProfitLossEl.className = `text-2xl font-montserrat font-bold ${netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`;
}

export function updatePerformanceSummary() {
    const period = state.dashboardPeriod;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (period - 1));
    startDate.setHours(0, 0, 0, 0);

    const periodBets = state.bets.filter(bet => {
        const betDate = new Date(bet.date);
        return bet.bet_type !== 'Kasa İşlemi' && betDate >= startDate && betDate <= endDate;
    });

    const totalPlayed = periodBets.reduce((sum, bet) => sum + bet.bet_amount, 0);
    const netResult = periodBets.reduce((sum, bet) => sum + bet.profit_loss, 0);

    document.getElementById('summary-total-played').textContent = `${totalPlayed.toFixed(2)} ₺`;
    const netResultEl = document.getElementById('summary-net-result');
    netResultEl.textContent = `${netResult >= 0 ? '+' : ''}${netResult.toFixed(2)} ₺`;
    netResultEl.className = `text-2xl font-montserrat font-bold ${netResult >= 0 ? 'text-green-400' : 'text-red-400'}`;

    document.querySelectorAll('#performance-period-buttons .period-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.period) === period);
    });
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

export function initializeVisitorCounter() {
    const counterElement = document.getElementById('visitor-counter');
    if (!counterElement) return;

    let visitorCount = localStorage.getItem('visitorCount');

    const baseCount = 1200;
    const minIncrement = 1;
    const maxIncrement = 3;
    const updateInterval = 3000;

    if (!visitorCount || isNaN(visitorCount)) {
        visitorCount = baseCount + Math.floor(Math.random() * 50);
    } else {
        visitorCount = parseInt(visitorCount);
    }

    counterElement.textContent = visitorCount;

    setInterval(() => {
        const increment = Math.floor(Math.random() * (maxIncrement - minIncrement + 1)) + minIncrement;
        visitorCount += increment;
        counterElement.textContent = visitorCount;
        localStorage.setItem('visitorCount', visitorCount);
    }, updateInterval);
}

