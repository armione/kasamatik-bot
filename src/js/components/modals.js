import { state, updateState } from '../state.js';
import { removeImage } from './ui_helpers.js';

// Genel Modal Açma/Kapatma
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Platform Yöneticisi
export function openPlatformManager() {
    openModal('platform-manager-modal');
    renderCustomPlatformsModal();
}

export function closePlatformManager() {
    closeModal('platform-manager-modal');
}

// Kasa İşlemi
export function openCashTransactionModal() {
    openModal('cash-transaction-modal');
}

export function closeCashTransactionModal() {
    closeModal('cash-transaction-modal');
    const amountInput = document.getElementById('cash-amount');
    const descriptionInput = document.getElementById('cash-description'); // GÖREV 3.3
    if (amountInput) amountInput.value = '';
    if (descriptionInput) descriptionInput.value = ''; // GÖREV 3.3
}

// Hızlı Bahis Ekleme
export function openQuickAddModal() {
    openModal('quick-add-modal');
}

export function closeQuickAddModal() {
    closeModal('quick-add-modal');
    const form = document.getElementById('quick-add-form');
    if (form) form.reset();
    removeImage('quick');
}

// --- YENİ PLAN ---

// Basit Sonuçlandırma Modalı (Resolve Modal)
export function openResolveModal(betId) {
    const bet = state.bets.find(b => b.id === betId);
    if (!bet || bet.status !== 'pending') { // Sadece bekleyen bahisler için
        console.error("Sonuçlandırma modalı sadece bekleyen bahisler için açılabilir.");
        return;
    }

    updateState({ editingBetId: betId, currentlyEditingBet: bet }); // Hangi bahsin düzenlendiğini state'e kaydet

    // Modal içindeki alanları al
    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    const winAmountSection = document.getElementById('resolve-win-amount-section');

    // Alanları sıfırla/ayarla
    if (statusSelect) statusSelect.value = ''; // Başlangıçta boş olsun
    if (winAmountInput) winAmountInput.value = (bet.bet_amount * bet.odds).toFixed(2); // Potansiyel kazancı göster
    if (winAmountSection) winAmountSection.style.display = 'none'; // Kazanç alanını başlangıçta gizle

    // Durum değiştikçe kazanç alanını göster/gizle
    if (statusSelect) {
        // Eski listener'ı kaldır (varsa)
        statusSelect.onchange = null;
        // Yeni listener'ı ekle
        statusSelect.onchange = () => {
            if (winAmountSection) {
                winAmountSection.style.display = statusSelect.value === 'won' ? 'block' : 'none';
            }
        };
    }

    openModal('resolve-modal');
}

export function closeResolveModal() {
    closeModal('resolve-modal');
    updateState({ editingBetId: null, currentlyEditingBet: null }); // State'i temizle
    // Alanları temizle (isteğe bağlı, zaten açılırken sıfırlanıyor)
    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    if (statusSelect) statusSelect.value = '';
    if (winAmountInput) winAmountInput.value = '';
     // Listener'ı temizle
    if (statusSelect) statusSelect.onchange = null;
}


// Düzenleme/Etiketleme Modalı (Edit Modal)
export function openEditModal(betId) {
    const bet = state.bets.find(b => b.id === betId);
    if (!bet) return;

    updateState({ editingBetId: betId, currentlyEditingBet: bet });

    // Modal içindeki alanları al
    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const resultSection = document.getElementById('edit-result-section'); // Durum ve Kazanç bölümü
    const winAmountSection = document.getElementById('edit-win-amount-section'); // Sadece Kazanç alanı

    // Alanları doldur
    if (tagInput) tagInput.value = bet.tag || '';
    if (statusSelect) statusSelect.value = bet.status;

    // Kazanç miktarını ayarla (eğer kazandıysa veya potansiyel)
    const potentialWinnings = bet.bet_amount * bet.odds;
    if (winAmountInput) {
        winAmountInput.value = bet.status === 'won' ? bet.win_amount.toFixed(2) : potentialWinnings.toFixed(2);
    }

    // Duruma göre modal içeriğini ayarla
    if (resultSection && winAmountSection) {
        if (bet.status === 'pending') {
            // Bekleyen bahis etiketleniyorsa, sonuç bölümünü gizle
            resultSection.style.display = 'none';
        } else {
            // Sonuçlanmış bahis düzenleniyorsa, sonuç bölümünü göster
            resultSection.style.display = 'block';
            // Kazanç alanını sadece 'won' durumunda göster
            winAmountSection.style.display = bet.status === 'won' ? 'block' : 'none';
        }
    }

     // Durum select değiştiğinde kazanç alanını yönet (edit modal içinde)
    if (statusSelect) {
         // Eski listener'ı kaldır (varsa)
         statusSelect.onchange = null;
         // Yeni listener'ı ekle
        statusSelect.onchange = () => {
            if (winAmountSection) {
                winAmountSection.style.display = statusSelect.value === 'won' ? 'block' : 'none';
                 // Eğer durum 'won' değilse ve input boş değilse, potansiyel kazancı yaz
                 if (statusSelect.value !== 'won' && winAmountInput && !winAmountInput.value) {
                     winAmountInput.value = potentialWinnings.toFixed(2);
                 }
            }
        };
    }


    openModal('edit-modal');
}

export function closeEditModal() {
    closeModal('edit-modal');
    updateState({ editingBetId: null, currentlyEditingBet: null });
    // Alanları temizle (isteğe bağlı)
    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    if (tagInput) tagInput.value = '';
    if (statusSelect) statusSelect.value = 'pending'; // Varsayılana dön
    if (winAmountInput) winAmountInput.value = '';
    // Listener'ı temizle
    if (statusSelect) statusSelect.onchange = null;

}

// --- ESKİ MODAL FONKSİYONLARI ---

// Özel Oran Oynama
export function openPlaySpecialOddModal(oddId) {
    const odd = state.specialOdds.find(o => o.id === oddId);
    if (!odd) return;

    updateState({ playingSpecialOdd: odd });

    const contentContainer = document.getElementById('special-odd-modal-content');
    const totalBankroll = state.bets.reduce((sum, bet) => {
         if (bet.bet_type === 'Kasa İşlemi') return sum + bet.profit_loss;
         return sum + calculateProfitLoss(bet); // calculateProfitLoss kullan
    }, 0);


    if (contentContainer) { // Null kontrolü
        contentContainer.innerHTML = `
            <div class="space-y-3 text-sm">
                <p class="text-gray-300"><strong class="text-white">Bahis:</strong> ${odd.description}</p>
                <p class="text-gray-300"><strong class="text-white">Platform:</strong> ${odd.platform}</p>
                <p class="text-gray-300"><strong class="text-white">Oran:</strong> ${odd.odds}</p>
                ${odd.max_bet_amount ? `<p class="text-yellow-400"><strong class="text-white">Maksimum Bahis:</strong> ${odd.max_bet_amount} ₺</p>` : ''}
            </div>
            <div class="mt-4">
                <label class="block text-gray-300 text-sm font-medium mb-2">Yatırım Miktarı (₺)</label>
                <input type="number" id="special-odd-bet-amount" class="input-glass w-full p-3 rounded-lg text-gray-800"
                       min="0.01" ${odd.max_bet_amount ? `max="${odd.max_bet_amount}"` : ''} step="0.01" required> <!-- min 0.01 yapıldı -->
                <div id="risk-analysis-info" class="text-xs text-gray-400 mt-2 h-4"></div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                <button id="close-play-special-odd-modal" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">İptal</button>
                <button id="confirm-play-special-odd" class="gradient-button px-4 py-2 rounded-lg text-white">
                    <span class="btn-text">Bahsi Onayla</span>
                    <span class="btn-loader hidden"></span>
                </button>
            </div>
        `;

        // Risk analizi için event listener (innerHTML sonrası)
        const amountInput = document.getElementById('special-odd-bet-amount');
        const riskInfo = document.getElementById('risk-analysis-info');
        if(amountInput && riskInfo) { // Null kontrolü
            amountInput.addEventListener('input', () => {
                const amount = parseFloat(amountInput.value);
                if (amount > 0 && totalBankroll > 0) {
                    const percentage = (amount / totalBankroll * 100).toFixed(1);
                    const potentialWinnings = (amount * odd.odds).toFixed(2);
                    riskInfo.innerHTML = `Kasanızın <strong class="text-yellow-400">%${percentage}</strong>'i. Potansiyel Kazanç: <strong class="text-green-400">${potentialWinnings} ₺</strong>`;
                } else if (amount > 0) {
                     const potentialWinnings = (amount * odd.odds).toFixed(2);
                     riskInfo.innerHTML = `Potansiyel Kazanç: <strong class="text-green-400">${potentialWinnings} ₺</strong>`;
                }
                else {
                    riskInfo.innerHTML = '';
                }
            });
        }
         openModal('special-odd-modal');
    } else {
        console.error("special-odd-modal-content elementi bulunamadı.");
    }
}

export function closePlaySpecialOddModal() {
    closeModal('special-odd-modal');
    updateState({ playingSpecialOdd: null });
}


// Resim Gösterme
export function showImageModal(imageSrc) {
    const modalImage = document.getElementById('modal-image');
    if (modalImage) {
        modalImage.src = imageSrc;
        openModal('image-modal');
    }
}

export function closeImageModal() {
    closeModal('image-modal');
}

// Reklam Pop-up
export function showLoginAdPopup() {
    const popupAd = state.ads.find(ad => ad.location === 'login_popup');
    if (popupAd) {
        const adImage = document.getElementById('ad-popup-image');
        const adLink = document.getElementById('ad-popup-link');
        if (adImage) adImage.src = popupAd.image_url;
        if (adLink) adLink.href = popupAd.target_url;
        openModal('ad-popup-modal');
    }
}

export function closeAdPopup() {
    closeModal('ad-popup-modal');
}

// Platform Modal İçeriği
export function renderCustomPlatformsModal() {
    const container = document.getElementById('custom-platforms-list-modal');
    if (!container) return;
    if (state.customPlatforms.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">Henüz özel platform eklenmemiş</p>';
        return;
    }
    container.innerHTML = state.customPlatforms.map(p => `
        <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-2 rounded">
            <span class="text-white text-sm">${p.name}</span>
            <button data-action="remove-platform" data-id="${p.id}" data-name="${p.name.replace(/'/g, "\\'")}" class="text-red-400 hover:text-red-300 text-sm">🗑️</button>
        </div>
    `).join('');
}

// Genel Helper (calculateProfitLoss - modals içinde kullanıldığı için buraya taşıdım)
function calculateProfitLoss(bet) {
    if (!bet) return 0;
    const isSpecialOdd = !!bet.special_odd_id;
    const status = isSpecialOdd ? (bet.special_odds?.status || 'pending') : bet.status;

    if (status === 'pending' || status === 'refunded') return 0;
    if (status === 'won') {
        return isSpecialOdd
            ? (bet.bet_amount * bet.odds) - bet.bet_amount
            : bet.win_amount - bet.bet_amount;
    }
    if (status === 'lost') {
        return -bet.bet_amount;
    }
    return 0;
}

