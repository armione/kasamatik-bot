import { state, updateState } from './state.js';
import { DOM, DEFAULT_PLATFORMS, ADMIN_USER_ID } from './utils/constants.js';
import { showNotification, setButtonLoading, calculateProfitLoss } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSpecialOdd, updateSpecialOdd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { changeBetPage, changeCashPage, renderHistory } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderActiveSpecialOdds, renderSpecialOddsPage } from './components/ui_helpers.js';
import { openModal, closeModal, openPlatformManager, closePlatformManager, openCashTransactionModal, closeCashTransactionModal, openQuickAddModal, closeQuickAddModal, openEditModal, closeEditModal, openPlaySpecialOddModal, closePlaySpecialOddModal, showImageModal, closeImageModal, closeAdPopup, renderCustomPlatformsModal } from './components/modals.js';
import { updateStatisticsPage } from './components/statistics.js';
import { updatePerformanceSummary } from './components/dashboard.js';
// İçe/Dışa Aktarma fonksiyonları için import eklendi
import { handleExportData, handleImportData } from './data_actions.js';

let searchDebounceTimer;

// HANDLER FUNCTIONS (OLAY YÖNETİCİLERİ)

async function handleLoginAttempt() {
    const loginBtn = DOM.get('loginBtn');
    const authForm = DOM.get('authForm');
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    try {
        const { error } = await signIn(authForm.email.value, authForm.password.value);
        if (error) {
            showNotification(`Giriş hatası: ${error.message}`, 'error');
        }
        // Başarılı girişten sonra sayfa otomatik yenilenecek veya initializeApp tetiklenecek.
        // Hata durumunda bile loading state'ini kapatıyoruz.
    } catch (error) {
        // Beklenmedik JS hataları için
        showNotification(`Beklenmedik bir hata oluştu: ${error.message}`, 'error');
        console.error("Login attempt error:", error);
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

async function handleSignUpAttempt() {
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');
    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    const email = authForm.email.value;

    try {
        const { data, error } = await signUp(email, authForm.password.value);
        console.log("Supabase signUp sonucu:", { data, error });

        if (error) {
            showNotification(`Kayıt hatası: ${error.message}`, 'error');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
        } else if (data.user) {
            authForm.classList.add('hidden');
            document.getElementById('user-email-confirm').textContent = email;
            document.getElementById('signup-success-message').classList.remove('hidden');
        } else {
            showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    } catch (error) {
        showNotification(`Beklenmedik bir kayıt hatası oluştu: ${error.message}`, 'error');
        console.error("Signup attempt error:", error);
    } finally {
        setButtonLoading(signupBtn, false);
    }
}


async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    const sendResetBtn = DOM.get('sendResetBtn');
    const passwordResetForm = DOM.get('passwordResetForm');
    setButtonLoading(sendResetBtn, true, 'Gönderiliyor...');
    try {
        const { error } = await resetPasswordForEmail(passwordResetForm['reset-email'].value);
        if (error) {
            showNotification(`Hata: ${error.message}`, 'error');
        } else {
            showNotification('Şifre sıfırlama linki e-postana gönderildi.', 'success');
            closeModal('password-reset-modal');
        }
    } catch (error) {
        showNotification(`Beklenmedik şifre sıfırlama hatası: ${error.message}`, 'error');
        console.error("Password reset error:", error);
    } finally {
        setButtonLoading(sendResetBtn, false);
    }
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
    try {
        const { error } = await updateUserPassword(newPassword);
        if (error) {
            showNotification(`Hata: ${error.message}`, 'error');
        } else {
            showNotification('Şifreniz başarıyla güncellendi!', 'success');
            DOM.get('accountSettingsForm').reset();
        }
    } catch (error) {
        showNotification(`Beklenmedik şifre güncelleme hatası: ${error.message}`, 'error');
        console.error("Update password error:", error);
    } finally {
        setButtonLoading(updateButton, false);
    }
}

async function handleBetFormSubmitAttempt(e) {
    e.preventDefault();
    const addButton = document.getElementById('add-bet-btn');

    // --- YENİ EKLENEN DOĞRULAMA KONTROLLERİ ---
    const platform = document.getElementById('platform').value;
    const betAmount = parseFloat(document.getElementById('bet-amount').value);
    const odds = parseFloat(document.getElementById('odds').value);
    const date = document.getElementById('bet-date').value;

    if (!platform || platform === "all") { // 'all' değeri de geçersiz kabul edilir
        showNotification('Lütfen bir platform seçin.', 'warning');
        return;
    }
    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı (0\'dan büyük) girin.', 'warning');
        return;
    }
    // Oran kontrolü 1.01 ve üzeri olmalı (genellikle bahislerde oran 1.00 olmaz)
    if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        return;
    }
    if (!date) {
        showNotification('Lütfen bir tarih seçin.', 'warning');
        return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---


    setButtonLoading(addButton, true, 'Ekleniyor...');
    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: platform, // Doğrulanmış değeri kullan
            bet_type: document.getElementById('bet-type').value,
            description: document.getElementById('description').value || 'Açıklama yok',
            bet_amount: betAmount, // Doğrulanmış değeri kullan
            odds: odds,           // Doğrulanmış değeri kullan
            date: date,           // Doğrulanmış değeri kullan
            status: 'pending',
            win_amount: 0,
            profit_loss: 0
        };

        const { data, error } = await addBet(newBetData);
        if (error) {
            showNotification('Bahis eklenirken hata oluştu: ' + error.message, 'error');
        } else if (data && data.length > 0) { // Supabase'den geçerli veri döndüğünü kontrol et
            state.bets.unshift(data[0]);
            updateAllUI();
            resetForm();
            showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
        } else {
             showNotification('Bahis eklendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik bahis ekleme hatası: ${error.message}`, 'error');
        console.error("Add bet error:", error);
    } finally {
        setButtonLoading(addButton, false);
    }
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
    try {
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
        } else if (data && data.length > 0) {
            state.bets.unshift(data[0]);

            const { data: updatedOdd, error: updateError } = await updateSpecialOdd(odd.id, { play_count: odd.play_count + 1 });
            if (!updateError && updatedOdd && updatedOdd.length > 0) {
                const index = state.specialOdds.findIndex(o => o.id === odd.id);
                if (index > -1) state.specialOdds[index] = updatedOdd[0];
            }
            updateAllUI();
            renderSpecialOddsPage();
            closePlaySpecialOddModal();
            showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
        } else {
            showNotification('Fırsat eklendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik fırsat oynama hatası: ${error.message}`, 'error');
        console.error("Play special odd error:", error);
    } finally {
        setButtonLoading(button, false); // Buton state'ini her zaman sıfırla
    }
}


async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const quickAddButton = e.target.querySelector('button[type="submit"]'); // Butonu formdan bul

    // --- YENİ EKLENEN DOĞRULAMA KONTROLLERİ (Hızlı Ekleme için) ---
    const platform = document.getElementById('quick-platform').value;
    const betAmount = parseFloat(document.getElementById('quick-amount').value);
    const odds = parseFloat(document.getElementById('quick-odds').value);

    if (!platform || platform === "all") {
        showNotification('Lütfen bir platform seçin.', 'warning');
        return;
    }
    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı (0\'dan büyük) girin.', 'warning');
        return;
    }
    if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---

    setButtonLoading(quickAddButton, true, 'Ekleniyor...'); // Bulunan butona loading state uygula
    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: platform,
            bet_type: 'Spor Bahis', // Hızlı eklemede varsayılan
            description: 'Hızlı bahis', // Hızlı eklemede varsayılan
            bet_amount: betAmount,
            odds: odds,
            date: new Date().toISOString().split('T')[0], // Bugünün tarihi
            status: 'pending',
            win_amount: 0,
            profit_loss: 0
        };

        const { data, error } = await addBet(newBetData);
        if (error) {
            showNotification('Hızlı bahis eklenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.bets.unshift(data[0]);
            updateAllUI();
            closeQuickAddModal();
            showNotification('🚀 Hızlı bahis eklendi!', 'success');
        } else {
            showNotification('Hızlı bahis eklendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik hızlı bahis ekleme hatası: ${error.message}`, 'error');
        console.error("Quick add error:", error);
    } finally {
        setButtonLoading(quickAddButton, false); // Buton state'ini her zaman sıfırla
    }
}


async function handleSaveEditAttempt() {
    const saveButton = document.getElementById('save-edit-btn');
    const bet = state.currentlyEditingBet;
    if (!bet) return;

    const status = document.getElementById('edit-status').value;
    const winAmountInput = document.getElementById('edit-win-amount');
    const winAmount = parseFloat(winAmountInput.value) || 0;

    // Kazandı durumu için ek kontrol
    if (status === 'won' && (isNaN(winAmount) || winAmount < 0)) {
        showNotification('Kazanan bahisler için geçerli bir kazanç miktarı girin (0 veya üzeri).', 'warning');
        return;
    }

    setButtonLoading(saveButton, true, 'Kaydediliyor...');
    try {
        let updateData = { status: status };

        if (status === 'won') {
            updateData.win_amount = winAmount;
            // profit_loss hesaplaması API veya veritabanı trigger'ı ile yapılabilir veya burada:
            updateData.profit_loss = winAmount - bet.bet_amount;
        } else if (status === 'lost') {
            updateData.win_amount = 0;
            updateData.profit_loss = -bet.bet_amount;
        } else { // pending veya refunded gibi durumlar
            updateData.win_amount = 0;
            updateData.profit_loss = 0; // Bekleyen veya iade edilenin kar/zararı 0'dır
        }

        const { data, error } = await updateBet(state.editingBetId, updateData);
        if (error) {
            showNotification('Bahis güncellenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            const index = state.bets.findIndex(b => b.id === state.editingBetId);
            if (index !== -1) {
                state.bets[index] = data[0];
            }
            updateAllUI();
            closeEditModal();
            showNotification('✔️ Bahis güncellendi!', 'info');
        } else {
             showNotification('Bahis güncellendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik bahis güncelleme hatası: ${error.message}`, 'error');
        console.error("Save edit error:", error);
    } finally {
        setButtonLoading(saveButton, false);
    }
}


async function handleDeleteBetAttempt(betId) {
    // Teyit penceresi
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    // Butona veya ilgili UI elementine loading state eklenebilir
    // const deleteButton = document.querySelector(`[data-action="delete-bet"][data-id="${betId}"]`);
    // if(deleteButton) setButtonLoading(deleteButton, true);

    try {
        const { error } = await deleteBet(betId);
        if (error) {
            showNotification('Kayıt silinemedi: ' + error.message, 'error');
        } else {
            // State'den sil
            updateState({ bets: state.bets.filter(b => b.id !== betId) });
            // UI'ı güncelle (History ve Dashboard gibi)
            updateAllUI();
            showNotification('🗑️ Kayıt başarıyla silindi.', 'success'); // Başarı bildirimi
        }
    } catch (error) {
        showNotification(`Beklenmedik silme hatası: ${error.message}`, 'error');
        console.error("Delete bet error:", error);
    } finally {
        // if(deleteButton) setButtonLoading(deleteButton, false);
    }
}


async function handleCashTransactionAttempt(type) {
    const input = document.getElementById('cash-amount');
    const depositButton = document.getElementById('cash-deposit-btn');
    const withdrawalButton = document.getElementById('cash-withdrawal-btn');
    const activeButton = type === 'deposit' ? depositButton : withdrawalButton;

    let amount = parseFloat(input.value);

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar (0\'dan büyük) girin.', 'warning');
        return;
    }

    setButtonLoading(activeButton, true, 'İşleniyor...');
    try {
        const isDeposit = type === 'deposit';
        const profitLoss = isDeposit ? amount : -amount;

        const cashTransaction = {
            user_id: state.currentUser.id,
            platform: 'Kasa İşlemi', // Sabit değer
            bet_type: 'Kasa İşlemi', // Sabit değer
            description: isDeposit ? 'Para Yatırma' : 'Para Çekme',
            bet_amount: Math.abs(amount), // Miktar her zaman pozitif
            odds: 1, // Kasa işlemi için anlamsız, 1 olabilir
            date: new Date().toISOString().split('T')[0], // Bugünün tarihi
            status: isDeposit ? 'won' : 'lost', // Kasa işlemi için anlamsız, ama kar/zararı yansıtması için
            win_amount: isDeposit ? amount : 0, // Kazanç sadece yatırmada olur
            profit_loss: profitLoss, // Gerçek kar/zarar
        };

        const { data, error } = await addBet(cashTransaction); // Kasa işlemi de 'bets' tablosuna ekleniyor
        if (error) {
            showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.bets.unshift(data[0]); // Yeni işlemi listenin başına ekle
            updateAllUI(); // Dashboard ve Kasa Geçmişini güncelle
            closeCashTransactionModal(); // Modalı kapat
            showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} ₺`, 'success');
        } else {
             showNotification('Kasa işlemi kaydedildi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik kasa işlemi hatası: ${error.message}`, 'error');
        console.error("Cash transaction error:", error);
    } finally {
        setButtonLoading(activeButton, false);
    }
}


async function handleAddPlatformAttempt(fromModal = false) {
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const buttonId = fromModal ? 'add-platform-modal-btn' : 'add-platform-btn';
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const name = input.value.trim();

    if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
        return;
    }

    // Mevcut platformları kontrol et (hem varsayılan hem özel)
    const allPlatforms = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)];
    if (allPlatforms.some(p => p.toLowerCase() === name.toLowerCase())) {
        showNotification('Bu platform zaten mevcut.', 'warning');
        return;
    }

    setButtonLoading(button, true, 'Ekleniyor...');
    try {
        const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
        if (error) {
            showNotification('Platform eklenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.customPlatforms.push(data[0]);
            input.value = ''; // Input'u temizle
            // İlgili UI'ları güncelle
            if (fromModal) {
                renderCustomPlatformsModal(); // Modal içindeki listeyi güncelle
            } else {
                renderCustomPlatforms(); // Ayarlar sayfasındaki listeyi güncelle
            }
            populatePlatformOptions(); // Tüm platform <select> dropdownlarını güncelle
            showNotification(`✅ "${name}" platformu eklendi!`, 'success');
        } else {
             showNotification('Platform eklendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
        showNotification(`Beklenmedik platform ekleme hatası: ${error.message}`, 'error');
        console.error("Add platform error:", error);
    } finally {
        setButtonLoading(button, false);
    }
}


async function handleRemovePlatformAttempt(platformId, platformName) {
    // Teyit al
    if (!confirm(`"${platformName}" platformunu silmek istediğinizden emin misiniz? Bu platformla ilişkili bahisler silinmeyecek.`)) {
        return;
    }

    // Loading state eklenebilir
    // const removeButton = document.querySelector(`[data-action="remove-platform"][data-id="${platformId}"]`);
    // if(removeButton) setButtonLoading(removeButton, true);

    try {
        const { error } = await deletePlatform(platformId);
        if (error) {
            showNotification('Platform silinemedi: ' + error.message, 'error');
        } else {
            // State'den kaldır
            updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
            // UI'ları güncelle
            renderCustomPlatforms();
            renderCustomPlatformsModal();
            populatePlatformOptions();
            showNotification(`🗑️ "${platformName}" platformu silindi.`, 'success'); // Başarı mesajı
        }
    } catch (error) {
        showNotification(`Beklenmedik platform silme hatası: ${error.message}`, 'error');
        console.error("Remove platform error:", error);
    } finally {
        // if(removeButton) setButtonLoading(removeButton, false);
    }
}

async function handleClearAllDataAttempt() {
    // İKİ KEZ teyit al, bu çok tehlikeli bir işlem!
    if (!confirm('!!! DİKKAT !!!\nTÜM kişisel verilerinizi (bahisler, platformlar) KALICI olarak silmek istediğinizden emin misiniz? Bu işlem KESİNLİKLE geri alınamaz!')) {
        return;
    }
    if (!prompt('Silme işlemini onaylamak için "SİL" yazın:').toLowerCase() === 'sil') {
         showNotification('İşlem iptal edildi.', 'info');
         return;
    }


    const clearButton = document.getElementById('clear-all-btn') || document.getElementById('clear-all-settings-btn');
    setButtonLoading(clearButton, true, 'Siliniyor...');
    try {
        // Önce bahisleri, sonra platformları sil
        const betsRes = await clearAllBetsForUser(state.currentUser.id);
        const platformsRes = await clearAllPlatformsForUser(state.currentUser.id);

        if (betsRes.error || platformsRes.error) {
            // Hata mesajlarını birleştir
            const errorMessage = [betsRes.error?.message, platformsRes.error?.message].filter(Boolean).join('; ');
            showNotification(`Veriler silinirken hata oluştu: ${errorMessage}`, 'error');
        } else {
            // State'i temizle
            updateState({ bets: [], customPlatforms: [] });
            // Tüm UI'ı yeniden çiz
            updateAllUI();
            populatePlatformOptions(); // Dropdownları güncelle
            renderCustomPlatforms(); // Özel platform listesini güncelle
            showNotification('🗑️ Tüm kişisel verileriniz başarıyla silindi!', 'success');
        }
    } catch (error) {
        showNotification(`Beklenmedik veri silme hatası: ${error.message}`, 'error');
        console.error("Clear all data error:", error);
    } finally {
        setButtonLoading(clearButton, false);
    }
}

async function handleUserAnalyzeBetSlip() {
    if (!state.currentImageData) { // state.mainImageData yerine state.currentImageData kullanıldı
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Okunuyor...');

    try {
        const base64Data = state.currentImageData.split(',')[1]; // state.mainImageData yerine state.currentImageData kullanıldı
        const result = await analyzeBetSlipApi(base64Data);

        if (!result) throw new Error("API'den geçerli bir sonuç alınamadı.");

        // Gelen veriyi form alanlarına doldur
        if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
            const descriptionText = result.matches
                .map(match => `${match.matchName || '?'} (${(match.bets || []).join(', ') || '?'})`) // Eksik verilere karşı koruma
                .join(' / ');
            document.getElementById('description').value = descriptionText;
        }
        // Sayısal değerleri kontrol et ve doldur
        if (result.betAmount && !isNaN(result.betAmount)) document.getElementById('bet-amount').value = result.betAmount;
        if (result.odds && !isNaN(result.odds)) document.getElementById('odds').value = result.odds;

        showNotification('✨ Kupon bilgileri başarıyla okundu!', 'success');

    } catch (error) {
        console.error('Gemini API Hatası (Kullanıcı Kuponu):', error);
        showNotification(`Kupon okunurken bir hata oluştu: ${error.message}`, 'error');
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

        if (!result) throw new Error("API'den geçerli bir sonuç alınamadı.");

        if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
            const descriptionText = result.matches
                .map(match => `${match.matchName || '?'} (${(match.bets || []).join(', ') || '?'})`)
                .join(' / ');
            document.getElementById('special-odd-description').value = descriptionText;
        }
        if (result.odds && !isNaN(result.odds)) document.getElementById('special-odd-odds').value = result.odds;

        showNotification('✨ Fırsat bilgileri başarıyla okundu!', 'success');

    } catch (error) {
        console.error('Gemini API Hatası (Admin Kuponu):', error);
        showNotification(`Fırsat kuponu okunurken bir hata oluştu: ${error.message}`, 'error');
    } finally {
        setButtonLoading(geminiButton, false);
    }
}

async function handlePublishSpecialOdd(e) {
    e.preventDefault();
    const form = document.getElementById('special-odd-form');
    const button = form.querySelector('button[type="submit"]');

    // --- YENİ EKLENEN DOĞRULAMA KONTROLLERİ (Özel Oran için) ---
    const description = document.getElementById('special-odd-description').value.trim();
    const odds = parseFloat(document.getElementById('special-odd-odds').value);
    const platform = document.getElementById('special-odd-platform').value.trim();
    const maxBet = parseFloat(document.getElementById('special-odd-max-bet').value); // NaN olabilir

    if (!description) {
        showNotification('Lütfen fırsat için bir açıklama girin.', 'warning');
        return;
    }
     if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        return;
    }
     if (!platform) {
        showNotification('Lütfen platform adını girin.', 'warning');
        return;
    }
    if (!isNaN(maxBet) && maxBet <= 0) {
         showNotification('Maksimum bahis miktarı girildiyse 0\'dan büyük olmalıdır.', 'warning');
         return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---

    setButtonLoading(button, true, 'Yayınlanıyor...');
    try {
        const oddData = {
            description: description,
            odds: odds,
            platform: platform,
            max_bet_amount: !isNaN(maxBet) ? maxBet : null, // Geçerliyse ekle, değilse null
            primary_link_text: document.getElementById('special-odd-primary-link-text').value.trim() || null,
            primary_link_url: document.getElementById('special-odd-primary-link-url').value.trim() || null,
            secondary_link_text: document.getElementById('special-odd-secondary-link-text').value.trim() || null,
            secondary_link_url: document.getElementById('special-odd-secondary-link-url').value.trim() || null,
            status: 'pending' // Yeni fırsat her zaman pending başlar
        };

        const { data, error } = await addSpecialOdd(oddData);
        if (error) {
            showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.specialOdds.unshift(data[0]); // Yeni fırsatı listenin başına ekle
            renderActiveSpecialOdds(); // Admin panelindeki aktif listeyi güncelle
            renderSpecialOddsPage(); // Fırsatlar sayfasını güncelle (eğer açıksa)
            form.reset(); // Formu temizle
            removeImage('admin'); // Yüklenen resmi kaldır
            showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
        } else {
             showNotification('Fırsat yayınlandı ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
         showNotification(`Beklenmedik fırsat yayınlama hatası: ${error.message}`, 'error');
         console.error("Publish special odd error:", error);
    } finally {
        setButtonLoading(button, false);
    }
}


async function handleResolveSpecialOdd(id, status) {
    if (!confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`)) {
        return;
    }

    // Butona loading state eklenebilir
    // const resolveButton = document.querySelector(`[data-action="resolve-special-odd"][data-id="${id}"][data-status="${status}"]`);
    // if(resolveButton) setButtonLoading(resolveButton, true);

    try {
        // API'ye sadece status gönderiyoruz, güncellenmiş kayıt geri dönecek.
        const { data, error } = await updateSpecialOdd(id, { status });
        if (error) {
            showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            // State'i güncelle
            const index = state.specialOdds.findIndex(o => o.id === parseInt(id)); // ID'yi integer'a çevir
            if (index > -1) {
                state.specialOdds[index] = data[0]; // Güncellenmiş veriyi al
            }
            // İlgili UI'ları güncelle
            renderActiveSpecialOdds(); // Admin panelindeki listeyi
            renderSpecialOddsPage(); // Fırsatlar sayfasını
            updateAllUI(); // Bahis geçmişi gibi diğer yerleri etkileyebilir
            showNotification('✅ Fırsat durumu başarıyla güncellendi!', 'success');
        } else {
             showNotification('Fırsat durumu güncellendi ancak veri alınamadı.', 'warning');
        }
    } catch (error) {
         showNotification(`Beklenmedik fırsat güncelleme hatası: ${error.message}`, 'error');
         console.error("Resolve special odd error:", error);
    } finally {
        // if(resolveButton) setButtonLoading(resolveButton, false);
    }
}

// EVENT LISTENER SETUP
export function setupEventListeners() {
    if (state.listenersAttached) return;

    console.log("setupEventListeners çağrılıyor.");

    // Tüm butonlara varsayılan metinlerini kaydet
    document.querySelectorAll('button').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement) {
            button.dataset.defaultText = textElement.textContent;
        }
    });

    // Auth Listeners
    DOM.get('loginBtn')?.addEventListener('click', handleLoginAttempt);
    DOM.get('signupBtn')?.addEventListener('click', handleSignUpAttempt);
    DOM.get('logoutBtn')?.addEventListener('click', () => signOut().catch(err => console.error("Logout error:", err))); // Logout'ta hata yakalama
    DOM.get('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('password-reset-modal');
    });
    DOM.get('cancelResetBtn')?.addEventListener('click', () => closeModal('password-reset-modal'));
    DOM.get('passwordResetForm')?.addEventListener('submit', handlePasswordResetAttempt);
    DOM.get('accountSettingsForm')?.addEventListener('submit', handleUpdatePasswordAttempt);

    // Sidebar and Navigation
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section, item));
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileSidebar);
    // Dashboard'daki "Tümünü Gör" butonu
    document.getElementById('show-history-btn')?.addEventListener('click', () => {
         const historyItem = document.querySelector('.sidebar-item[data-section="history"]');
         if(historyItem) showSection('history', historyItem);
    });


    // Form Submissions
    document.getElementById('bet-form')?.addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form')?.addEventListener('submit', handleQuickAddSubmitAttempt);
    document.getElementById('special-odd-form')?.addEventListener('submit', handlePublishSpecialOdd);

    // Event Delegation for dynamic content
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

        // Her action için null/geçersiz ID kontrolü ekleyelim
        switch (action) {
            case 'open-edit-modal':
                if (id !== null) openEditModal(id);
                break;
            case 'delete-bet':
                if (id !== null) handleDeleteBetAttempt(id);
                break;
            case 'remove-platform':
                if (id !== null && name) handleRemovePlatformAttempt(id, name);
                break;
            case 'changeBetPage':
                if (page !== null) changeBetPage(page);
                break;
            case 'changeCashPage':
                if (page !== null) changeCashPage(page);
                break;
            case 'show-image-modal':
                if (src) showImageModal(src);
                break;
            case 'set-dashboard-period':
                if (period !== undefined) {
                    const periodNum = parseInt(period, 10);
                    if (!isNaN(periodNum)) {
                        updateState({ dashboardPeriod: periodNum });
                        updatePerformanceSummary(); // Sadece ilgili bölümü güncelle
                    }
                }
                break;
            case 'set-history-period':
                if (period !== undefined) {
                    const newPeriod = period === 'all' ? 'all' : parseInt(period, 10);
                     if (!isNaN(newPeriod) || newPeriod === 'all') {
                        updateState({ filters: { ...state.filters, period: newPeriod }, currentPage: 1 });
                        document.querySelectorAll('#history-period-buttons .period-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.period === period);
                        });
                        renderHistory(); // Sadece geçmişi yeniden çiz
                    }
                }
                break;
            case 'resolve-special-odd':
                if (id !== null && status) handleResolveSpecialOdd(id, status);
                break;
            case 'open-play-special-odd-modal':
                if (id !== null) openPlaySpecialOddModal(id);
                break;
            case 'delete-sponsor':
                if (id !== null && name) {
                    import('./admin_actions.js').then(module => module.handleDeleteSponsor(id, name)).catch(err => console.error("Admin actions (sponsor) yüklenemedi:", err));
                }
                break;
            case 'delete-ad':
                if (id !== null) {
                    import('./admin_actions.js').then(module => module.handleDeleteAd(id)).catch(err => console.error("Admin actions (ad) yüklenemedi:", err));
                }
                break;
        }
    });

    // Special Odd Play Modal Buttons
    document.getElementById('special-odd-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') {
            closePlaySpecialOddModal();
        }
        if (e.target.id === 'confirm-play-special-odd') {
            handlePlaySpecialOdd(e.target);
        }
    });

    // History Filters
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        updateState({ filters: { ...state.filters, status: e.target.value }, currentPage: 1 });
        renderHistory();
    });
    document.getElementById('platform-filter')?.addEventListener('change', (e) => {
        updateState({ filters: { ...state.filters, platform: e.target.value }, currentPage: 1 });
        renderHistory();
    });
    document.getElementById('search-filter')?.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            updateState({ filters: { ...state.filters, searchTerm: e.target.value }, currentPage: 1 });
            renderHistory();
        }, 300); // Kullanıcı yazmayı bıraktıktan 300ms sonra ara
    });

    // Special Odds Page Filters
    document.getElementById('special-odds-status-filter')?.addEventListener('change', e => {
        state.specialOddsFilters.status = e.target.value; // Doğrudan state'i güncelle
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

    // Statistics Page Date Filter Reset
    document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        state.statsFilters.dateRange = { start: null, end: null };
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if (datePicker) datePicker.clear();
        updateStatisticsPage(); // İstatistikleri güncelle
        updateCharts(); // Grafikleri güncelle
    });

    // Other UI Interactions
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm());
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip);
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip);

    // Data Management Buttons
    document.getElementById('export-btn')?.addEventListener('click', handleExportData);
    document.getElementById('import-btn')?.addEventListener('click', () => openModal('import-modal'));
    document.getElementById('close-import-btn')?.addEventListener('click', () => closeModal('import-modal'));
    document.getElementById('import-data-btn')?.addEventListener('click', handleImportData);
    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt);
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt);


    // Modal Closures & Actions
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal); // Dashboard'daki buton
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal);
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager);
    document.getElementById('close-quick-add-btn')?.addEventListener('click', closeQuickAddModal);
    document.getElementById('close-edit-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-edit-btn')?.addEventListener('click', handleSaveEditAttempt);
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal); // Resme tıklayınca kapatma
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);

    // Image Upload Setup
    const setupImageUpload = (type) => {
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) return;

        selectBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', (e) => {
             if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0], type);
        });
        removeBtn.addEventListener('click', () => removeImage(type));

        // Drag & Drop Events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                 if (eventName === 'dragenter' || eventName === 'dragover') {
                    uploadArea.classList.add('dragover');
                } else {
                    uploadArea.classList.remove('dragover');
                }
                if (eventName === 'drop' && e.dataTransfer?.files?.length > 0) {
                    handleImageFile(e.dataTransfer.files[0], type);
                }
            }, false);
        });
    };
    setupImageUpload('main');
    setupImageUpload('quick');
    setupImageUpload('admin');

    // Paste Event for Image Upload
    document.addEventListener('paste', e => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            // Sadece resim dosyalarını bul
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return;

            // Hangi alana yapıştırıldığını belirle
            let targetType = null;
            const quickAddModal = document.getElementById('quick-add-modal');
            const adminPanelContainer = document.getElementById('admin-panels-container');

             if (state.currentSection === 'new-bet') {
                 targetType = 'main';
            } else if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                targetType = 'quick';
            } else if (state.currentSection === 'settings' && adminPanelContainer && !adminPanelContainer.classList.contains('hidden')) {
                 targetType = 'admin';
            }

            if (targetType) {
                handleImageFile(file, targetType);
            }

        } catch (pasteError) {
             console.error("Resim yapıştırma hatası:", pasteError);
        }
    });

    // Platform Management (Modal and Settings)
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false));
    document.getElementById('add-platform-modal-btn')?.addEventListener('click', () => handleAddPlatformAttempt(true));
    document.getElementById('close-platform-manager-btn')?.addEventListener('click', closePlatformManager);

    // Cash Management Modal Buttons
    document.getElementById('cash-transaction-close-btn')?.addEventListener('click', closeCashTransactionModal);
    document.getElementById('cash-deposit-btn')?.addEventListener('click', () => handleCashTransactionAttempt('deposit'));
    document.getElementById('cash-withdrawal-btn')?.addEventListener('click', () => handleCashTransactionAttempt('withdrawal'));

    // Admin-specific listeners (Sponsor/Ad forms) if user is admin
    // Bu, admin_actions.js içindeki setupAdminEventListeners'a taşındı
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
    console.log("Event listeners başarıyla kuruldu.");
}

}

