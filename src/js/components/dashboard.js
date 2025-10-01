import { state } from '../state.js';

export function updateDashboardStats() {
    // Bahis ve kasa işlemlerini ayır
    const allBetsAndTransactions = state.bets;
    const actualBets = allBetsAndTransactions.filter(b => b.bet_type !== 'Kasa İşlemi');

    // 1. Toplam Kasa (Mevcut Bakiye): Tüm işlemler (bahisler + para yatırma/çekme) sonrası net bakiye.
    const totalBankroll = allBetsAndTransactions.reduce((sum, transaction) => sum + (transaction.profit_loss || 0), 0);
    
    // 2. Net Kar/Zarar: SADECE bahislerden elde edilen toplam net kar veya zarar.
    const netProfit = actualBets.reduce((sum, bet) => sum + bet.profit_loss, 0);

    // 3. Toplam Yatırım: SADECE bahislere yatırılan toplam para.
    const totalStaked = actualBets.reduce((sum, bet) => sum + bet.bet_amount, 0);

    // 4. Toplam Bahis Sayısı
    const totalBetsCount = actualBets.length;

    // DOM Elementlerini Güncelle
    const bankrollEl = document.getElementById('total-bankroll');
    bankrollEl.textContent = `${totalBankroll.toFixed(2)} ₺`;
    bankrollEl.className = `text-2xl font-montserrat font-bold ${totalBankroll >= 0 ? 'text-green-400' : 'text-red-400'}`;

    const netProfitEl = document.getElementById('dashboard-net-profit');
    netProfitEl.textContent = `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} ₺`;
    netProfitEl.className = `text-2xl font-montserrat font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`;
    
    document.getElementById('dashboard-total-staked').textContent = `${totalStaked.toFixed(2)} ₺`;
    document.getElementById('total-bets').textContent = totalBetsCount;
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

// YENİ FONKSİYON: Ziyaretçi Sayacı
export function initializeVisitorCounter() {
    const counterElement = document.getElementById('visitor-counter');
    if (!counterElement) return;

    let visitorCount = localStorage.getItem('visitorCount');

    const baseCount = 1200;
    const minIncrement = 1;
    const maxIncrement = 3;
    const updateInterval = 3000; // 3 saniyede bir

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
