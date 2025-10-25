import { state, updateState } from './state.js';
import { DOM, DEFAULT_PLATFORMS, ADMIN_USER_ID } from './utils/constants.js';
import { showNotification, setButtonLoading, calculateProfitLoss } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSpecialOdd, updateSpecialOdd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { changeBetPage, changeCashPage, renderHistory } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderActiveSpecialOdds, renderSpecialOddsPage } from './components/ui_helpers.js';
// openResolveModal ve closeResolveModal import edildi
import { openModal, closeModal, openPlatformManager, closePlatformManager, openCashTransactionModal, closeCashTransactionModal, openQuickAddModal, closeQuickAddModal, openEditModal, closeEditModal, openResolveModal, closeResolveModal, openPlaySpecialOddModal, closePlaySpecialOddModal, showImageModal, closeImageModal, closeAdPopup, renderCustomPlatformsModal } from './components/modals.js';
import { updateStatisticsPage } from './components/statistics.js';
import { updatePerformanceSummary } from './components/dashboard.js';

let searchDebounceTimer;

// HANDLER FUNCTIONS (OLAY YÖNETİCİLERİ)

async function handleLoginAttempt() {
    const loginBtn = DOM.get('loginBtn');
    const authForm = DOM.get('authForm');
    if (!authForm) return;
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    const { error } = await signIn(authForm.email.value, authForm.password.value);
    if (error) {
        showNotification(`Giriş hatası: ${error.message}`, 'error');
    }
    // Başarılı girişte state değişimi zaten handleAuthStateChange'de ele alınır.
    setButtonLoading(loginBtn, false);
}

async function handleSignUpAttempt() {
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');
    if (!authForm) return;
    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    const email = authForm.email.value;
    const password = authForm.password.value;

    if (!password || password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
        setButtonLoading(signupBtn, false);
        return;
    }

    const { data, error } = await signUp(email, password);
    console.log("Supabase signUp sonucu:", { data, error });

    if (error) {
        showNotification(`Kayıt hatası: ${error.message}`, 'error');
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
    } else if (data.user) {
        authForm.classList.add('hidden');
        const userEmailConfirm = document.getElementById('user-email-confirm');
        if (userEmailConfirm) userEmailConfirm.textContent = email;
        const successMessage = document.getElementById('signup-success-message');
        if (successMessage) successMessage.classList.remove('hidden');
    } else {
        showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
    setButtonLoading(signupBtn, false);
}

async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    const sendResetBtn = DOM.get('sendResetBtn');
    const passwordResetForm = DOM.get('passwordResetForm');
    if (!passwordResetForm) return;
    setButtonLoading(sendResetBtn, true, 'Gönderiliyor...');
    const emailInput = passwordResetForm['reset-email'];
    const email = emailInput ? emailInput.value : '';

    if (!email) {
        showNotification('Lütfen e-posta adresinizi girin.', 'warning');
        setButtonLoading(sendResetBtn, false);
        return;
    }

    const { error } = await resetPasswordForEmail(email);
    if (error) {
        showNotification(`Hata: ${error.message}`, 'error');
    } else {
        showNotification('Şifre sıfırlama linki e-postana gönderildi.', 'success');
        closeModal('password-reset-modal');
    }
    setButtonLoading(sendResetBtn, false);
}

async function handleUpdatePasswordAttempt(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
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
        const form = DOM.get('accountSettingsForm');
        if (form) form.reset();
    }
    setButtonLoading(updateButton, false);
}

async function handleBetFormSubmitAttempt(e) {
    e.preventDefault();
    const addButton = document.getElementById('add-bet-btn');
    const platformSelect = document.getElementById('platform');
    const betAmountInput = document.getElementById('bet-amount');
    const oddsInput = document.getElementById('odds');
    const dateInput = document.getElementById('bet-date');

    const platform = platformSelect ? platformSelect.value : '';
    const betAmount = betAmountInput ? parseFloat(betAmountInput.value) : NaN;
    const odds = oddsInput ? parseFloat(oddsInput.value) : NaN;
    const date = dateInput ? dateInput.value : '';

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

    setButtonLoading(addButton, true, 'Ekleniyor...');

    const newBetData = {
        user_id: state.currentUser.id,
        platform: platform,
        bet_type: document.getElementById('bet-type')?.value || 'Spor Bahis',
        description: document.getElementById('description')?.value || 'Açıklama yok',
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
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]);
        updateAllUI();
        resetForm();
        showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
    } else {
         showNotification('Bahis eklendi ancak veri alınamadı.', 'warning');
    }
    setButtonLoading(addButton, false);
}

async function handlePlaySpecialOdd(button) {
    const amountInput = document.getElementById('special-odd-bet-amount');
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
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
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]);
        // Arka planda play_count'u güncelle
        updateSpecialOdd(odd.id, { play_count: (odd.play_count || 0) + 1 })
            .then(({ data: updatedOddData, error: updateError }) => {
                if (!updateError && updatedOddData && updatedOddData.length > 0) {
                    const index = state.specialOdds.findIndex(o => o.id === odd.id);
                    if (index > -1) state.specialOdds[index] = updatedOddData[0];
                    renderSpecialOddsPage();
                } else if(updateError) {
                     console.error("Özel oran oynanma sayısı güncellenirken hata:", updateError);
                }
            });
        updateAllUI();
        closePlaySpecialOddModal();
        showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
    } else {
        showNotification('Fırsat eklendi ancak veri alınamadı.', 'warning');
        setButtonLoading(button, false);
    }
}

async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const platformSelect = document.getElementById('quick-platform');
    const amountInput = document.getElementById('quick-amount');
    const oddsInput = document.getElementById('quick-odds');

    const platform = platformSelect ? platformSelect.value : '';
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
    const odds = oddsInput ? parseFloat(oddsInput.value) : NaN;

    if (platform === 'all' || platform === '') {
        showNotification('Lütfen bir platform seçin.', 'warning');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin (0\'dan büyük).', 'warning');
        return;
    }
    if (isNaN(odds) || odds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }

    const newBetData = {
        user_id: state.currentUser.id,
        platform: platform,
        bet_type: 'Spor Bahis',
        description: 'Hızlı bahis',
        bet_amount: amount,
        odds: odds,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        win_amount: 0,
        profit_loss: 0
    };

    const submitButton = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Ekleniyor...');

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
    setButtonLoading(submitButton, false);
}

// YENİ: Bahis Sonuçlandırma İşleyicisi (resolve-modal için)
async function handleSaveResolveAttempt() {
    const bet = state.currentlyEditingBet;
    if (!bet || bet.status !== 'pending') {
         showNotification('Sadece bekleyen bahisler sonuçlandırılabilir.', 'warning');
        return; // Sadece bekleyen bahisler
    }

    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    const saveButton = document.getElementById('save-resolve-btn');

    const status = statusSelect ? statusSelect.value : '';
    const winAmount = (status === 'won' && winAmountInput) ? parseFloat(winAmountInput.value) : 0;

    // Hata kontrolü: Sonuç seçilmeli
    if (!status) {
         showNotification('Lütfen bir sonuç seçin (Kazandı, Kaybetti, İade).', 'warning');
         return;
    }
     // Hata kontrolü: Durum 'won' ise kazanç miktarı girilmeli
    if (status === 'won' && (isNaN(winAmount) || winAmount <= 0)) {
         showNotification('Kazanan bahisler için geçerli bir Toplam Kazanç miktarı girmelisiniz (0\'dan büyük).', 'warning');
         return;
    }

    let updateData = { status: status };

    if (status === 'won') {
        updateData.win_amount = winAmount;
        // profit_loss hesaplaması
        const profit = bet.special_odd_id
            ? (bet.bet_amount * bet.odds) - bet.bet_amount
            : winAmount - bet.bet_amount;
        updateData.profit_loss = profit;
    } else if (status === 'lost') {
        updateData.win_amount = 0;
        updateData.profit_loss = -bet.bet_amount;
    } else if (status === 'refunded') {
        updateData.win_amount = 0;
        updateData.profit_loss = 0;
    }

    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis sonuçlandırılamadı: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
            state.bets[index] = data[0]; // Güncellenmiş bahsi state'e yansıt
        }
        updateAllUI();
        closeResolveModal(); // Yeni modalı kapat
        showNotification('✔️ Bahis sonuçlandırıldı!', 'success');
    } else {
         showNotification('Bahis sonuçlandırıldı ancak veri alınamadı.', 'warning');
    }
     setButtonLoading(saveButton, false);
}


// Bahis Düzenleme/Etiketleme İşleyicisi (edit-modal için)
async function handleSaveEditAttempt() {
    const bet = state.currentlyEditingBet;
    if (!bet) return; // Düzenlenecek bahis yoksa çık

    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const saveButton = document.getElementById('save-edit-btn');

    // Sadece etiketi al (her durumda güncellenecek)
    const tag = tagInput ? tagInput.value.trim() : bet.tag;

    let updateData = { tag: tag || null }; // Etiketi her zaman al, boşsa null yap

    // Eğer bahis sonuçlanmışsa veya modal'da sonuç bölümü görünürse, sonucu da al
    const resultSection = document.getElementById('edit-result-section');
    if (resultSection && resultSection.style.display !== 'none') {
        const status = statusSelect ? statusSelect.value : bet.status; // Yeni veya mevcut durumu al
        const winAmount = (status === 'won' && winAmountInput) ? parseFloat(winAmountInput.value) : 0;

        // Hata kontrolü: Durum 'won' ise kazanç miktarı girilmeli (sonuçlanmış bahis düzenleniyorsa)
        if (status === 'won' && (isNaN(winAmount) || winAmount <= 0)) {
            showNotification('Kazanan bahisleri düzenlerken geçerli bir Toplam Kazanç miktarı girmelisiniz (0\'dan büyük).', 'warning');
            return;
        }

        updateData.status = status; // Durumu güncelleme objesine ekle

        // Kar/Zarar ve Kazanç Miktarını hesapla/ayarla
        if (status === 'won') {
            updateData.win_amount = winAmount;
            const profit = bet.special_odd_id
                ? (bet.bet_amount * bet.odds) - bet.bet_amount
                : winAmount - bet.bet_amount;
            updateData.profit_loss = profit;
        } else if (status === 'lost') {
            updateData.win_amount = 0;
            updateData.profit_loss = -bet.bet_amount;
        } else if (status === 'refunded') {
            updateData.win_amount = 0;
            updateData.profit_loss = 0;
        } else { // pending (bekleyene geri döndürme durumu)
            updateData.win_amount = 0;
            updateData.profit_loss = 0;
        }
    } else if (bet.status === 'pending') {
        // Eğer bahis bekliyorsa ve sadece etiketleniyorsa (sonuç bölümü gizli),
        // mevcut durumunu (pending) ve sıfır win/profit değerlerini koru.
        // updateData objesine status, win_amount, profit_loss ekleme.
        // Sadece 'tag' güncellenecek.
    }

    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
             // State'i güncelle: Mevcut bahsin üzerine yeni verileri ekle
            state.bets[index] = { ...state.bets[index], ...data[0] };
        }
        updateAllUI();
        closeEditModal();
        showNotification('✔️ Bahis güncellendi!', 'info');
    } else {
         showNotification('Bahis güncellendi ancak veri alınamadı.', 'warning');
    }
     setButtonLoading(saveButton, false);
}


async function handleDeleteBetAttempt(betId) {
    const confirmation = confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmation) return;

    const { error } = await deleteBet(betId);
    if (error) {
        showNotification('Kayıt silinemedi: ' + error.message, 'error');
    } else {
        updateState({ bets: state.bets.filter(b => b.id !== betId) });
        updateAllUI();
        showNotification('🗑️ Kayıt silindi.', 'error');
    }
}

async function handleCashTransactionAttempt(type) {
    const amountInput = document.getElementById('cash-amount');
    const descriptionInput = document.getElementById('cash-description');
    const depositBtn = document.getElementById('cash-deposit-btn');
    const withdrawalBtn = document.getElementById('cash-withdrawal-btn');

    let amount = amountInput ? parseFloat(amountInput.value) : NaN;
    let description = descriptionInput ? descriptionInput.value.trim() : '';

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin (0\'dan büyük).', 'error');
        return;
    }

    const isDeposit = type === 'deposit';
    const profitLoss = isDeposit ? amount : -amount;
    if (!description) {
        description = isDeposit ? 'Para Ekleme' : 'Para Çekme';
    }

    const cashTransaction = {
        user_id: state.currentUser.id,
        platform: 'Kasa İşlemi',
        bet_type: 'Kasa İşlemi',
        description: description,
        bet_amount: Math.abs(amount),
        odds: 1,
        date: new Date().toISOString().split('T')[0],
        status: isDeposit ? 'won' : 'lost',
        win_amount: isDeposit ? amount : 0,
        profit_loss: profitLoss,
    };

    const currentBtn = isDeposit ? depositBtn : withdrawalBtn;
    setButtonLoading(currentBtn, true, 'Kaydediliyor...');

    const { data, error } = await addBet(cashTransaction);
    if (error) {
        showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]);
        updateAllUI();
        closeCashTransactionModal();
        showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
    } else {
        showNotification('Kasa işlemi eklendi ancak veri alınamadı.', 'warning');
    }
    setButtonLoading(depositBtn, false); // Her iki butonu da normale döndür
    setButtonLoading(withdrawalBtn, false);
}

async function handleAddPlatformAttempt(fromModal = false) {
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const input = document.getElementById(inputId);
    const name = input ? input.value.trim() : '';

    if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
        return;
    }

    const allPlatformsLower = [
        ...DEFAULT_PLATFORMS.map(p => p.toLowerCase()),
        ...state.customPlatforms.map(p => p.name.toLowerCase())
    ];

    if (allPlatformsLower.includes(name.toLowerCase())) {
        showNotification('Bu platform zaten mevcut.', 'warning');
        return;
    }

    const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
    if (error) {
        showNotification('Platform eklenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.customPlatforms.push(data[0]);
        if (input) input.value = '';
        if (fromModal) renderCustomPlatformsModal();
        else renderCustomPlatforms();
        populatePlatformOptions();
        showNotification(`✅ "${name}" platformu eklendi!`, 'success');
    } else {
         showNotification('Platform eklendi ancak veri alınamadı.', 'warning');
    }
}

async function handleRemovePlatformAttempt(platformId, platformName) {
    const confirmation = confirm(`"${platformName}" platformunu silmek istediğinizden emin misiniz? Bu platformla ilişkili bahisler silinmeyecektir.`);
    if (!confirmation) return;

    const { error } = await deletePlatform(platformId);
    if (error) {
        showNotification('Platform silinemedi: ' + error.message, 'error');
    } else {
        updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
        renderCustomPlatforms();
        renderCustomPlatformsModal();
        populatePlatformOptions();
        showNotification(`🗑️ "${platformName}" platformu silindi`, 'error');
    }
}

async function handleClearAllDataAttempt() {
    const confirmation = confirm('DİKKAT! TÜM KİŞİSEL VERİLERİNİZİ (BAHİS KAYITLARI, ÖZEL PLATFORMLAR) KALICI OLARAK SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!');
    if (!confirmation) return;

    const clearBtn1 = document.getElementById('clear-all-btn');
    const clearBtn2 = document.getElementById('clear-all-settings-btn');
    if (clearBtn1) setButtonLoading(clearBtn1, true, 'Siliniyor...');
    if (clearBtn2) setButtonLoading(clearBtn2, true, 'Siliniyor...');

    const [betsRes, platformsRes] = await Promise.all([
        clearAllBetsForUser(state.currentUser.id),
        clearAllPlatformsForUser(state.currentUser.id)
    ]);

    if (betsRes.error || platformsRes.error) {
        console.error("Veri silme hatası:", betsRes.error || platformsRes.error);
        showNotification('Veriler silinirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } else {
        updateState({ bets: [], customPlatforms: [] });
        updateAllUI();
        populatePlatformOptions();
        renderCustomPlatforms();
        renderCustomPlatformsModal();
        showNotification('🗑️ Tüm kişisel verileriniz başarıyla silindi!', 'error');
    }
    if (clearBtn1) setButtonLoading(clearBtn1, false);
    if (clearBtn2) setButtonLoading(clearBtn2, false);
}

async function handleUserAnalyzeBetSlip() {
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Kasamatik AI Okuyor...');

    try {
        const base64Data = state.currentImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);
        if (result) {
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                const descriptionInput = document.getElementById('description');
                 if(descriptionInput) descriptionInput.value = descriptionText;
            }
            const betAmountInput = document.getElementById('bet-amount');
            if (result.betAmount && betAmountInput) betAmountInput.value = result.betAmount;
            const oddsInput = document.getElementById('odds');
            if (result.odds && oddsInput) oddsInput.value = result.odds;
            showNotification('✨ Kupon bilgileri başarıyla okundu!', 'success');
        } else {
            throw new Error("API'den geçerli bir sonuç alınamadı veya sonuç boş.");
        }
    } catch (error) {
        console.error('Kupon okuma (Gemini API) Hatası:', error);
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
    setButtonLoading(geminiButton, true, 'Kasamatik AI Okuyor...');

    try {
        const base64Data = state.adminImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);
        if (result) {
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                const descriptionInput = document.getElementById('special-odd-description');
                 if(descriptionInput) descriptionInput.value = descriptionText;
            }
             const oddsInput = document.getElementById('special-odd-odds');
            if (result.odds && oddsInput) oddsInput.value = result.odds;
            showNotification('✨ Fırsat bilgileri başarıyla okundu!', 'success');
        } else {
            throw new Error("API'den geçerli bir sonuç alınamadı.");
        }
    } catch (error) {
        console.error('Admin kupon okuma (Gemini API) Hatası:', error);
        showNotification(`Kupon okunurken bir hata oluştu: ${error.message}`, 'error');
    } finally {
        setButtonLoading(geminiButton, false);
    }
}

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
            const fileName = `pasted-image-${Date.now()}.png`;
            const file = new File([imageBlob], fileName, { type: imageBlob.type });
            handleImageFile(file, type);
            showNotification('✅ Resim panodan başarıyla yapıştırıldı!', 'success');
        } else {
            showNotification('Panoda yapıştırılacak bir resim bulunamadı.', 'warning');
        }
    } catch (err) {
        console.error('Panodan yapıştırma hatası:', err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message.includes('permission')) {
             showNotification('Panodan okuma izni gerekli. Tarayıcı ayarlarınızı kontrol edin.', 'error');
        } else if (err.name === 'NotFoundError') {
             showNotification('Panoda okunacak veri bulunamadı.', 'warning');
        } else {
             showNotification('Panodan okuma sırasında bir hata oluştu.', 'error');
        }
    }
}

async function handlePublishSpecialOdd(e) {
    e.preventDefault();
    const form = document.getElementById('special-odd-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');

    const descriptionInput = document.getElementById('special-odd-description');
    const oddsInput = document.getElementById('special-odd-odds');
    const platformInput = document.getElementById('special-odd-platform');
    const maxBetInput = document.getElementById('special-odd-max-bet');

    const description = descriptionInput ? descriptionInput.value : '';
    const odds = oddsInput ? parseFloat(oddsInput.value) : NaN;
    const platform = platformInput ? platformInput.value.trim() : '';
    const maxBetAmount = maxBetInput ? parseFloat(maxBetInput.value) : null;

    if (!description || !platform) {
        showNotification('Lütfen Açıklama ve Platform alanlarını doldurun.', 'warning');
        return;
    }
    if (isNaN(odds) || odds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }
     if (maxBetAmount !== null && (isNaN(maxBetAmount) || maxBetAmount < 0)) {
         showNotification('Maksimum Bahis geçerli bir sayı olmalı veya boş bırakılmalıdır.', 'warning');
         return;
    }

    setButtonLoading(button, true, 'Yayınlanıyor...');

    const oddData = {
        description: description,
        odds: odds,
        platform: platform,
        max_bet_amount: maxBetAmount,
        primary_link_text: document.getElementById('special-odd-primary-link-text')?.value || null,
        primary_link_url: document.getElementById('special-odd-primary-link-url')?.value || null,
        secondary_link_text: document.getElementById('special-odd-secondary-link-text')?.value || null,
        secondary_link_url: document.getElementById('special-odd-secondary-link-url')?.value || null,
        status: 'pending'
    };

    const { data, error } = await addSpecialOdd(oddData);
    if (error) {
        showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
    } else if (data && data.length > 0){
        state.specialOdds.unshift(data[0]);
        renderActiveSpecialOdds();
        renderSpecialOddsPage();
        form.reset();
        removeImage('admin');
        showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
    } else {
         showNotification('Fırsat yayınlandı ancak veri alınamadı.', 'warning');
    }
    setButtonLoading(button, false);
}


async function handleResolveSpecialOdd(id, status) {
    const confirmation = confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`);
    if (!confirmation) return;

    const button = document.querySelector(`button[data-action="resolve-special-odd"][data-id="${id}"][data-status="${status}"]`);
    if (button) setButtonLoading(button, true);

    const { data, error } = await updateSpecialOdd(id, { status: status });
    if(error) {
        showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        const index = state.specialOdds.findIndex(o => o.id === parseInt(id));
        if(index > -1) {
            state.specialOdds[index] = data[0];
        }
        renderActiveSpecialOdds();
        renderSpecialOddsPage();
        updateAllUI();
        showNotification(`Fırsat durumu "${status.toUpperCase()}" olarak güncellendi!`, 'info');
    } else {
        showNotification('Fırsat güncellendi ancak veri alınamadı.', 'warning');
    }
    document.querySelectorAll(`button[data-action="resolve-special-odd"][data-id="${id}"]`).forEach(btn => {
         setButtonLoading(btn, false);
    });
}

// EVENT LISTENER SETUP
export function setupEventListeners() {
    // BUG FIX: Olay dinleyicilerini tekrar tekrar eklemeyi önle
    if (state.listenersAttached) {
        console.log("Event listeners zaten bağlı.");
        return;
    }
    console.log("setupEventListeners çağrılıyor - İlk kez.");

    // Tüm butonlara varsayılan metni data attribute olarak ekle (sadece bir kez)
    document.querySelectorAll('button').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement && !button.dataset.defaultText) {
            button.dataset.defaultText = textElement.textContent;
        }
    });

    // Auth
    DOM.get('loginBtn')?.addEventListener('click', handleLoginAttempt);
    DOM.get('signupBtn')?.addEventListener('click', handleSignUpAttempt);
    DOM.get('logoutBtn')?.addEventListener('click', () => signOut().catch(err => console.error("Çıkış hatası:", err)));

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
        item.addEventListener('click', () => {
             const sectionName = item.dataset.section;
             if (sectionName) {
                 showSection(sectionName, item);
             }
        });
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileSidebar);

    // Form Submissions
    document.getElementById('bet-form')?.addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form')?.addEventListener('submit', handleQuickAddSubmitAttempt);
    document.getElementById('special-odd-form')?.addEventListener('submit', handlePublishSpecialOdd);

    // Ana olay dinleyicisi (Event Delegation - Sadece bir kez body'e eklenir)
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
        const section = target.dataset.section;

        // console.log("data-action tıklandı:", { action, id, name, page, src, period, status, section });

        switch (action) {
            // YENİ: Resolve Modal Açma
            case 'open-resolve-modal':
                if (id !== null) openResolveModal(id);
                break;
            case 'open-edit-modal':
                if (id !== null) openEditModal(id);
                break;
            case 'delete-bet':
                if (id !== null) handleDeleteBetAttempt(id);
                break;
            case 'remove-platform':
                if (id !== null && name !== undefined) handleRemovePlatformAttempt(id, name);
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
                         updatePerformanceSummary();
                         // Aktif butonu güncelle
                         document.querySelectorAll('#performance-period-buttons .period-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.period === period);
                         });
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
            case 'resolve-special-odd': // Admin panelindeki butonlar
                if (id !== null && status) handleResolveSpecialOdd(id, status);
                break;
            case 'open-play-special-odd-modal':
                if (id !== null) openPlaySpecialOddModal(id);
                break;
            case 'delete-sponsor':
                if (id !== null && name !== undefined) {
                    import('./admin_actions.js').then(module => module.handleDeleteSponsor(id, name)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
            case 'delete-ad':
                if (id !== null) {
                    import('./admin_actions.js').then(module => module.handleDeleteAd(id)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
             case 'navigate-section':
                 if (section) {
                    const targetSidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
                    if (targetSidebarItem) {
                        showSection(section, targetSidebarItem);
                    }
                 }
                 break;
        }
    });

    // Modal İçi Olay Dinleyicileri (Modalların kendilerine eklenir)

    // Fırsatı Oyna Modalı
    document.getElementById('special-odd-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') closePlaySpecialOddModal();
        if (e.target.closest('#confirm-play-special-odd')) handlePlaySpecialOdd(document.getElementById('confirm-play-special-odd'));
    });

    // Düzenleme/Etiketleme Modalı
    document.getElementById('edit-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-edit-btn') closeEditModal();
        if (e.target.closest('#save-edit-btn')) handleSaveEditAttempt();
    });

    // YENİ: Sonuçlandırma Modalı
    document.getElementById('resolve-modal')?.addEventListener('click', (e) => {
         if (e.target.id === 'close-resolve-btn') closeResolveModal();
         if (e.target.closest('#save-resolve-btn')) handleSaveResolveAttempt();
    });

    // Kasa İşlemi Modalı
    document.getElementById('cash-transaction-modal')?.addEventListener('click', (e) => {
         if (e.target.id === 'cash-transaction-close-btn') closeCashTransactionModal();
         else if (e.target.closest('#cash-deposit-btn')) handleCashTransactionAttempt('deposit');
         else if (e.target.closest('#cash-withdrawal-btn')) handleCashTransactionAttempt('withdrawal');
    });

    // Platform Yöneticisi Modalı
    document.getElementById('platform-manager-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-platform-manager-btn') closePlatformManager();
        if (e.target.closest('#add-platform-modal-btn')) handleAddPlatformAttempt(true);
        // Silme işlemi event delegation ile body listener'da ele alınıyor (remove-platform)
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

    // İstatistikler Sayfası Filtre Sıfırlama
     document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        updateState({ statsFilters: { dateRange: { start: null, end: null } } });
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if(datePicker) datePicker.clear();
        updateStatisticsPage();
        updateCharts();
    });

    // Diğer Butonlar
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm());
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip);
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip);
    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt); // History sayfasındaki
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt); // Ayarlar sayfasındaki
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal); // Dashboard hızlı işlem
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal); // Dashboard hızlı işlem
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager); // Yeni Kayıt sayfasındaki
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal);
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false)); // Ayarlar sayfasındaki


    // Image Upload Setup (Setup Fonksiyonu)
    const setupImageUpload = (type) => {
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);
        const pasteBtn = document.getElementById(`${prefix}paste-image-btn`);

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) return;

        selectBtn.addEventListener('click', () => imageInput.click());
        if (pasteBtn) pasteBtn.addEventListener('click', () => handlePasteFromClipboard(type));
        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                 handleImageFile(e.target.files[0], type);
            }
        });
        removeBtn.addEventListener('click', () => removeImage(type));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                uploadArea.classList.toggle('dragover', eventName === 'dragenter' || eventName === 'dragover');
                if (eventName === 'drop' && e.dataTransfer?.files?.length > 0) {
                     handleImageFile(e.dataTransfer.files[0], type);
                }
            }, false);
        });
    };
    setupImageUpload('main');
    setupImageUpload('quick');
    setupImageUpload('admin');

    // Genel Yapıştırma Olayı (document seviyesinde)
    document.addEventListener('paste', e => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return;

            let activeType = null;
            const quickAddModal = document.getElementById('quick-add-modal');
            const specialOddForm = document.getElementById('special-odd-form');

            if (state.currentSection === 'new-bet') activeType = 'main';
            else if (quickAddModal && !quickAddModal.classList.contains('hidden')) activeType = 'quick';
            else if (state.currentSection === 'settings' && specialOddForm && state.currentUser?.id === ADMIN_USER_ID) activeType = 'admin';

            if (activeType) {
                handleImageFile(file, activeType);
                 showNotification('📋 Resim panodan yapıştırıldı!', 'success');
                 e.preventDefault();
            }
        } catch (pasteError) {
             console.error("Genel yapıştırma hatası:", pasteError);
             showNotification('Resim yapıştırılırken bir hata oluştu.', 'error');
        }
    });

    // Dinamik admin eylemleri için modül yükleme (sadece bir kez)
    if (state.currentUser?.id === ADMIN_USER_ID) {
        import('./admin_actions.js')
            .then(module => {
                if (module && typeof module.setupAdminEventListeners === 'function') {
                    module.setupAdminEventListeners(); // Admin form submit listener'larını ekler
                } else {
                     console.error("Admin actions modülünde 'setupAdminEventListeners' fonksiyonu bulunamadı.");
                }
            })
            .catch(err => console.error("Admin actions modülü yüklenemedi:", err));
    }

    updateState({ listenersAttached: true }); // Listener'ların bağlandığını işaretle
    console.log("Event listeners başarıyla bağlandı.");
}


