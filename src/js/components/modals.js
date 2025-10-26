import { state, updateState } from '../state.js';
import { removeImage } from './ui_helpers.js';
// GÖREV 2: Merkezi calculateProfitLoss import edildi (modals.js içindeki kopya silindi)
import { calculateProfitLoss } from '../utils/helpers.js';

// --- Genel Modal Açma/Kapatma ---
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // 'flex' ile ortalamayı sağlıyoruz
        // İsteğe bağlı: Arka planın kaymasını engelle
        // document.body.style.overflow = 'hidden';
    } else {
        console.warn(`Modal with ID "${modalId}" not found.`);
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // İsteğe bağlı: Arka plan kaymasını geri aç
        // document.body.style.overflow = '';
    } else {
        console.warn(`Modal with ID "${modalId}" not found.`);
    }
}

// --- Platform Yöneticisi Modalı ---
export function openPlatformManager() {
    openModal('platform-manager-modal');
    renderCustomPlatformsModal(); // Modal açıldığında içeriği render et
}

export function closePlatformManager() {
    closeModal('platform-manager-modal');
    // Modal kapandığında içindeki input'u temizle (opsiyonel)
    const input = document.getElementById('new-platform-name-modal');
    if (input) input.value = '';
}

// --- Kasa İşlemi Modalı ---
export function openCashTransactionModal() {
    openModal('cash-transaction-modal');
}

export function closeCashTransactionModal() {
    closeModal('cash-transaction-modal');
    // Form elemanlarını temizle
    const amountInput = document.getElementById('cash-amount');
    const descriptionInput = document.getElementById('cash-description');
    if (amountInput) amountInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
}

// --- Hızlı Bahis Ekleme Modalı ---
export function openQuickAddModal() {
    openModal('quick-add-modal');
    // Platform seçeneklerini güncelle (yeni eklenen olabilir)
    // populatePlatformOptions(); // Bu ui_helpers içinde, onu import etmek gerekir
}

export function closeQuickAddModal() {
    closeModal('quick-add-modal');
    // Formu sıfırla ve resmi kaldır
    const form = document.getElementById('quick-add-form');
    if (form) form.reset();
    removeImage('quick'); // ui_helpers'dan import edilen fonksiyon
}

// --- Bahis Sonuçlandırma Modalı (Resolve Modal) ---
export function openResolveModal(betId) {
    const bet = state.bets.find(b => b.id === betId);
    // Sadece 'pending' ve 'özel oran olmayan' bahisler için aç
    if (!bet || bet.status !== 'pending' || bet.special_odd_id) {
        if (bet?.special_odd_id) {
            showNotification('Özel oran bahisleri buradan sonuçlandırılamaz.', 'warning');
        } else {
            console.error("Sonuçlandırma modalı sadece bekleyen normal bahisler için açılabilir.");
        }
        return;
    }

    // Düzenlenecek bahsi state'e kaydet
    updateState({ editingBetId: betId, currentlyEditingBet: bet });

    // Modal elemanlarını al
    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    const winAmountSection = document.getElementById('resolve-win-amount-section');

    // Alanları başlangıç değerlerine ayarla
    if (statusSelect) statusSelect.value = ''; // Seçim yapılmamış olsun
    // Potansiyel kazancı hesapla ve input'a placeholder olarak veya value olarak yaz
    const potentialWinnings = (bet.bet_amount * bet.odds).toFixed(2);
    if (winAmountInput) {
        winAmountInput.value = potentialWinnings; // Varsayılan olarak potansiyel kazancı göster
        // winAmountInput.placeholder = potentialWinnings; // Veya placeholder olarak
    }
    if (winAmountSection) winAmountSection.style.display = 'none'; // Kazanç alanı başlangıçta gizli

    // Durum seçimi değiştikçe kazanç alanını göster/gizle listener'ı
    const statusChangeHandler = () => {
        if (winAmountSection) {
            winAmountSection.style.display = statusSelect.value === 'won' ? 'block' : 'none';
        }
    };
    if (statusSelect) {
        // Önceki listener'ı kaldır (varsa) ve yenisini ekle
        statusSelect.removeEventListener('change', statusChangeHandler); // Öncekini kaldır
        statusSelect.addEventListener('change', statusChangeHandler); // Yenisini ekle
    }

    openModal('resolve-modal'); // Modalı göster
}

export function closeResolveModal() {
    closeModal('resolve-modal');
    // State'i temizle
    updateState({ editingBetId: null, currentlyEditingBet: null });
    // Alanları temizle (isteğe bağlı)
    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    if (statusSelect) {
        statusSelect.value = '';
        // Listener'ı kaldır
        statusSelect.removeEventListener('change', () => {}); // Handler'ı burada tanımlayamayız, ya dışarı almalı ya da ID ile kaldırmalı
    }
    if (winAmountInput) winAmountInput.value = '';
}


// --- Bahis Düzenleme/Etiketleme Modalı (Edit Modal) ---
export function openEditModal(betId) {
    const bet = state.bets.find(b => b.id === betId);
    if (!bet) {
        console.error(`Düzenlenecek bahis bulunamadı (ID: ${betId}).`);
        return;
    }
    // Özel oran bahisleri düzenlenemez
    if (bet.special_odd_id) {
        showNotification('Özel oran bahisleri buradan düzenlenemez.', 'warning');
        return;
    }

    // Düzenlenecek bahsi state'e kaydet
    updateState({ editingBetId: betId, currentlyEditingBet: bet });

    // Modal elemanlarını al
    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const resultSection = document.getElementById('edit-result-section');
    const winAmountSection = document.getElementById('edit-win-amount-section');

    // Alanları mevcut bahis verileriyle doldur
    if (tagInput) tagInput.value = bet.tag || '';
    if (statusSelect) statusSelect.value = bet.status;

    // Kazanç miktarını ayarla (kazandıysa mevcut, değilse potansiyel)
    const potentialWinnings = (bet.bet_amount * bet.odds).toFixed(2);
    if (winAmountInput) {
        winAmountInput.value = bet.status === 'won' ? bet.win_amount.toFixed(2) : potentialWinnings;
    }

    // Modalın görünümünü bahis durumuna göre ayarla
    if (resultSection && winAmountSection) {
        if (bet.status === 'pending') {
            // Bekleyen bahis ise sadece etiket düzenlenebilir, sonuç bölümünü gizle
            resultSection.style.display = 'none';
        } else {
            // Sonuçlanmış bahis ise sonuç bölümünü göster
            resultSection.style.display = 'block';
            // Kazanç alanını sadece 'won' durumunda göster
            winAmountSection.style.display = bet.status === 'won' ? 'block' : 'none';
        }
    }

     // Durum select değiştiğinde kazanç alanını yönet listener'ı
     const statusChangeHandlerEdit = () => {
        if (winAmountSection) {
            winAmountSection.style.display = statusSelect.value === 'won' ? 'block' : 'none';
             // Eğer durum 'won' değilse ve input boş değilse, potansiyel kazancı yaz (kullanıcı değiştirmesin diye)
             // if (statusSelect.value !== 'won' && winAmountInput) {
             //     winAmountInput.value = potentialWinnings;
             // }
        }
     };
    if (statusSelect) {
        statusSelect.removeEventListener('change', statusChangeHandlerEdit); // Öncekini kaldır
        statusSelect.addEventListener('change', statusChangeHandlerEdit); // Yenisini ekle
    }

    openModal('edit-modal'); // Modalı göster
}

export function closeEditModal() {
    closeModal('edit-modal');
    // State'i temizle
    updateState({ editingBetId: null, currentlyEditingBet: null });
    // Alanları temizle (isteğe bağlı)
    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    if (tagInput) tagInput.value = '';
    if (statusSelect) {
        statusSelect.value = 'pending'; // Varsayılana dön
         // Listener'ı kaldır
        statusSelect.removeEventListener('change', () => {});
    }
    if (winAmountInput) winAmountInput.value = '';

}

// --- Özel Oran Oynama Modalı ---
export function openPlaySpecialOddModal(oddId) {
    const odd = state.specialOdds.find(o => o.id === oddId);
    if (!odd) {
        console.error(`Oynanacak özel oran bulunamadı (ID: ${oddId}).`);
        return;
    }
     // Sadece 'pending' durumdaki fırsatlar oynanabilir
    if (odd.status !== 'pending') {
        showNotification('Bu fırsat artık aktif değil.', 'warning');
        return;
    }


    // Oynanacak fırsatı state'e kaydet
    updateState({ playingSpecialOdd: odd });

    const contentContainer = document.getElementById('special-odd-modal-content');
    // Toplam kasayı hesapla (merkezi helper fonksiyonu ile)
    const totalBankroll = state.bets.reduce((sum, bet) => {
         // Kasa işlemlerini olduğu gibi ekle/çıkar
         if (bet.bet_type === 'Kasa İşlemi') return sum + bet.profit_loss;
         // Diğer bahislerin kar/zararını ekle
         return sum + calculateProfitLoss(bet);
    }, 0);


    if (contentContainer) {
        // Modal içeriğini dinamik olarak oluştur
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
                       min="0.01" ${odd.max_bet_amount ? `max="${odd.max_bet_amount}"` : ''} step="0.01" required>
                <div id="risk-analysis-info" class="text-xs text-gray-400 mt-2 h-4"></div> {/* Risk analizi metni için yer */}
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                {/* İptal butonu için ID eklendi */}
                <button id="close-play-special-odd-modal-btn" type="button" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">İptal</button>
                <button id="confirm-play-special-odd" type="button" class="gradient-button px-4 py-2 rounded-lg text-white">
                    <span class="btn-text">Bahsi Onayla</span>
                    <span class="btn-loader hidden"></span>
                </button>
            </div>
        `;

        // Risk analizi için event listener (innerHTML sonrası eklenmeli)
        const amountInput = document.getElementById('special-odd-bet-amount');
        const riskInfo = document.getElementById('risk-analysis-info');
        if(amountInput && riskInfo) {
            const riskAnalysisHandler = () => { // Handler'ı değişkene ata
                const amount = parseFloat(amountInput.value);
                // Miktar geçerli bir sayı ise ve > 0 ise hesapla
                if (!isNaN(amount) && amount > 0) {
                    const potentialWinnings = (amount * odd.odds).toFixed(2);
                    let riskText = `Potansiyel Kazanç: <strong class="text-green-400">${potentialWinnings} ₺</strong>`;
                    // Kasa varsa yüzdesini de göster
                    if (totalBankroll > 0) {
                         const percentage = (amount / totalBankroll * 100).toFixed(1);
                         riskText = `Kasanızın <strong class="text-yellow-400">%${percentage}</strong>'i. ${riskText}`;
                    }
                    riskInfo.innerHTML = riskText;
                } else {
                    // Miktar geçerli değilse alanı temizle
                    riskInfo.innerHTML = '';
                }
            };
             amountInput.removeEventListener('input', riskAnalysisHandler); // Öncekini kaldır (güvenlik için)
             amountInput.addEventListener('input', riskAnalysisHandler); // Yenisini ekle
        }
         openModal('special-odd-modal'); // Modalı göster
    } else {
        console.error("Özel oran modal içeriği (#special-odd-modal-content) bulunamadı.");
    }
}

export function closePlaySpecialOddModal() {
    closeModal('special-odd-modal');
    // State'i temizle
    updateState({ playingSpecialOdd: null });
    // Listener'ı kaldır (güvenlik için, modal tekrar açıldığında çift eklenmesin)
    const amountInput = document.getElementById('special-odd-bet-amount');
    if (amountInput) {
        amountInput.removeEventListener('input', () => {}); // Handler'ı burada referanslayamayız, bu yüzden boş fonksiyonla kaldırmayı deneyelim
    }
}


// --- Resim Gösterme Modalı ---
export function showImageModal(imageSrc) {
    const modalImage = document.getElementById('modal-image');
    if (modalImage) {
        modalImage.src = imageSrc; // Resim kaynağını ayarla
        openModal('image-modal'); // Modalı aç
    } else {
        console.warn("Resim modal elementi (#modal-image) bulunamadı.");
    }
}

export function closeImageModal() {
    closeModal('image-modal');
    // Modal kapandığında resmi temizle (opsiyonel)
    const modalImage = document.getElementById('modal-image');
    if (modalImage) modalImage.src = '';
}

// --- Reklam Pop-up Modalı ---
export function showLoginAdPopup() {
    // State'den ilgili reklamı bul
    const popupAd = state.ads.find(ad => ad.location === 'login_popup');
    if (popupAd) {
        const adImage = document.getElementById('ad-popup-image');
        const adLink = document.getElementById('ad-popup-link');
        // Resim ve linki ayarla
        if (adImage) adImage.src = popupAd.image_url;
        if (adLink) adLink.href = popupAd.target_url;
        openModal('ad-popup-modal'); // Modalı aç
    }
    // Reklam yoksa hiçbir şey yapma
}

export function closeAdPopup() {
    closeModal('ad-popup-modal');
}

// --- Platform Modal İçeriği Render ---
// Platform yöneticisi modalı açıldığında içindeki listeyi günceller
export function renderCustomPlatformsModal() {
    const container = document.getElementById('custom-platforms-list-modal');
    if (!container) return; // Element yoksa çık

    if (state.customPlatforms.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center">Özel platform yok</p>';
        return;
    }
    // Platformları listele ve silme butonu ekle
    container.innerHTML = state.customPlatforms.map(p => `
        <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-2 rounded hover:bg-opacity-70">
            <span class="text-white text-sm">${p.name}</span>
            {/* Silme butonu data-action ile event delegation tarafından yakalanacak */}
            <button data-action="remove-platform" data-id="${p.id}" data-name="${p.name.replace(/'/g, "\\'")}" class="text-red-400 hover:text-red-300 text-lg px-1" title="Platformu Sil">×</button>
        </div>
    `).join('');
}

// GÖREV 5: Eksik İçe Aktarma Modalı Fonksiyonları
export function openImportModal() {
    openModal('import-modal');
}

export function closeImportModal() {
    closeModal('import-modal');
    // Modal kapandığında inputları temizle (opsiyonel)
    const fileInput = document.getElementById('import-file');
    const textArea = document.getElementById('import-text');
    if (fileInput) fileInput.value = '';
    if (textArea) textArea.value = '';
}


// GÖREV 2: Kopyalanmış calculateProfitLoss fonksiyonu buradan silindi.
