import { state, updateState } from '../state.js';
import { removeImage } from './ui_helpers.js';

// DÜZELTME: export eklendi
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// DÜZELTME: export eklendi
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export function openPlatformManager() {
    openModal('platform-manager-modal');
    renderCustomPlatformsModal();
}

export function closePlatformManager() {
    closeModal('platform-manager-modal');
}

export function openCashTransactionModal() {
    openModal('cash-transaction-modal');
}

export function closeCashTransactionModal() {
    closeModal('cash-transaction-modal');
    document.getElementById('cash-amount').value = '';
}

export function openQuickAddModal() {
    openModal('quick-add-modal');
}

export function closeQuickAddModal() {
    closeModal('quick-add-modal');
    document.getElementById('quick-add-form')?.reset();
    removeImage('quick');
}

export function openEditModal(betId) {
    const bet = state.bets.find(b => b.id === betId);
    if (!bet) return;
    
    updateState({ editingBetId: betId, currentlyEditingBet: bet });

    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const winAmountSection = document.getElementById('win-amount-section');
    const tagInput = document.getElementById('edit-tag'); // GÖREV 3.2: Etiket input'unu al

    statusSelect.value = bet.status;
    tagInput.value = bet.tag || ''; // GÖREV 3.2: Mevcut etiketi input'a yazdır
    
    const potentialWinnings = bet.bet_amount * bet.odds;
    winAmountInput.value = bet.status === 'won' ? bet.win_amount : potentialWinnings.toFixed(2);
    
    winAmountSection.style.display = bet.status === 'won' ? 'block' : 'none';

    statusSelect.onchange = () => {
        winAmountSection.style.display = statusSelect.value === 'won' ? 'block' : 'none';
    };

    openModal('edit-modal');
}

export function closeEditModal() {
    closeModal('edit-modal');
    updateState({ editingBetId: null, currentlyEditingBet: null });
    const statusSelect = document.getElementById('edit-status');
    const tagInput = document.getElementById('edit-tag'); // GÖREV 3.2: Etiket input'unu temizle
    if (tagInput) tagInput.value = ''; // GÖREV 3.2: Kapatırken input'u temizle
    if (statusSelect) {
        statusSelect.onchange = null; // Bellek sızıntısını önlemek için olay dinleyiciyi temizle
    }
}

export function openPlaySpecialOddModal(oddId) {
    const odd = state.specialOdds.find(o => o.id === oddId);
    if (!odd) return;

    updateState({ playingSpecialOdd: odd });

    const contentContainer = document.getElementById('special-odd-modal-content');
    const totalBankroll = state.bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);

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
                   min="0" ${odd.max_bet_amount ? `max="${odd.max_bet_amount}"` : ''} step="0.01" required>
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

    openModal('special-odd-modal');
    
    // Risk analizi için event listener
    const amountInput = document.getElementById('special-odd-bet-amount');
    const riskInfo = document.getElementById('risk-analysis-info');
    amountInput.addEventListener('input', () => {
        const amount = parseFloat(amountInput.value);
        if(amount > 0 && totalBankroll > 0) {
            const percentage = (amount / totalBankroll * 100).toFixed(1);
            const potentialWinnings = (amount * odd.odds).toFixed(2);
            riskInfo.innerHTML = `Kasanızın <strong class="text-yellow-400">%${percentage}</strong>'i. Potansiyel Kazanç: <strong class="text-green-400">${potentialWinnings} ₺</strong>`;
        } else {
            riskInfo.innerHTML = '';
        }
    });
}

export function closePlaySpecialOddModal() {
    closeModal('special-odd-modal');
    updateState({ playingSpecialOdd: null });
}


export function showImageModal(imageSrc) {
    document.getElementById('modal-image').src = imageSrc;
    openModal('image-modal');
}

export function closeImageModal() {
    closeModal('image-modal');
}

export function showLoginAdPopup() {
    const popupAd = state.ads.find(ad => ad.location === 'login_popup');
    if (popupAd) {
        document.getElementById('ad-popup-image').src = popupAd.image_url;
        document.getElementById('ad-popup-link').href = popupAd.target_url;
        openModal('ad-popup-modal');
    }
}

export function closeAdPopup() {
    closeModal('ad-popup-modal');
}

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
            <button data-action="remove-platform" data-id="${p.id}" data-name="${p.name}" class="text-red-400 hover:text-red-300 text-sm">🗑️</button>
        </div>
    `).join('');
}

