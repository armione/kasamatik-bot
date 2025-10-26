import { state, updateState } from './state.js';
import { showNotification, setButtonLoading } from './utils/helpers.js';
import { addSponsor, deleteSponsor, addAd, deleteAd } from './api/database.js';
import { renderAdminPanels } from './components/ui_helpers.js';

/**
 * Bu fonksiyon event_listeners.js'deki 'delete-sponsor' case'i tarafından çağrılır.
 * @param {number} id Silinecek sponsorun ID'si
 * @param {string} name Silinecek sponsorun adı (teyit için)
 */
export async function handleDeleteSponsor(id, name) {
    if (confirm(`'${name}' sponsorunu silmek istediğinizden emin misiniz?`)) {
        const { error } = await deleteSponsor(id);
        if (error) {
            showNotification('Sponsor silinemedi: ' + error.message, 'error');
        } else {
            updateState({ sponsors: state.sponsors.filter(s => s.id !== id) });
            renderAdminPanels(); // Admin panelini ve sponsor sayfasını yeniden çiz
            showNotification(`🗑️ '${name}' sponsoru silindi.`, 'error');
        }
    }
}

/**
 * Bu fonksiyon event_listeners.js'deki 'delete-ad' case'i tarafından çağrılır.
 * @param {number} id Silinecek reklamın ID'si
 */
export async function handleDeleteAd(id) {
    if (confirm('Bu reklamı silmek istediğinizden emin misiniz?')) {
        const { error } = await deleteAd(id);
        if (error) {
            showNotification('Reklam silinemedi: ' + error.message, 'error');
        } else {
            updateState({ ads: state.ads.filter(ad => ad.id !== id) });
            renderAdminPanels(); // Admin panelini yeniden çiz
            showNotification('🗑️ Reklam silindi.', 'error');
        }
    }
}

// --- Admin Formları için Dahili Fonksiyonlar ---

/**
 * Sponsor ekleme formunu yönetir.
 * @param {Event} e Submit olayı
 */
async function handleAddSponsorAttempt(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Ekleniyor...');
    
    const sponsorData = {
        name: form['sponsor-name'].value,
        logo_url: form['sponsor-logo-url'].value,
        target_url: form['sponsor-target-url'].value
    };

    const { data, error } = await addSponsor(sponsorData);
    if (error) {
        showNotification('Sponsor eklenemedi: ' + error.message, 'error');
    } else {
        state.sponsors.unshift(data[0]);
        renderAdminPanels(); // Admin panelini (ve sponsor sayfasını) güncelle
        form.reset();
        showNotification('🏆 Yeni sponsor başarıyla eklendi!', 'success');
    }
    setButtonLoading(button, false);
}

/**
 * Reklam ekleme formunu yönetir.
 * @param {Event} e Submit olayı
 */
async function handleAddAdAttempt(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Ekleniyor...');

    const adData = {
        image_url: form['ad-image-url'].value,
        target_url: form['ad-target-url'].value,
        location: form['ad-location'].value
    };

    const { data, error } = await addAd(adData);
    if (error) {
        showNotification('Reklam eklenemedi: ' + error.message, 'error');
    } else {
        state.ads.unshift(data[0]);
        renderAdminPanels(); // Admin panelini güncelle
        form.reset();
        showNotification('📢 Yeni reklam başarıyla eklendi!', 'success');
    }
    setButtonLoading(button, false);
}

/**
 * Bu fonksiyon event_listeners.js'de, admin girişi yapıldığında çağrılır.
 * Admin formları için (Sponsor, Reklam) submit listener'larını ayarlar.
 */
export function setupAdminEventListeners() {
    const sponsorForm = document.getElementById('sponsor-form');
    const adForm = document.getElementById('ad-form');

    if (sponsorForm) {
        // Form listener'ının birden fazla kez eklenmesini önle
        sponsorForm.removeEventListener('submit', handleAddSponsorAttempt);
        sponsorForm.addEventListener('submit', handleAddSponsorAttempt);
    }

    if (adForm) {
        // Form listener'ının birden fazla kez eklenmesini önle
        adForm.removeEventListener('submit', handleAddAdAttempt);
        adForm.addEventListener('submit', handleAddAdAttempt);
    }
    
    // console.log("Admin event listeners (Sponsor/Reklam formları) kuruldu.");
}
