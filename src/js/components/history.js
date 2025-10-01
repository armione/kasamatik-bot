import { state, updateState } from '../state.js';
import { ITEMS_PER_PAGE } from '../utils/constants.js';

// --- ANA RENDER FONKSİYONU ---
export function renderHistory() {
    // 1. Tüm Filtreleri Uygula
    const filteredBets = getFilteredBets();
    
    // 2. Filtrelenmiş Veriye Göre Özet Kartlarını Güncelle
    renderHistorySummary(filteredBets);

    // 3. Filtrelenmiş Listenin Sayfalanmış Halini Göster
    renderPaginatedBetList(filteredBets);
}

// --- YARDIMCI FONKSİYONLAR ---

function getFilteredBets() {
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    
    const statusFilter = document.getElementById('status-filter').value;
    const platformFilter = document.getElementById('platform-filter').value;
    const searchFilter = document.getElementById('search-filter').value.toLowerCase();
    const startDate = document.getElementById('start-date-filter').value;
    const endDate = document.getElementById('end-date-filter').value;

    return actualBets.filter(bet => {
        const statusMatch = statusFilter === 'all' || bet.status === statusFilter;
        const platformMatch = platformFilter === 'all' || bet.platform === platformFilter;
        const searchMatch = !searchFilter || bet.description.toLowerCase().includes(searchFilter);
        const dateMatch = (!startDate || bet.date >= startDate) && (!endDate || bet.date <= endDate);

        return statusMatch && platformMatch && searchMatch && dateMatch;
    });
}

function renderHistorySummary(filteredBets) {
    const container = document.getElementById('history-summary-cards');
    if (!container) return;

    const totalInvested = filteredBets.reduce((sum, bet) => sum + bet.bet_amount, 0);
    const netProfit = filteredBets.reduce((sum, bet) => sum + bet.profit_loss, 0);
    const betCount = filteredBets.length;
    const wonBets = filteredBets.filter(b => b.status === 'won').length;
    const settledBets = filteredBets.filter(b => b.status !== 'pending').length;
    const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;

    const netProfitColor = netProfit > 0 ? 'text-green-400' : netProfit < 0 ? 'text-red-400' : 'text-gray-300';
    
    container.innerHTML = `
        <div class="glass-card rounded-xl p-4 text-center">
            <div class="text-2xl font-bold mb-1">${betCount}</div>
            <div class="text-xs text-gray-400">Bahis Sayısı</div>
        </div>
        <div class="glass-card rounded-xl p-4 text-center">
            <div class="text-2xl font-bold mb-1">${totalInvested.toFixed(2)} ₺</div>
            <div class="text-xs text-gray-400">Toplam Yatırım</div>
        </div>
        <div class="glass-card rounded-xl p-4 text-center">
            <div class="text-2xl font-bold mb-1 ${netProfitColor}">${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} ₺</div>
            <div class="text-xs text-gray-400">Net Kar/Zarar</div>
        </div>
        <div class="glass-card rounded-xl p-4 text-center">
            <div class="text-2xl font-bold mb-1 text-green-400">${winRate.toFixed(1)}%</div>
            <div class="text-xs text-gray-400">Kazanma Oranı</div>
        </div>
    `;
}

function renderPaginatedBetList(filteredBets) {
    const historyContainer = document.getElementById('bet-history');
    const paginationContainer = document.getElementById('pagination-container');

    if (filteredBets.length === 0) {
        historyContainer.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">📝</div><p class="text-xl">Bu kriterlere uygun bahis bulunmuyor.</p></div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
    const paginatedBets = filteredBets.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE);
    
    historyContainer.innerHTML = paginatedBets.map(bet => {
        const statusClass = { pending: 'pending', won: 'won', lost: 'lost' };
        const statusText = { pending: '⏳ Bekleyen', won: '✅ Kazandı', lost: '❌ Kaybetti' };
        const profitColor = bet.profit_loss > 0 ? 'text-green-400' : bet.profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
        const betTypeIcon = { 'Spor Bahis': '⚽', 'Canlı Bahis': '🔴' };
        let actionButtons = (bet.status === 'pending')
            ? `<button data-action="open-edit-modal" data-id="${bet.id}" class="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">✏️ Sonuçlandır</button>`
            : `<button data-action="open-edit-modal" data-id="${bet.id}" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">✏️ Düzenle</button>`;

        return `
        <div class="bet-card ${statusClass[bet.status]}">
            <div class="flex flex-col space-y-4">
                <div class="flex justify-between items-start">
                    <div class="flex items-center space-x-3">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">${betTypeIcon[bet.bet_type] || '🎯'}</div>
                        <div>
                            <h3 class="font-bold text-white text-lg">${bet.platform}</h3>
                            <p class="text-gray-400 text-sm">${bet.bet_type}</p>
                        </div>
                    </div>
                    <span class="px-4 py-2 rounded-full text-sm font-medium ${statusClass[bet.status]}">${statusText[bet.status]}</span>
                </div>
                <div class="bg-gray-800 bg-opacity-30 rounded-lg p-3"><p>${bet.description}</p></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Tarih</div><div class="font-semibold">${new Date(bet.date + 'T00:00:00').toLocaleDateString('tr-TR')}</div></div>
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Miktar</div><div class="font-semibold">${bet.bet_amount.toFixed(2)} ₺</div></div>
                    ${bet.bet_type !== 'Slot' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Oran</div><div class="font-semibold">${bet.odds}</div></div>` : ''}
                    ${bet.status !== 'pending' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold ${profitColor}">${bet.profit_loss >= 0 ? '+' : ''}${bet.profit_loss.toFixed(2)} ₺</div></div>` : ''}
                </div>
                ${bet.image_url ? `<div class="flex justify-center"><img src="${bet.image_url}" class="max-w-48 max-h-32 rounded-xl cursor-pointer" data-action="show-image-modal" data-src="${bet.image_url}"></div>` : ''}
                <div class="flex gap-3 pt-4 border-t border-gray-600">
                    ${actionButtons}
                    <button data-action="delete-bet" data-id="${bet.id}" class="px-4 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️ Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    renderPagination('bets', totalPages, state.currentPage, 'changeBetPage');
}

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

export function renderCashHistory() {
    const cashTransactions = state.bets.filter(bet => bet.bet_type === 'Kasa İşlemi');
    updateCashHistoryStats(cashTransactions);

    const container = document.getElementById('cash-history-list');
    if (cashTransactions.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">💸</div><p class="text-xl">Henüz kasa işlemi bulunmuyor.</p></div>`;
        document.getElementById('cash-pagination-container').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(cashTransactions.length / ITEMS_PER_PAGE);
    const paginatedTxs = cashTransactions.slice((state.cashCurrentPage - 1) * ITEMS_PER_PAGE, state.cashCurrentPage * ITEMS_PER_PAGE);
    
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
                            <h3 class="font-bold text-white">${tx.description}</h3>
                            <p class="text-sm text-gray-400">${new Date(tx.date + 'T00:00:00').toLocaleDateString('tr-TR')}</p>
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
    document.getElementById('cash-history-deposit').textContent = `+${totalDeposit.toFixed(2)} ₺`;
    document.getElementById('cash-history-withdrawal').textContent = `-${totalWithdrawal.toFixed(2)} ₺`;
    document.getElementById('cash-history-net').textContent = `${(totalDeposit - totalWithdrawal).toFixed(2)} ₺`;
    document.getElementById('cash-history-count').textContent = transactions.length;
}
