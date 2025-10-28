// Genel amaçlı yardımcı fonksiyonlar

/**
 * Bir bahsin kar/zarar durumunu, özel oran olup olmamasına göre doğru bir şekilde hesaplar.
 * @param {object} bet - Bahis objesi.
 * @returns {number} Kar/Zarar tutarı.
 */
export function calculateProfitLoss(bet) {
    if (!bet) return 0;

    const isSpecialOdd = !!bet.special_odd_id;
    const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

    if (status === 'pending') return 0;
    if (status === 'refunded') return 0;

    if (status === 'won') {
        if (isSpecialOdd) {
            return (bet.bet_amount * bet.odds) - bet.bet_amount;
        } else {
            return bet.win_amount - bet.bet_amount;
        }
    }

    if (status === 'lost') {
        return -bet.bet_amount;
    }

    return 0;
}


/**
 * Ekranda bir bildirim mesajı gösterir.
 * @param {string} message Gösterilecek mesaj.
 * @param {'info'|'success'|'warning'|'error'} type Bildirim türü.
 * @param {number} duration Milisaniye cinsinden gösterim süresi.
 */
export function showNotification(message, type = 'info', duration = 4000) {
    const notificationsContainer = document.getElementById('notifications');
    const notification = document.createElement('div');
    const colors = {
        success: 'from-green-500 to-emerald-600',
        error: 'from-red-500 to-red-600',
        warning: 'from-yellow-500 to-orange-600',
        info: 'from-blue-500 to-blue-600'
    };
    notification.className = `notification bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg max-w-sm glass-card`;
    notification.innerHTML = `<div class="flex items-center justify-between"><span class="font-medium">${message}</span><button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200 text-xl">×</button></div>`;
    notificationsContainer.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}

/**
 * Bugünün tarihini YYYY-MM-DD formatında döndürür.
 */
export function getTodaysDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Bir butonun yükleme durumunu yönetir.
 * @param {HTMLButtonElement} button - Yükleme durumu yönetilecek buton.
 * @param {boolean} isLoading - Yükleme durumunun aktif olup olmadığı.
 * @param {string} [loadingText=''] - Yükleme sırasında gösterilecek metin.
 */
export function setButtonLoading(button, isLoading, loadingText = '') {
    if (!button) return;
    const textElement = button.querySelector('.btn-text');
    const loaderElement = button.querySelector('.btn-loader');

    if (isLoading) {
        button.disabled = true;
        if (textElement) textElement.textContent = loadingText;
        if (loaderElement) loaderElement.classList.remove('hidden');
    } else {
        button.disabled = false;
        if (textElement && button.dataset.defaultText) {
            textElement.textContent = button.dataset.defaultText;
        }
        if (loaderElement) loaderElement.classList.add('hidden');
    }
}
