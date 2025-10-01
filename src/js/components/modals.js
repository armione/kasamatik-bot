import { state, updateState } from '../state.js';
import { removeImage, populatePlatformOptions } from './ui_helpers.js';

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export { openModal, closeModal };

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

    // Populate platform options for the edit modal
    const platformSelect = document.getElementById('edit-platform');
    populatePlatformOptions([platformSelect]); // Pass select element in an array
    
    // Set form values from the bet object
    platformSelect.value = bet.platform;
    document.getElementById('edit-description').value = bet.description;
    document.getElementById('edit-bet-amount').value = bet.bet_amount;
    document.getElementById('edit-odds').value = bet.odds;
    document.getElementById('edit-date').value = bet.date;
    
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const winAmountSection = document.getElementById('edit-win-amount-section');

    statusSelect.value = bet.status;
    winAmountInput.value = bet.win_amount;
    
    if (bet.status === 'won') {
        winAmountSection.classList.remove('hidden');
        // If win_amount is 0 for a won bet, calculate it
        if (bet.win_amount === 0) {
            winAmountInput.value = (bet.bet_amount * bet.odds).toFixed(2);
        }
    } else {
        winAmountSection.classList.add('hidden');
    }

    openModal('edit-modal');
}


export function closeEditModal() {
    closeModal('edit-modal');
    updateState({ editingBetId: null, currentlyEditingBet: null });
    document.getElementById('edit-form').reset();
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
