import { state, updateState } from '../state.js';
import { ITEMS_PER_PAGE } from '../utils/constants.js';

function renderPagination(type, totalPages, current, changeFnName) {
    const containerId = type === 'bets' ? 'pagination-container' : 'cash-pagination-container';
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    let html = `<button class="pagination-btn" ${current === 1 ? 'disabled' : ''} data-action="${changeFnName}" data-page="${current - 1}">←</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === current ? 'active' : ''}" data-action="${changeFnName}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pagination-btn" ${current === totalPages ? 'disabled' : ''} data-action="${changeFnName}" data-page="${current + 1}">→</button>`;
    container.innerHTML = html;
}

function applyFilters(bets) {
    const { status, platform, searchTerm, period } = state.filters;

    let dateFilteredBets = bets;
    if (period !== 'all') {
        const endDate = new Date();
        const startDate = new Date();

        // DÜZELTME (Görev 1.1): "Bugün" (period=1) seçeneği artık takvim günü yerine "son 24 saati" kapsıyor.
        // Bu, gece yarısı sonuçlanan bahislerin doğru periyotta görünmesini sağlar.
        if (period === 1) {
            startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
            startDate.setDate(endDate.getDate() - (period - 1));
            startDate.setHours(0, 0, 0, 0);
        }

        dateFilteredBets = bets.filter(bet => {
            const betDate = new Date(bet.date);
            return betDate >= startDate && betDate <= endDate;
        });
    }

    return dateFilteredBets.filter(bet => {
        const isSpecialOdd = !!bet.special_odd_id;
        const currentStatus = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

        const statusMatch = status === 'all' || currentStatus === status;
        const platformMatch = platform === 'all' || bet.platform === platform;
        const searchMatch = !searchTerm || bet.description.toLowerCase().includes(searchTerm.toLowerCase()) || (bet.tag && bet.tag.toLowerCase().includes(searchTerm.toLowerCase())); // Etiket araması eklendi

        return statusMatch && platformMatch && searchMatch;
    });
}

function updateHistorySummary(filteredBets) {
    const totalInvestment = filteredBets.reduce((sum, bet) => sum + bet.bet_amount, 0);

    const netProfit = filteredBets.reduce((sum, bet) => {
        const isSpecialOdd = !!bet.special_odd_id;
        const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

        if (status === 'pending' || status === 'refunded') return sum; // İade edilenleri de kar/zarara katma

        let profit = 0;
        if (status === 'won') {
            if(isSpecialOdd){
                profit = (bet.bet_amount * bet.odds) - bet.bet_amount;
            } else {
                profit = bet.win_amount - bet.bet_amount;
            }
        } else if (status === 'lost') {
            profit = -bet.bet_amount;
        }
        return sum + profit;
    }, 0);

    const settledBets = filteredBets.filter(b => {
        const isSpecialOdd = !!b.special_odd_id;
        const status = isSpecialOdd ? (b.special_odds?.status || 'pending') : b.status;
        return status === 'won' || status === 'lost'; // Sadece kazanan/kaybedenleri say
    });

    const wonBets = settledBets.filter(b => {
        const isSpecialOdd = !!b.special_odd_id;
        const status = isSpecialOdd ? (b.special_odds?.status || 'pending') : b.status;
        return status === 'won';
    });

    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;

    document.getElementById('filtered-bets-count').textContent = filteredBets.length;
    document.getElementById('filtered-total-investment').textContent = `${totalInvestment.toFixed(2)} ₺`;

    const netProfitEl = document.getElementById('filtered-net-profit');
    netProfitEl.textContent = `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} ₺`;
    netProfitEl.className = `text-2xl font-montserrat font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`;

    const winRateEl = document.getElementById('filtered-win-rate');
    winRateEl.textContent = `${winRate.toFixed(1)}%`;
    winRateEl.className = `text-2xl font-montserrat font-bold ${winRate >= 50 ? 'text-green-400' : (winRate > 0 ? 'text-yellow-400' : 'text-red-400')}`; // %0 ise kırmızı göster
}


export function renderHistory() {
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    let filteredBets = applyFilters(actualBets);

    updateHistorySummary(filteredBets);

    const historyContainer = document.getElementById('bet-history');
    if (!historyContainer) return; // Element yoksa çık

    if (filteredBets.length === 0) {
        historyContainer.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">📝</div><p class="text-xl">Bu filtrede bahis bulunmuyor.</p></div>`;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
    const paginatedBets = filteredBets.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE);

    historyContainer.innerHTML = paginatedBets.map(bet => {
        const isSpecialOdd = !!bet.special_odd_id;
        const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

        let profit_loss = 0;
        if (status === 'won') {
             if(isSpecialOdd){
                profit_loss = (bet.bet_amount * bet.odds) - bet.bet_amount;
            } else {
                profit_loss = bet.win_amount - bet.bet_amount;
            }
        } else if (status === 'lost') {
            profit_loss = -bet.bet_amount;
        }
        // İade durumunda kar/zarar 0'dır.

        const statusClass = { pending: 'pending', won: 'won', lost: 'lost', refunded: 'refunded' };
        const statusText = { pending: '⏳ Bekleyen', won: '✅ Kazandı', lost: '❌ Kaybetti', refunded: '↩️ İade Edildi'};
        const profitColor = profit_loss > 0 ? 'text-green-400' : profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
        const betTypeIcon = { 'Spor Bahis': '⚽', 'Canlı Bahis': '🔴', 'Özel Oran': '✨' };

        // GÖREV 3.2: Etiket varsa gösterilecek HTML'i hazırla
        const tagHtml = bet.tag ? `<span class="text-lg ml-2">${bet.tag}</span>` : '';

        // REVİZE EDİLDİ: Tek buton mantığı
        let editButtonHtml = '';
        if (isSpecialOdd) {
            // Özel oranlar kullanıcı tarafından düzenlenemez
            editButtonHtml = `<div class="flex-1 text-center text-sm text-gray-400 italic py-2">Sadece yönetici sonuçlandırabilir.</div>`;
        } else {
            // Normal bahisler her zaman düzenlenebilir (etiket ekleme/sonuç girme/düzeltme)
            editButtonHtml = `<button data-action="open-edit-modal" data-id="${bet.id}" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">✏️ Düzenle</button>`;
        }


        return `
        <div class="bet-card ${statusClass[status]}">
            <div class="flex flex-col space-y-4">
                <div class="flex justify-between items-start">
                    <div class="flex items-center space-x-3">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">${betTypeIcon[bet.bet_type] || '🎯'}</div>
                        <div>
                            <div class="flex items-center">
                                <h3 class="font-bold text-white text-lg">${bet.platform}</h3>
                                ${tagHtml} <!-- GÖREV 3.2: Etiket buraya eklendi -->
                            </div>
                            <p class="text-gray-400 text-sm">${bet.bet_type}</p>
                        </div>
                    </div>
                    <span class="px-4 py-2 rounded-full text-sm font-medium ${statusClass[status]}">${statusText[status]}</span>
                </div>
                <div class="bg-gray-800 bg-opacity-30 rounded-lg p-3"><p>${bet.description}</p></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Tarih</div><div class="font-semibold">${new Date(bet.date).toLocaleDateString('tr-TR')}</div></div>
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Miktar</div><div class="font-semibold">${bet.bet_amount.toFixed(2)} ₺</div></div>
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Oran</div><div class="font-semibold">${bet.odds}</div></div>
                    ${status !== 'pending' && status !== 'refunded' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold ${profitColor}">${profit_loss >= 0 ? '+' : ''}${profit_loss.toFixed(2)} ₺</div></div>` : (status === 'refunded' ? '<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold text-gray-400">0.00 ₺</div></div>' : '<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold text-gray-400">-</div></div>')} <!-- İade durumu eklendi -->
                </div>
                <div class="flex gap-3 pt-4 border-t border-gray-600">
                    ${editButtonHtml} <!-- REVİZE EDİLDİ: Tek düzenle butonu -->
                    <button data-action="delete-bet" data-id="${bet.id}" class="px-4 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️ Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');

    renderPagination('bets', totalPages, state.currentPage, 'changeBetPage');
}

export function renderCashHistory() {
    const cashTransactions = state.bets.filter(bet => bet.bet_type === 'Kasa İşlemi');
    updateCashHistoryStats(cashTransactions);

    const container = document.getElementById('cash-history-list');
    if (!container) return; // Element yoksa çık

    if (cashTransactions.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">💸</div><p class="text-xl">Henüz kasa işlemi bulunmuyor.</p></div>`;
        document.getElementById('cash-pagination-container').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(cashTransactions.length / ITEMS_PER_PAGE);
    // Sıralamayı tersine çevirerek en yeni işlemleri başta göster
    const sortedTxs = [...cashTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginatedTxs = sortedTxs.slice((state.cashCurrentPage - 1) * ITEMS_PER_PAGE, state.cashCurrentPage * ITEMS_PER_PAGE);


    container.innerHTML = paginatedTxs.map(tx => {
        const isDeposit = tx.profit_loss > 0;
        const amountColor = isDeposit ? 'text-green-400' : 'text-red-400';
        const icon = isDeposit ? '📥' : '📤';
        return `
            <div class="bet-card">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">${icon}</div>
                        <div>
                            <h3 class="font-bold text-white">${tx.description}</h3> <!-- GÖREV 3.3: Artık kullanıcı notu burada görünecek -->
                            <p class="text-sm text-gray-400">${new Date(tx.date).toLocaleDateString('tr-TR')} ${new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p> <!-- Saat bilgisi eklendi -->
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <p class="text-lg font-bold ${amountColor}">${tx.profit_loss > 0 ? '+' : ''}${tx.profit_loss.toFixed(2)} ₺</p>
                        <button data-action="delete-bet" data-id="${tx.id}" class="px-3 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    renderPagination('cash', totalPages, state.cashCurrentPage, 'changeCashPage');
}

function updateCashHistoryStats(transactions) {
    const totalDeposit = transactions.reduce((sum, tx) => sum + (tx.profit_loss > 0 ? tx.profit_loss : 0), 0);
    const totalWithdrawal = Math.abs(transactions.reduce((sum, tx) => sum + (tx.profit_loss < 0 ? tx.profit_loss : 0), 0));
    const netBalance = totalDeposit - totalWithdrawal; // Net bakiye hesaplaması

    const depositEl = document.getElementById('cash-history-deposit');
    const withdrawalEl = document.getElementById('cash-history-withdrawal');
    const netEl = document.getElementById('cash-history-net');
    const countEl = document.getElementById('cash-history-count');

    if (depositEl) depositEl.textContent = `+${totalDeposit.toFixed(2)} ₺`;
    if (withdrawalEl) withdrawalEl.textContent = `-${totalWithdrawal.toFixed(2)} ₺`;
    if (netEl) {
         netEl.textContent = `${netBalance.toFixed(2)} ₺`;
         // Net bakiye rengini ayarla
         netEl.classList.toggle('text-green-400', netBalance >= 0);
         netEl.classList.toggle('text-red-400', netBalance < 0);
    }
    if (countEl) countEl.textContent = transactions.length;
}


export function changeBetPage(page) {
    updateState({ currentPage: page });
    renderHistory();
    document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
}

export function changeCashPage(page) {
    updateState({ cashCurrentPage: page });
    renderCashHistory();
    document.getElementById('cash-history')?.scrollIntoView({ behavior: 'smooth' });
}

