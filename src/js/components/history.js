import { state, updateState } from '../state.js';
import { ITEMS_PER_PAGE } from '../utils/constants.js';
import { calculateProfitLoss } from '../utils/helpers.js'; // calculateProfitLoss import edildi

// Sabitler
const BET_TYPE_ICONS = { 'Spor Bahis': '⚽', 'Canlı Bahis': '🔴', 'Özel Oran': '✨', 'default': '🎯' };
const STATUS_CLASSES = { pending: 'pending', won: 'won', lost: 'lost', refunded: 'refunded' };
const STATUS_TEXTS = { pending: '⏳ Bekleyen', won: '✅ Kazandı', lost: '❌ Kaybetti', refunded: '↩️ İade Edildi'};
const CASH_ICONS = { deposit: '📥', withdrawal: '📤' }; // Kasa ikonları

/**
 * Sayfalamayı (pagination) render eder.
 * @param {'bets' | 'cash'} type - Sayfalamanın türü (bahisler veya kasa işlemleri).
 * @param {number} totalPages - Toplam sayfa sayısı.
 * @param {number} current - Aktif sayfa numarası.
 * @param {string} changeFnName - Sayfa değiştirme fonksiyonunun adı (event listener için).
 */
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

/**
 * Mevcut filtrelere göre bahis listesini filtreler.
 * @param {Array<object>} bets - Filtrelenecek bahisler dizisi.
 * @returns {Array<object>} Filtrelenmiş bahisler dizisi.
 */
function applyFilters(bets) {
    const { status, platform, searchTerm, period } = state.filters;
    
    let dateFilteredBets = bets;
    if (period !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        
        if (period === 1) {
            startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
            startDate.setDate(endDate.getDate() - (period - 1));
            startDate.setHours(0, 0, 0, 0);
        }

        dateFilteredBets = bets.filter(bet => {
            const betDate = new Date(bet.date);
            // Tarih kontrolü: Eğer betDate geçerli değilse filtrelemeyi atla (veya hata ver)
            if (isNaN(betDate.getTime())) {
                console.warn("Geçersiz tarih formatı:", bet);
                return false; // Geçersiz tarihli bahsi filtrele
            }
            return betDate >= startDate && betDate <= endDate;
        });
    }

    return dateFilteredBets.filter(bet => {
        const isSpecialOdd = !!bet.special_odd_id;
        const currentStatus = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

        const statusMatch = status === 'all' || currentStatus === status;
        const platformMatch = platform === 'all' || bet.platform === platform;
        const searchMatch = !searchTerm || (bet.description && bet.description.toLowerCase().includes(searchTerm.toLowerCase())); // Açıklama var mı kontrolü eklendi
        
        return statusMatch && platformMatch && searchMatch;
    });
}

/**
 * Bahis geçmişi sayfasındaki özet istatistikleri günceller.
 * @param {Array<object>} filteredBets - Filtrelenmiş bahisler dizisi.
 */
function updateHistorySummary(filteredBets) {
    const totalInvestment = filteredBets.reduce((sum, bet) => sum + (bet.bet_amount || 0), 0); // bet_amount kontrolü
    const netProfit = filteredBets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0); // calculateProfitLoss kullanıldı

    const settledBets = filteredBets.filter(b => {
        const isSpecialOdd = !!b.special_odd_id;
        const status = isSpecialOdd ? (b.special_odds?.status || 'pending') : b.status;
        return status !== 'pending' && status !== 'refunded'; // İade edilenleri de sayma
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
    winRateEl.className = `text-2xl font-montserrat font-bold ${winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`;
}

/**
 * Bahis geçmişini render eder. Artık HTML template kullanıyor.
 */
export function renderHistory() {
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    let filteredBets = applyFilters(actualBets);
    
    updateHistorySummary(filteredBets);

    const historyContainer = document.getElementById('bet-history');
    const template = document.getElementById('bet-card-template');

    // Template veya container yoksa veya bahis yoksa temizle ve çık
    if (!template || !historyContainer) {
        console.error('Bahis kartı template (#bet-card-template) veya history container (#bet-history) bulunamadı.');
        return;
    }

    historyContainer.innerHTML = ''; // Önceki içeriği temizle

    if (filteredBets.length === 0) {
        historyContainer.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">📝</div><p class="text-xl">Bu filtrede bahis bulunmuyor.</p></div>`;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
    // Güvenlik: currentPage'in geçerli aralıkta olduğundan emin ol
    if (state.currentPage < 1) state.currentPage = 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const paginatedBets = filteredBets.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE);
    
    const fragment = document.createDocumentFragment(); // Performans için fragment kullan

    paginatedBets.forEach(bet => {
        // Bahis objesinin geçerli olup olmadığını kontrol et
        if (!bet || typeof bet !== 'object') {
            console.warn("Geçersiz bahis objesi:", bet);
            return; // Bu bahsi atla
        }

        const isSpecialOdd = !!bet.special_odd_id;
        // special_odds verisi eksikse veya null ise default olarak pending kabul et
        const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : (bet.status || 'pending');
        const profit_loss = calculateProfitLoss(bet);

        // Template'i klonla
        const clone = template.content.cloneNode(true);
        
        // Elementleri seç ve doldur (querySelector yerine find içinde kullanmak daha güvenli olabilir)
        const cardRoot = clone.querySelector('[data-field="bet-card-root"]');
        const betTypeIconEl = clone.querySelector('[data-field="bet-type-icon"]');
        const platformEl = clone.querySelector('[data-field="platform"]');
        const betTypeNameEl = clone.querySelector('[data-field="bet-type-name"]');
        const statusBadgeEl = clone.querySelector('[data-field="status-badge"]');
        const descriptionEl = clone.querySelector('[data-field="description"]');
        const dateEl = clone.querySelector('[data-field="date"]');
        const amountEl = clone.querySelector('[data-field="amount"]');
        const oddsEl = clone.querySelector('[data-field="odds"]');
        const profitLossBoxEl = clone.querySelector('[data-field="profit-loss-box"]');
        const profitLossValueEl = clone.querySelector('[data-field="profit-loss-value"]');
        const actionButtonsContainerEl = clone.querySelector('[data-field="action-buttons"]');
        const editButtonEl = clone.querySelector('[data-field="edit-button"]');
        const specialOddNoteEl = clone.querySelector('[data-field="special-odd-note"]');
        const deleteButtonEl = clone.querySelector('[data-field="delete-button"]');

        // Ana kartın durum sınıfını ayarla (önceki sınıfları temizle)
        cardRoot.classList.remove(...Object.values(STATUS_CLASSES));
        cardRoot.classList.add(STATUS_CLASSES[status] || STATUS_CLASSES.pending); // Default pending

        // İçerikleri doldur (null/undefined kontrolü ekle)
        betTypeIconEl.textContent = BET_TYPE_ICONS[bet.bet_type] || BET_TYPE_ICONS['default'];
        platformEl.textContent = bet.platform || 'Bilinmeyen Platform';
        betTypeNameEl.textContent = bet.bet_type || 'Bilinmeyen Tür';
        statusBadgeEl.textContent = STATUS_TEXTS[status] || STATUS_TEXTS.pending;
        statusBadgeEl.className = `px-4 py-2 rounded-full text-sm font-medium ${STATUS_CLASSES[status] || STATUS_CLASSES.pending}`; // Durum sınıfını ayarla
        descriptionEl.textContent = bet.description || 'Açıklama yok';
        
        // Tarih formatlama (null/undefined/geçersiz tarih kontrolü ekle)
        const betDate = bet.date ? new Date(bet.date) : null;
        dateEl.textContent = (betDate && !isNaN(betDate.getTime())) ? betDate.toLocaleDateString('tr-TR') : 'Geçersiz Tarih';

        amountEl.textContent = `${(bet.bet_amount || 0).toFixed(2)} ₺`; // Default 0
        oddsEl.textContent = bet.odds || 'N/A'; // Oran yoksa N/A yaz

        // Kar/Zarar gösterimi
        if (status !== 'pending') {
            profitLossValueEl.textContent = `${profit_loss >= 0 ? '+' : ''}${profit_loss.toFixed(2)} ₺`;
            profitLossValueEl.className = `font-bold ${profit_loss > 0 ? 'text-green-400' : profit_loss < 0 ? 'text-red-400' : 'text-gray-400'}`;
            profitLossBoxEl.classList.remove('hidden');
        } else {
             profitLossBoxEl.classList.add('hidden');
        }

        // Aksiyon Butonları
        if (isSpecialOdd) {
            specialOddNoteEl.classList.remove('hidden');
            actionButtonsContainerEl.classList.add('hidden');
        } else if (status === 'pending') {
            editButtonEl.textContent = '✏️ Sonuçlandır';
            editButtonEl.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            editButtonEl.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
            editButtonEl.dataset.id = bet.id; // ID'yi butona ekle
            actionButtonsContainerEl.classList.remove('hidden');
            specialOddNoteEl.classList.add('hidden');
        } else {
            editButtonEl.textContent = '✏️ Düzenle';
            editButtonEl.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            editButtonEl.classList.add('bg-blue-600', 'hover:bg-blue-700');
            editButtonEl.dataset.id = bet.id; // ID'yi butona ekle
            actionButtonsContainerEl.classList.remove('hidden');
            specialOddNoteEl.classList.add('hidden');
        }
        
        deleteButtonEl.dataset.id = bet.id; // ID'yi silme butonuna ekle

        fragment.appendChild(clone);
    });
    
    historyContainer.appendChild(fragment); // Tüm kartları tek seferde ekle
    renderPagination('bets', totalPages, state.currentPage, 'changeBetPage');
}

/**
 * Kasa geçmişini render eder. Artık HTML template kullanıyor.
 */
export function renderCashHistory() {
    const cashTransactions = state.bets.filter(bet => bet.bet_type === 'Kasa İşlemi');
    updateCashHistoryStats(cashTransactions);

    const container = document.getElementById('cash-history-list');
    const template = document.getElementById('cash-history-item-template');

    // Template veya container yoksa temizle ve çık
    if (!template || !container) {
        console.error('Kasa geçmişi template (#cash-history-item-template) veya container (#cash-history-list) bulunamadı.');
        return;
    }

    container.innerHTML = ''; // Önceki içeriği temizle

    if (cashTransactions.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">💸</div><p class="text-xl">Henüz kasa işlemi bulunmuyor.</p></div>`;
        document.getElementById('cash-pagination-container').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(cashTransactions.length / ITEMS_PER_PAGE);
     // Güvenlik: cashCurrentPage'in geçerli aralıkta olduğundan emin ol
    if (state.cashCurrentPage < 1) state.cashCurrentPage = 1;
    if (state.cashCurrentPage > totalPages) state.cashCurrentPage = totalPages;
    const paginatedTxs = cashTransactions.slice((state.cashCurrentPage - 1) * ITEMS_PER_PAGE, state.cashCurrentPage * ITEMS_PER_PAGE);
    
    const fragment = document.createDocumentFragment();

    paginatedTxs.forEach(tx => {
         // Kasa işlemi objesinin geçerli olup olmadığını kontrol et
        if (!tx || typeof tx !== 'object') {
            console.warn("Geçersiz kasa işlemi objesi:", tx);
            return; // Bu işlemi atla
        }

        const isDeposit = tx.profit_loss > 0;
        
        // Template'i klonla
        const clone = template.content.cloneNode(true);

        // Elementleri seç
        const iconEl = clone.querySelector('[data-field="icon"]');
        const descriptionEl = clone.querySelector('[data-field="description"]');
        const dateEl = clone.querySelector('[data-field="date"]');
        const amountEl = clone.querySelector('[data-field="amount"]');
        const deleteButtonEl = clone.querySelector('[data-field="delete-button"]');

        // İçerikleri doldur
        iconEl.textContent = isDeposit ? CASH_ICONS.deposit : CASH_ICONS.withdrawal;
        descriptionEl.textContent = tx.description || (isDeposit ? 'Para Ekleme' : 'Para Çekme'); // Default açıklama
        
        // Tarih formatlama (null/undefined/geçersiz tarih kontrolü ekle)
        const txDate = tx.date ? new Date(tx.date) : null;
        dateEl.textContent = (txDate && !isNaN(txDate.getTime())) ? txDate.toLocaleDateString('tr-TR') : 'Geçersiz Tarih';
        
        amountEl.textContent = `${tx.profit_loss > 0 ? '+' : ''}${(tx.profit_loss || 0).toFixed(2)} ₺`; // Default 0
        amountEl.className = `text-lg font-bold ${isDeposit ? 'text-green-400' : 'text-red-400'}`;
        
        deleteButtonEl.dataset.id = tx.id; // ID'yi silme butonuna ekle

        fragment.appendChild(clone);
    });

    container.appendChild(fragment); // Tüm öğeleri tek seferde ekle
    renderPagination('cash', totalPages, state.cashCurrentPage, 'changeCashPage');
}

/**
 * Kasa geçmişi sayfasındaki istatistikleri günceller.
 * @param {Array<object>} transactions - Kasa işlemleri dizisi.
 */
function updateCashHistoryStats(transactions) {
    const totalDeposit = transactions.reduce((sum, tx) => sum + (tx.profit_loss > 0 ? (tx.profit_loss || 0) : 0), 0);
    const totalWithdrawal = Math.abs(transactions.reduce((sum, tx) => sum + (tx.profit_loss < 0 ? (tx.profit_loss || 0) : 0), 0));
    document.getElementById('cash-history-deposit').textContent = `+${totalDeposit.toFixed(2)} ₺`;
    document.getElementById('cash-history-withdrawal').textContent = `-${totalWithdrawal.toFixed(2)} ₺`;
    document.getElementById('cash-history-net').textContent = `${(totalDeposit - totalWithdrawal).toFixed(2)} ₺`;
    document.getElementById('cash-history-count').textContent = transactions.length;
}

/**
 * Bahis geçmişi sayfasını değiştirir.
 * @param {number} page - Gidilecek sayfa numarası.
 */
export function changeBetPage(page) {
    updateState({ currentPage: page });
    renderHistory();
    document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Kasa geçmişi sayfasını değiştirir.
 * @param {number} page - Gidilecek sayfa numarası.
 */
export function changeCashPage(page) {
    updateState({ cashCurrentPage: page });
    renderCashHistory();
    document.getElementById('cash-history')?.scrollIntoView({ behavior: 'smooth' });
}

