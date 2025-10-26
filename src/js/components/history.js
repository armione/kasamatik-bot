import { state, updateState } from '../state.js';
import { ITEMS_PER_PAGE } from '../utils/constants.js';
// GÖREV 2: Merkezi calculateProfitLoss fonksiyonunu import et
import { calculateProfitLoss } from '../utils/helpers.js';

// Sayfalama (Pagination) HTML'ini oluşturur
function renderPagination(type, totalPages, current, changeFnName) {
    const containerId = type === 'bets' ? 'pagination-container' : 'cash-pagination-container';
    const container = document.getElementById(containerId);
    if (!container) return; // Element yoksa çık

    if (totalPages <= 1) {
        container.innerHTML = ''; // Sayfalama gerekmiyorsa temizle
        return;
    }

    let html = '';
    // Geri butonu
    html += `<button class="pagination-btn" ${current === 1 ? 'disabled' : ''} data-action="${changeFnName}" data-page="${current - 1}">←</button>`;

    // Sayfa numaraları (optimize edilebilir, şimdilik basit)
    // Çok fazla sayfa varsa hepsini göstermek yerine '...' ekleyebiliriz.
    const maxVisiblePages = 5; // Gösterilecek maksimum sayfa butonu sayısı
    let startPage = Math.max(1, current - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Eğer sona yaklaşıldıysa başlangıcı ayarla
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" data-action="${changeFnName}" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-dots px-2">...</span>`; // Başlangıçta '...'
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === current ? 'active' : ''}" data-action="${changeFnName}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
             html += `<span class="pagination-dots px-2">...</span>`; // Sonda '...'
        }
        html += `<button class="pagination-btn" data-action="${changeFnName}" data-page="${totalPages}">${totalPages}</button>`;
    }

    // İleri butonu
    html += `<button class="pagination-btn" ${current === totalPages ? 'disabled' : ''} data-action="${changeFnName}" data-page="${current + 1}">→</button>`;
    container.innerHTML = html;
}

// Bahisleri filtrelere göre süzer
function applyFilters(bets) {
    const { status, platform, searchTerm, period } = state.filters;

    let dateFilteredBets = bets;
    // Periyoda göre filtreleme
    if (period !== 'all') {
        const endDate = new Date(); // Bugünün sonu
        const startDate = new Date(); // Başlangıç tarihi hesaplanacak

        if (period === 1) { // Son 24 saat
            startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
        } else { // Son X gün (takvim günü olarak)
            startDate.setDate(endDate.getDate() - (period - 1));
            startDate.setHours(0, 0, 0, 0); // Günün başlangıcı
        }
        // Saat dilimi sorunlarını önlemek için tarihleri UTC'ye çevirmek daha güvenli olabilir
        // Ancak şimdilik yerel saatle devam edelim.

        dateFilteredBets = bets.filter(bet => {
            // Bet tarihini de Date objesine çevir
            const betDate = new Date(bet.date);
            // Tarih alanının geçerli olduğundan emin ol
            if (isNaN(betDate)) return false;
            return betDate >= startDate && betDate <= endDate;
        });
    }

    // Diğer filtrelere göre süzme
    return dateFilteredBets.filter(bet => {
        // Özel oran durumunu normal durumdan öncelikli al
        // Null check eklendi: bet.special_odds var mı?
        const currentStatus = bet.special_odd_id ? (bet.special_odds?.status || 'pending') : bet.status;

        const statusMatch = status === 'all' || currentStatus === status;
        const platformMatch = platform === 'all' || bet.platform === platform;
        // Search term küçük harfe çevrilerek arama yapılıyor
        const searchMatch = !searchTerm || (bet.description && bet.description.toLowerCase().includes(searchTerm.toLowerCase())) || (bet.tag && bet.tag.toLowerCase().includes(searchTerm.toLowerCase())); // Etiket araması da eklendi

        return statusMatch && platformMatch && searchMatch;
    });
}

// Filtrelenmiş bahislerin özetini günceller
function updateHistorySummary(filteredBets) {
    const totalInvestment = filteredBets.reduce((sum, bet) => sum + bet.bet_amount, 0);

    // GÖREV 2: Merkezi calculateProfitLoss fonksiyonunu kullan
    const netProfit = filteredBets.reduce((sum, bet) => sum + calculateProfitLoss(bet), 0);

    // Kazanma oranı hesaplaması (Sadece sonuçlanmış bahisler üzerinden)
    // Null check eklendi: bet.special_odds var mı?
    const settledBets = filteredBets.filter(b => (b.special_odd_id ? b.special_odds?.status : b.status) !== 'pending');
    const wonBets = settledBets.filter(b => (b.special_odd_id ? b.special_odds?.status : b.status) === 'won');
    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;

    // Elementleri bul ve güncelle (null kontrolü ile)
    const countEl = document.getElementById('filtered-bets-count');
    const investmentEl = document.getElementById('filtered-total-investment');
    const profitEl = document.getElementById('filtered-net-profit');
    const winRateEl = document.getElementById('filtered-win-rate');

    if (countEl) countEl.textContent = filteredBets.length;
    if (investmentEl) investmentEl.textContent = `${totalInvestment.toFixed(2)} ₺`;

    if (profitEl) {
        profitEl.textContent = `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} ₺`;
        // Renk sınıfını temizleyip doğru olanı ekle
        profitEl.classList.remove('text-green-400', 'text-red-400', 'text-gray-400');
        if (netProfit > 0) profitEl.classList.add('text-green-400');
        else if (netProfit < 0) profitEl.classList.add('text-red-400');
        else profitEl.classList.add('text-gray-400');
    }

    if (winRateEl) {
        winRateEl.textContent = `${winRate.toFixed(1)}%`;
        // Renk sınıfını temizleyip doğru olanı ekle
        winRateEl.classList.remove('text-green-400', 'text-yellow-400', 'text-red-400');
        if (winRate >= 60) winRateEl.classList.add('text-green-400'); // %60 ve üstü yeşil
        else if (winRate >= 40) winRateEl.classList.add('text-yellow-400'); // %40-%60 sarı
        else winRateEl.classList.add('text-red-400'); // %40 altı kırmızı
    }
}


// Bahis Geçmişi sayfasını render eder
export function renderHistory() {
    // Sadece bahisleri al (Kasa İşlemleri hariç)
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    // Filtreleri uygula
    let filteredBets = applyFilters(actualBets);

    // Özet bilgilerini güncelle
    updateHistorySummary(filteredBets);

    const historyContainer = document.getElementById('bet-history');
    const paginationContainer = document.getElementById('pagination-container');
    if (!historyContainer || !paginationContainer) {
        console.error("History container or pagination container not found!");
        return; // Elementler yoksa çık
    }

    // Filtrelenmiş bahis yoksa mesaj göster ve bitir
    if (filteredBets.length === 0) {
        historyContainer.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">📝</div><p class="text-xl">Bu filtrede bahis bulunmuyor.</p></div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    // Sayfalama hesaplamaları
    const totalPages = Math.ceil(filteredBets.length / ITEMS_PER_PAGE);
    // Sayfa numarasının geçerli aralıkta olduğundan emin ol
    let currentPage = state.currentPage;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    // Eğer sayfa değiştiyse state'i güncelle (örn: son sayfadaki son item silindiğinde)
    if (currentPage !== state.currentPage) {
        updateState({ currentPage: currentPage });
    }

    // Mevcut sayfadaki bahisleri al
    const paginatedBets = filteredBets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Bahis kartlarının HTML'ini oluştur
    historyContainer.innerHTML = paginatedBets.map(bet => {
        // GÖREV 2: Merkezi calculateProfitLoss fonksiyonunu kullan
        const profit_loss = calculateProfitLoss(bet);

        // Durumu ve kar/zararı hesapla
        // Null check eklendi: bet.special_odds var mı?
        const isSpecialOdd = !!bet.special_odd_id;
        const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

        // Duruma göre stil ve metinleri belirle
        const statusClassMap = { pending: 'pending', won: 'won', lost: 'lost', refunded: 'refunded' };
        const statusTextMap = { pending: '⏳ Bekleyen', won: '✅ Kazandı', lost: '❌ Kaybetti', refunded: '↩️ İade Edildi'};
        const profitColor = profit_loss > 0 ? 'text-green-400' : profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
        const betTypeIconMap = { 'Spor Bahis': '⚽', 'Canlı Bahis': '🔴', 'Özel Oran': '✨' };

        // Etiket varsa HTML'ini hazırla (emoji veya metin)
        const tagHtml = bet.tag ? `<span class="text-lg ml-2" title="Etiket: ${bet.tag}">${bet.tag}</span>` : '';

        // Aksiyon Butonlarını belirle
        let actionButtonsHtml;
        if (isSpecialOdd) {
            // Özel oranlar için aksiyon yok (admin panelinden yönetilir)
             actionButtonsHtml = `<div class="flex-1 text-center text-sm text-gray-400 italic py-2">Fırsat bahsi</div>`;
        } else if (status === 'pending') {
            // Bekleyen bahis: Sonuçlandır ve Etiketle butonları
            actionButtonsHtml = `
                <button data-action="open-resolve-modal" data-id="${bet.id}" class="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">Sonuçlandır</button>
                <button data-action="open-edit-modal" data-id="${bet.id}" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Etiketle</button>
            `;
        } else {
            // Sonuçlanmış bahis: Sadece Düzenle butonu (etiket ekleme/değiştirme veya sonuç düzeltme)
            actionButtonsHtml = `
                <button data-action="open-edit-modal" data-id="${bet.id}" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Düzenle</button>
            `;
        }

        // Kart HTML'ini oluştur
        return `
        <div class="bet-card ${statusClassMap[status] || 'pending'}">
            <div class="flex flex-col space-y-4">
                <div class="flex justify-between items-start">
                    <div class="flex items-center space-x-3">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">${betTypeIconMap[bet.bet_type] || '🎯'}</div>
                        <div>
                            <div class="flex items-center">
                                <h3 class="font-bold text-white text-lg">${bet.platform}</h3>
                                ${tagHtml} <!-- Etiket buraya -->
                            </div>
                            <p class="text-gray-400 text-sm">${bet.bet_type}</p>
                        </div>
                    </div>
                    <span class="px-4 py-2 rounded-full text-sm font-medium status-${statusClassMap[status] || 'pending'}">${statusTextMap[status] || 'Bilinmiyor'}</span>
                </div>
                <div class="bg-gray-800 bg-opacity-30 rounded-lg p-3"><p>${bet.description || 'Açıklama yok'}</p></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Tarih</div><div class="font-semibold">${new Date(bet.date).toLocaleDateString('tr-TR')}</div></div>
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Miktar</div><div class="font-semibold">${bet.bet_amount.toFixed(2)} ₺</div></div>
                    <div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Oran</div><div class="font-semibold">${bet.odds}</div></div>
                    ${status !== 'pending' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold ${profitColor}">${profit_loss >= 0 ? '+' : ''}${profit_loss.toFixed(2)} ₺</div></div>` : '<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center invisible"><div class="text-xs text-gray-400 mb-1">-</div><div class="font-semibold">-</div></div>' /* Placeholder for alignment */}
                </div>
                <div class="flex gap-3 pt-4 border-t border-gray-600">
                    ${actionButtonsHtml} <!-- Duruma göre butonlar -->
                    <button data-action="delete-bet" data-id="${bet.id}" class="px-4 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️ Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Sayfalamayı render et
    renderPagination('bets', totalPages, currentPage, 'changeBetPage');
}

// Kasa Geçmişi sayfasını render eder
export function renderCashHistory() {
    // Sadece Kasa İşlemlerini al ve en yeniden eskiye sırala (state'den ters geliyorsa)
    // Eğer state.bets zaten sıralıysa buna gerek yok.
    const cashTransactions = state.bets
        .filter(bet => bet.bet_type === 'Kasa İşlemi')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Veritabanı created_at'e göre sırala

    // Kasa özeti istatistiklerini güncelle
    updateCashHistoryStats(cashTransactions);

    const container = document.getElementById('cash-history-list');
    const paginationContainer = document.getElementById('cash-pagination-container');
    if (!container || !paginationContainer) {
        console.error("Cash history container or pagination container not found!");
        return; // Elementler yoksa çık
    }

    // Kasa işlemi yoksa mesaj göster
    if (cashTransactions.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">💸</div><p class="text-xl">Henüz kasa işlemi bulunmuyor.</p></div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    // Sayfalama
    const totalPages = Math.ceil(cashTransactions.length / ITEMS_PER_PAGE);
    let cashCurrentPage = state.cashCurrentPage;
    if (cashCurrentPage > totalPages) cashCurrentPage = totalPages;
    if (cashCurrentPage < 1) cashCurrentPage = 1;
    if (cashCurrentPage !== state.cashCurrentPage) {
         updateState({ cashCurrentPage: cashCurrentPage });
    }

    const paginatedTxs = cashTransactions.slice((cashCurrentPage - 1) * ITEMS_PER_PAGE, cashCurrentPage * ITEMS_PER_PAGE);

    // Liste HTML'ini oluştur
    container.innerHTML = paginatedTxs.map(tx => {
        const isDeposit = tx.profit_loss > 0;
        const amountColor = isDeposit ? 'text-green-400' : 'text-red-400';
        const icon = isDeposit ? '📥' : '📤';
        const description = tx.description || (isDeposit ? 'Para Yatırma' : 'Para Çekme'); // Açıklama yoksa varsayılan
        return `
            <div class="bet-card"> {/* Kasa işlemleri için de bet-card stilini kullanabiliriz */}
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">${icon}</div>
                        <div>
                            <h3 class="font-bold text-white">${description}</h3>
                            <p class="text-sm text-gray-400">${new Date(tx.date).toLocaleDateString('tr-TR')}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <p class="text-lg font-bold ${amountColor}">${tx.profit_loss > 0 ? '+' : ''}${tx.profit_loss.toFixed(2)} ₺</p>
                        <button data-action="delete-bet" data-id="${tx.id}" class="px-3 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    // Kasa sayfası için sayfalamayı render et
    renderPagination('cash', totalPages, cashCurrentPage, 'changeCashPage');
}

// Kasa geçmişi özet istatistiklerini günceller
function updateCashHistoryStats(transactions) {
    const totalDeposit = transactions.reduce((sum, tx) => sum + (tx.profit_loss > 0 ? tx.profit_loss : 0), 0);
    const totalWithdrawal = Math.abs(transactions.reduce((sum, tx) => sum + (tx.profit_loss < 0 ? tx.profit_loss : 0), 0));
    const netBalance = totalDeposit - totalWithdrawal;

    const depositEl = document.getElementById('cash-history-deposit');
    const withdrawalEl = document.getElementById('cash-history-withdrawal');
    const netEl = document.getElementById('cash-history-net');
    const countEl = document.getElementById('cash-history-count');

    if (depositEl) depositEl.textContent = `+${totalDeposit.toFixed(2)} ₺`;
    if (withdrawalEl) withdrawalEl.textContent = `-${totalWithdrawal.toFixed(2)} ₺`;
    if (netEl) {
        netEl.textContent = `${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)} ₺`;
        // Net bakiye rengini ayarla
        netEl.classList.remove('text-green-400', 'text-red-400', 'text-white');
        if (netBalance > 0) netEl.classList.add('text-green-400');
        else if (netBalance < 0) netEl.classList.add('text-red-400');
        else netEl.classList.add('text-white'); // Nötr renk
    }
    if (countEl) countEl.textContent = transactions.length;
}

// Bahis Geçmişi sayfa değiştirme fonksiyonu
export function changeBetPage(page) {
    // Sayfa numarasının geçerli olduğundan emin ol (renderPagination zaten yapıyor ama yine de kontrol edelim)
    const totalPages = Math.ceil(applyFilters(state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi')).length / ITEMS_PER_PAGE);
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    updateState({ currentPage: page }); // State'i güncelle
    renderHistory(); // Sayfayı yeniden çiz
    // Sayfanın başına gitmek için history elementini hedef al
    document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
}

// Kasa Geçmişi sayfa değiştirme fonksiyonu
export function changeCashPage(page) {
    // Sayfa numarasının geçerli olduğundan emin ol
    const totalPages = Math.ceil(state.bets.filter(bet => bet.bet_type === 'Kasa İşlemi').length / ITEMS_PER_PAGE);
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    updateState({ cashCurrentPage: page }); // State'i güncelle
    renderCashHistory(); // Sayfayı yeniden çiz
    // Sayfanın başına gitmek için cash-history elementini hedef al
    document.getElementById('cash-history')?.scrollIntoView({ behavior: 'smooth' });
}

// GÖREV 2: Kopyalanmış calculateProfitLoss fonksiyonu buradan silindi.

