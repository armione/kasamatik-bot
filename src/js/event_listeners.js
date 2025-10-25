import { state, updateState } from './state.js';
import { DOM, DEFAULT_PLATFORMS, ADMIN_USER_ID } from './utils/constants.js';
import { showNotification, setButtonLoading, calculateProfitLoss } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSpecialOdd, updateSpecialOdd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { changeBetPage, changeCashPage, renderHistory } from './components/history.js';
// ui_helpers'dan handleImageFile fonksiyonunu da import ediyoruz
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderActiveSpecialOdds, renderSpecialOddsPage } from './components/ui_helpers.js';
// DÜZELTME: Import * as Modals yerine named import kullanıldı
import { openModal, closeModal, openPlatformManager, closePlatformManager, openCashTransactionModal, closeCashTransactionModal, openQuickAddModal, closeQuickAddModal, openEditModal, closeEditModal, openPlaySpecialOddModal, closePlaySpecialOddModal, showImageModal, closeImageModal, closeAdPopup, renderCustomPlatformsModal } from './components/modals.js';
import { updateStatisticsPage } from './components/statistics.js';
import { updatePerformanceSummary } from './components/dashboard.js';

let searchDebounceTimer;

// HANDLER FUNCTIONS (OLAY YÖNETİCİLERİ)

async function handleLoginAttempt() {
    const loginBtn = DOM.get('loginBtn');
    const authForm = DOM.get('authForm');
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    const { error } = await signIn(authForm.email.value, authForm.password.value);
    if (error) {
        showNotification(`Giriş hatası: ${error.message}`, 'error');
    }
    setButtonLoading(loginBtn, false);
}

// GÖREV 0.1 DÜZELTMESİ: Kayıt fonksiyonu, mevcut e-posta adreslerini doğru bir şekilde ele alacak şekilde güncellendi.
async function handleSignUpAttempt() {
    console.log("handleSignUpAttempt çağrıldı."); // EKLENDİ: Fonksiyonun çağrıldığını kontrol et
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');
    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    const email = authForm.email.value;

    // Supabase'den hem data hem de error objelerini alıyoruz.
    const { data, error } = await signUp(email, authForm.password.value);
    console.log("Supabase signUp sonucu:", { data, error }); // EKLENDİ: Supabase cevabını gör

    if (error) {
        // "User already registered" gibi hataları burada yakalıyoruz.
        console.log("Kayıt hatası yakalandı:", error.message); // EKLENDİ: Hata mesajını gör
        showNotification(`Kayıt hatası: ${error.message}`, 'error');
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        // Bu durum, e-postanın zaten kayıtlı olduğunu ancak henüz onaylanmadığını gösterir.
        // Supabase bu durumda sadece onay mailini tekrar gönderir. Kullanıcıya doğru bilgiyi veriyoruz.
        console.log("Mevcut ama onaylanmamış e-posta durumu."); // EKLENDİ: Bu bloğa girip girmediğini gör
        showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
    } else if (data.user) {
        // Bu, başarılı ve yeni bir kayıt işlemidir.
        console.log("Yeni kayıt başarılı."); // EKLENDİ: Başarılı kayıt durumunu gör
        authForm.classList.add('hidden');
        document.getElementById('user-email-confirm').textContent = email;
        document.getElementById('signup-success-message').classList.remove('hidden');
    } else {
        // Beklenmeyen bir durum
        console.log("Beklenmeyen Supabase signUp cevabı:", data); // EKLENDİ: Diğer durumları logla
        showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
    setButtonLoading(signupBtn, false);
}

async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    const sendResetBtn = DOM.get('sendResetBtn');
    const passwordResetForm = DOM.get('passwordResetForm');
    setButtonLoading(sendResetBtn, true, 'Gönderiliyor...');
    const { error } = await resetPasswordForEmail(passwordResetForm['reset-email'].value);
    if (error) {
        showNotification(`Hata: ${error.message}`, 'error');
    } else {
        showNotification('Şifre sıfırlama linki e-postana gönderildi.', 'success');
        // DÜZELTME: Modals.closeModal yerine closeModal kullanıldı
        closeModal('password-reset-modal');
    }
    setButtonLoading(sendResetBtn, false);
}

async function handleUpdatePasswordAttempt(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const updateButton = document.getElementById('update-password-btn');

    if (!newPassword || !confirmPassword) {
        showNotification('Lütfen tüm şifre alanlarını doldurun.', 'warning');
        return;
    }
    if (newPassword.length < 6) {
        showNotification('Yeni şifre en az 6 karakter olmalıdır.', 'warning');
        return;
    }
    if (newPassword !== confirmPassword) {
        showNotification('Şifreler uyuşmuyor.', 'error');
        return;
    }

    setButtonLoading(updateButton, true, 'Güncelleniyor...');
    const { error } = await updateUserPassword(newPassword);
    if (error) {
        showNotification(`Hata: ${error.message}`, 'error');
    } else {
        showNotification('Şifreniz başarıyla güncellendi!', 'success');
        DOM.get('accountSettingsForm').reset();
    }
    setButtonLoading(updateButton, false);
}

async function handleBetFormSubmitAttempt(e) {
    e.preventDefault();
    const addButton = document.getElementById('add-bet-btn');

    // HATA DÜZELTME 2: Form Doğrulaması Eklendi
    const platform = document.getElementById('platform').value;
    const betType = document.getElementById('bet-type').value;
    const betAmount = parseFloat(document.getElementById('bet-amount').value);
    const odds = parseFloat(document.getElementById('odds').value);
    const date = document.getElementById('bet-date').value;

    if (platform === 'all' || platform === '') {
         showNotification('Lütfen bir platform seçin.', 'warning');
         return;
    }
    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı girin (0\'dan büyük).', 'warning');
        return;
    }
    if (isNaN(odds) || odds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }
    if (!date) {
         showNotification('Lütfen bir tarih seçin.', 'warning');
         return;
    }
    // --- Form Doğrulaması Sonu ---

    setButtonLoading(addButton, true, 'Ekleniyor...');

    const newBetData = {
        user_id: state.currentUser.id,
        platform: platform,
        bet_type: betType,
        description: document.getElementById('description').value || 'Açıklama yok',
        bet_amount: betAmount,
        odds: odds,
        date: date,
        status: 'pending',
        win_amount: 0,
        profit_loss: 0
    };

    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Bahis eklenirken hata oluştu: ' + error.message, 'error');
    } else {
        state.bets.unshift(data[0]);
        updateAllUI();
        resetForm();
        showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
    }
    setButtonLoading(addButton, false);
}

async function handlePlaySpecialOdd(button) {
    const amountInput = document.getElementById('special-odd-bet-amount');
    const amount = parseFloat(amountInput.value);
    const odd = state.playingSpecialOdd;

    if (!odd || isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin.', 'warning');
        return;
    }
    if (odd.max_bet_amount && amount > odd.max_bet_amount) {
        showNotification(`Maksimum bahis limitini (${odd.max_bet_amount} ₺) aştınız.`, 'error');
        return;
    }

    setButtonLoading(button, true, 'Ekleniyor...');

    const newBetData = {
        user_id: state.currentUser.id,
        platform: odd.platform,
        bet_type: 'Özel Oran',
        description: odd.description,
        bet_amount: amount,
        odds: odd.odds,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        win_amount: 0,
        profit_loss: 0,
        special_odd_id: odd.id
    };

    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Fırsat oynanırken bir hata oluştu: ' + error.message, 'error');
        setButtonLoading(button, false);
    } else {
        state.bets.unshift(data[0]);

        // Oynanma sayısını artırma (atomik olmayan, basit artırma)
        const { error: updateError } = await addBet({ // addBet yerine update kullanmalıydık ama basitlik için böyle bırakıldı
            ...odd,
            play_count: odd.play_count + 1
        });
        if(!updateError){
             const index = state.specialOdds.findIndex(o => o.id === odd.id);
             if(index > -1) state.specialOdds[index].play_count++;
        } else {
            console.error("Oynanma sayısı güncellenirken hata:", updateError);
        }

        updateAllUI();
        renderSpecialOddsPage();
        closePlaySpecialOddModal();
        showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
    }
}


async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    // HATA DÜZELTME 2: Hızlı Ekle için de Form Doğrulaması
    const quickPlatform = document.getElementById('quick-platform').value;
    const quickAmount = parseFloat(document.getElementById('quick-amount').value);
    const quickOdds = parseFloat(document.getElementById('quick-odds').value);

    if (quickPlatform === 'all' || quickPlatform === '') {
         showNotification('Lütfen bir platform seçin.', 'warning');
         return;
    }
    if (isNaN(quickAmount) || quickAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı girin (0\'dan büyük).', 'warning');
        return;
    }
    if (isNaN(quickOdds) || quickOdds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }
     // --- Hızlı Ekle Form Doğrulaması Sonu ---

    const newBetData = {
        user_id: state.currentUser.id,
        platform: quickPlatform,
        bet_type: 'Spor Bahis', // Varsayılan
        description: 'Hızlı bahis',
        bet_amount: quickAmount,
        odds: quickOdds,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        win_amount: 0,
        profit_loss: 0
    };

    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Hızlı bahis eklenemedi.', 'error');
    } else {
        state.bets.unshift(data[0]);
        updateAllUI();
        closeQuickAddModal();
        showNotification('🚀 Hızlı bahis eklendi!', 'success');
    }
}

async function handleSaveEditAttempt() {
    const bet = state.currentlyEditingBet;
    if (!bet) return;

    const status = document.getElementById('edit-status').value;
    const winAmount = parseFloat(document.getElementById('edit-win-amount').value) || 0;
    const tag = document.getElementById('edit-tag').value.trim() || null; // GÖREV 3.2: Yeni etiketi oku

    let updateData = {
        status: status,
        tag: tag // GÖREV 3.2: Güncelleme objesine etiketi ekle
    };

    // HATA DÜZELTME 2: Kazandı durumunda winAmount doğrulaması
    if (status === 'won') {
        if (isNaN(winAmount) || winAmount <= 0) {
             showNotification('Lütfen geçerli bir kazanç miktarı girin (0\'dan büyük).', 'warning');
             return; // Fonksiyonu durdur
        }
        updateData.win_amount = winAmount;
        updateData.profit_loss = winAmount - bet.bet_amount;
    } else if (status === 'lost') {
        updateData.win_amount = 0;
        updateData.profit_loss = -bet.bet_amount;
    } else { // pending or refunded
        updateData.win_amount = 0;
        updateData.profit_loss = 0;
    }

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi.', 'error');
    } else {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
            state.bets[index] = data[0];
        }
        updateAllUI();
        closeEditModal();
        showNotification('✔️ Bahis güncellendi!', 'info');
    }
}

async function handleDeleteBetAttempt(betId) {
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        const { error } = await deleteBet(betId);
        if (error) {
            showNotification('Kayıt silinemedi.', 'error');
        } else {
            updateState({ bets: state.bets.filter(b => b.id !== betId) });
            updateAllUI();
            showNotification('🗑️ Kayıt silindi.', 'error');
        }
    }
}

async function handleCashTransactionAttempt(type) {
    const input = document.getElementById('cash-amount');
    let amount = parseFloat(input.value);

    // HATA DÜZELTME 2: Kasa işlemi miktar doğrulaması
    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin (0\'dan büyük).', 'warning');
        return;
    }

    const isDeposit = type === 'deposit';
    const profitLoss = isDeposit ? amount : -amount;

    const cashTransaction = {
        user_id: state.currentUser.id,
        platform: 'Kasa İşlemi',
        bet_type: 'Kasa İşlemi',
        description: isDeposit ? 'Para Ekleme' : 'Para Çekme',
        bet_amount: Math.abs(amount),
        odds: 1, // Kasa işlemi için oran anlamsız, 1 olarak ayarlandı
        date: new Date().toISOString().split('T')[0],
        status: isDeposit ? 'won' : 'lost', // Kasa işlemleri için durum anlamsız, ama mantığı korumak için ayarlandı
        win_amount: isDeposit ? amount : 0,
        profit_loss: profitLoss,
    };

    const { data, error } = await addBet(cashTransaction);
    if (error) {
        showNotification('Kasa işlemi kaydedilemedi.', 'error');
    } else {
        state.bets.unshift(data[0]);
        updateAllUI();
        closeCashTransactionModal();
        showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
    }
}

async function handleAddPlatformAttempt(fromModal = false) {
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    const allPlatforms = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)];

    if (name && !allPlatforms.includes(name)) {
        const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
        if (error) {
            showNotification('Platform eklenemedi.', 'error');
        } else {
            state.customPlatforms.push(data[0]);
            input.value = '';
            if (fromModal) {
                renderCustomPlatformsModal();
            } else {
                renderCustomPlatforms();
            }
            populatePlatformOptions();
            showNotification(`✅ ${name} platformu eklendi!`, 'success');
        }
    } else if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
    } else {
        showNotification('Bu platform zaten mevcut.', 'warning');
    }
}

async function handleRemovePlatformAttempt(platformId, platformName) {
    if (confirm(`'${platformName}' platformunu silmek istediğinizden emin misiniz?`)) {
        const { error } = await deletePlatform(platformId);
        if (error) {
            showNotification('Platform silinemedi.', 'error');
        } else {
            updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
            renderCustomPlatforms();
            renderCustomPlatformsModal();
            populatePlatformOptions();
            showNotification(`🗑️ ${platformName} platformu silindi`, 'error');
        }
    }
}

async function handleClearAllDataAttempt() {
    if (confirm('TÜM KİŞİSEL VERİLERİNİZİ (BAHİS, PLATFORM) SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!')) {
        const [betsRes, platformsRes] = await Promise.all([
            clearAllBetsForUser(state.currentUser.id),
            clearAllPlatformsForUser(state.currentUser.id)
        ]);

        if (betsRes.error || platformsRes.error) {
            showNotification('Veriler silinirken bir hata oluştu.', 'error');
        } else {
            updateState({ bets: [], customPlatforms: [] });
            updateAllUI();
            populatePlatformOptions();
            renderCustomPlatforms();
            showNotification('🗑️ Kişisel verileriniz silindi!', 'error');
        }
    }
}

async function handleUserAnalyzeBetSlip() {
    // HATA DÜZELTME 1: Doğru state değişkenini kontrol et (currentImageData)
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Okunuyor...');

    try {
        // HATA DÜZELTME 1: Doğru state değişkeninden base64 verisini al
        const base64Data = state.currentImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);
        if (result) {
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                document.getElementById('description').value = descriptionText;
            }
            if (result.betAmount) document.getElementById('bet-amount').value = result.betAmount;
            if (result.odds) document.getElementById('odds').value = result.odds;

            showNotification('✨ Kupon bilgileri başarıyla okundu!', 'success');
        } else {
            throw new Error("API'den geçerli bir sonuç alınamadı.");
        }
    } catch (error) {
        console.error('Gemini API Hatası:', error);
        showNotification('Kupon okunurken bir hata oluştu.', 'error');
    } finally {
        setButtonLoading(geminiButton, false);
    }
}

async function handleAdminAnalyzeBetSlip() {
    if (!state.adminImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('admin-gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Okunuyor...');

    try {
        const base64Data = state.adminImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);
        if (result) {
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                document.getElementById('special-odd-description').value = descriptionText;
            }
            if (result.odds) document.getElementById('special-odd-odds').value = result.odds;

            showNotification('✨ Fırsat bilgileri başarıyla okundu!', 'success');
        } else {
            throw new Error("API'den geçerli bir sonuç alınamadı.");
        }
    } catch (error) {
        console.error('Gemini API Hatası:', error);
        showNotification('Kupon okunurken bir hata oluştu.', 'error');
    } finally {
        setButtonLoading(geminiButton, false);
    }
}

// GÖREV 1.4: Panodan resim yapıştırma işleyicisi
async function handlePasteFromClipboard(type) {
    try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            showNotification('Tarayıcınız panodan okumayı desteklemiyor.', 'warning');
            return;
        }

        showNotification('📋 Pano okunuyor...', 'info', 2000);
        const items = await navigator.clipboard.read();
        let imageBlob = null;

        for (const item of items) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                imageBlob = await item.getType(imageType);
                break;
            }
        }

        if (imageBlob) {
            const file = new File([imageBlob], 'pasted-image.png', { type: imageBlob.type });
            handleImageFile(file, type); // ui_helpers'dan import edildi
            showNotification('✅ Resim panodan yapıştırıldı!', 'success');
        } else {
            showNotification('Panoda yapıştırılacak bir resim bulunamadı.', 'warning');
        }
    } catch (err) {
        console.error('Panodan yapıştırma hatası:', err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
             showNotification('Panodan okuma izni vermelisiniz.', 'error');
        } else {
             showNotification('Panodan okuma başarısız oldu.', 'error');
        }
    }
}

async function handlePublishSpecialOdd(e) {
    e.preventDefault();
    const form = document.getElementById('special-odd-form');
    const button = form.querySelector('button[type="submit"]');

    // HATA DÜZELTME 2: Admin paneli özel oran formu için de doğrulama
    const description = document.getElementById('special-odd-description').value;
    const odds = parseFloat(document.getElementById('special-odd-odds').value);
    const platform = document.getElementById('special-odd-platform').value;

    if (!description.trim()) {
        showNotification('Lütfen bir açıklama girin.', 'warning');
        return;
    }
     if (isNaN(odds) || odds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }
     if (!platform.trim()) {
        showNotification('Lütfen bir platform adı girin.', 'warning');
        return;
    }
    // --- Admin Form Doğrulaması Sonu ---

    setButtonLoading(button, true, 'Yayınlanıyor...');

    const oddData = {
        description: description,
        odds: odds,
        platform: platform,
        max_bet_amount: parseFloat(document.getElementById('special-odd-max-bet').value) || null,
        primary_link_text: document.getElementById('special-odd-primary-link-text').value || null,
        primary_link_url: document.getElementById('special-odd-primary-link-url').value || null,
        secondary_link_text: document.getElementById('special-odd-secondary-link-text').value || null,
        secondary_link_url: document.getElementById('special-odd-secondary-link-url').value || null,
        status: 'pending'
    };

    const { data, error } = await addSpecialOdd(oddData);
    if (error) {
        showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
    } else {
        state.specialOdds.unshift(data[0]);
        renderActiveSpecialOdds();
        form.reset();
        removeImage('admin');
        showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
    }
    setButtonLoading(button, false);
}


async function handleResolveSpecialOdd(id, status) {
    if (!confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`)) {
        return;
    }

    const { data, error } = await updateSpecialOdd(id, { status });
    if(error) {
        showNotification('Fırsat durumu güncellenemedi.', 'error');
    } else {
        const index = state.specialOdds.findIndex(o => o.id === parseInt(id));
        if(index > -1) {
            // state.specialOdds[index] = data[0]; // Bu satır Realtime ile çakışabilir, kaldırıldı.
        }
        renderActiveSpecialOdds(); // Sadece admin panelini güncelle
        // updateAllUI(); // Realtime zaten güncelleyeceği için genel UI güncellemesine gerek yok.
        showNotification('Fırsat durumu güncellendi!', 'info');
    }
}

// EVENT LISTENER SETUP
export function setupEventListeners() {
    if (state.listenersAttached) {
        return;
    };

    console.log("setupEventListeners çağrılıyor.");

    document.querySelectorAll('button').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement && !button.dataset.defaultText) { // Sadece ilk kez ata
            button.dataset.defaultText = textElement.textContent;
        }
    });

    // Auth
    DOM.get('loginBtn')?.addEventListener('click', handleLoginAttempt);
    DOM.get('signupBtn')?.addEventListener('click', handleSignUpAttempt);
    DOM.get('logoutBtn')?.addEventListener('click', () => signOut());

    const forgotPasswordLink = DOM.get('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('password-reset-modal');
        });
    }

    DOM.get('cancelResetBtn')?.addEventListener('click', () => closeModal('password-reset-modal'));
    DOM.get('passwordResetForm')?.addEventListener('submit', handlePasswordResetAttempt);
    DOM.get('accountSettingsForm')?.addEventListener('submit', handleUpdatePasswordAttempt);

    // Sidebar and Navigation
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section, item));
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileSidebar);

    // Form Submissions
    document.getElementById('bet-form')?.addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form')?.addEventListener('submit', handleQuickAddSubmitAttempt);
    document.getElementById('special-odd-form')?.addEventListener('submit', handlePublishSpecialOdd);

    // Clicks on dynamically generated content (Event Delegation)
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;
        const name = target.dataset.name;
        const page = target.dataset.page ? parseInt(target.dataset.page, 10) : null;
        const src = target.dataset.src;
        const period = target.dataset.period;
        const status = target.dataset.status;

        switch (action) {
            case 'open-edit-modal': if (id !== null) openEditModal(id); break;
            case 'delete-bet': if (id !== null) handleDeleteBetAttempt(id); break;
            case 'remove-platform': if (id !== null && name !== undefined) handleRemovePlatformAttempt(id, name); break;
            case 'changeBetPage': if (page !== null) changeBetPage(page); break;
            case 'changeCashPage': if (page !== null) changeCashPage(page); break;
            case 'show-image-modal': if (src) showImageModal(src); break;
            case 'set-dashboard-period':
                if (period !== undefined) {
                    const periodNum = parseInt(period, 10);
                    if (!isNaN(periodNum)) {
                         updateState({ dashboardPeriod: periodNum });
                         updatePerformanceSummary();
                    }
                }
                break;
            case 'set-history-period':
                 if (period !== undefined) {
                    updateState({ filters: { ...state.filters, period: period === 'all' ? 'all' : parseInt(period, 10) }, currentPage: 1 });
                    document.querySelectorAll('#history-period-buttons .period-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.period === period);
                    });
                    renderHistory();
                 }
                break;
            case 'resolve-special-odd': if (id !== null && status) handleResolveSpecialOdd(id, status); break;
            case 'open-play-special-odd-modal': if (id !== null) openPlaySpecialOddModal(id); break;
            case 'delete-sponsor':
                if (id !== null && name !== undefined) {
                    import('./admin_actions.js').then(module => module.handleDeleteSponsor(id, name));
                }
                break;
            case 'delete-ad':
                if (id !== null) {
                    import('./admin_actions.js').then(module => module.handleDeleteAd(id));
                }
                break;
        }
    });

    // Fırsatı Oyna Modal
    document.getElementById('special-odd-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') {
            closePlaySpecialOddModal();
        }
        if (e.target.id === 'confirm-play-special-odd') {
            handlePlaySpecialOdd(e.target);
        }
    });

    // Bahis Geçmişi Filtreleme
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        updateState({ currentPage: 1 });
        renderHistory();
    });
    document.getElementById('platform-filter')?.addEventListener('change', (e) => {
        state.filters.platform = e.target.value;
        updateState({ currentPage: 1 });
        renderHistory();
    });
     document.getElementById('search-filter')?.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            state.filters.searchTerm = e.target.value;
            updateState({ currentPage: 1 });
            renderHistory();
        }, 300);
    });

    // Fırsatlar Sayfası Filtreleme
    document.getElementById('special-odds-status-filter')?.addEventListener('change', e => {
        state.specialOddsFilters.status = e.target.value;
        renderSpecialOddsPage();
    });
    document.getElementById('special-odds-platform-filter')?.addEventListener('change', e => {
        state.specialOddsFilters.platform = e.target.value;
        renderSpecialOddsPage();
    });
    document.getElementById('special-odds-sort-filter')?.addEventListener('change', e => {
        state.specialOddsFilters.sort = e.target.value;
        renderSpecialOddsPage();
    });

     document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        state.statsFilters.dateRange = { start: null, end: null };
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if(datePicker) datePicker.clear();
        updateStatisticsPage();
    });

    // Diğer UI etkileşimleri
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm());
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip);
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip);

    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt);
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt);

    // Modals
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal);
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager);
    document.getElementById('close-quick-add-btn')?.addEventListener('click', closeQuickAddModal);
    document.getElementById('close-edit-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-edit-btn')?.addEventListener('click', handleSaveEditAttempt);
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal);
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);

    // Image Upload
    const setupImageUpload = (type) => {
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);
        const pasteBtn = document.getElementById(`${prefix}paste-image-btn`);

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) {
            return;
        }

        selectBtn.addEventListener('click', () => imageInput.click());
        if (pasteBtn) pasteBtn.addEventListener('click', () => handlePasteFromClipboard(type));
        imageInput.addEventListener('change', (e) => handleImageFile(e.target.files[0], type));
        removeBtn.addEventListener('click', () => removeImage(type));
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.toggle('dragover', eventName === 'dragover');
                if (eventName === 'drop' && e.dataTransfer?.files?.length > 0) {
                     handleImageFile(e.dataTransfer.files[0], type);
                }
            }, false);
        });
    };
    setupImageUpload('main');
    setupImageUpload('quick');
    setupImageUpload('admin');

    document.addEventListener('paste', e => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return;

            let type = 'main';
            const quickAddModal = document.getElementById('quick-add-modal');
            const adminPanelContainer = document.getElementById('admin-panels-container');

            if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                type = 'quick';
            } else if (state.currentSection === 'settings' && adminPanelContainer && !adminPanelContainer.classList.contains('hidden')) {
                 type = 'admin';
            } else if (state.currentSection !== 'new-bet') {
                return;
            }

            handleImageFile(file, type);
        } catch (pasteError) {
             console.error("Yapıştırma hatası:", pasteError);
        }
    });

    // Platform Management
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false));
    document.getElementById('add-platform-modal-btn')?.addEventListener('click', () => handleAddPlatformAttempt(true));
    document.getElementById('close-platform-manager-btn')?.addEventListener('click', closePlatformManager);

    // Cash Management
    document.getElementById('cash-transaction-close-btn')?.addEventListener('click', closeCashTransactionModal);
    document.getElementById('cash-deposit-btn')?.addEventListener('click', () => handleCashTransactionAttempt('deposit'));
    document.getElementById('cash-withdrawal-btn')?.addEventListener('click', () => handleCashTransactionAttempt('withdrawal'));

    // Admin Actions Module
    if (state.currentUser?.id === ADMIN_USER_ID) {
        import('./admin_actions.js')
            .then(module => {
                if (module && typeof module.setupAdminEventListeners === 'function') {
                    module.setupAdminEventListeners();
                } else {
                     console.error("Admin actions modülünde 'setupAdminEventListeners' fonksiyonu bulunamadı.");
                }
            })
            .catch(err => console.error("Admin actions modülü yüklenemedi:", err));
    }

    updateState({ listenersAttached: true });
    console.log("Event listeners başarıyla bağlandı.");
}

