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
    // Butonun varlığını kontrol et
    if (!loginBtn || !authForm) {
        console.error("Giriş butonu veya formu bulunamadı.");
        return;
    }
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    try {
        const { error } = await signIn(authForm.email.value, authForm.password.value);
        if (error) {
            showNotification(`Giriş hatası: ${error.message}`, 'error');
        }
        // Başarılı girişten sonra auth state değişikliği tetiklenir ve UI güncellenir.
    } catch (error) {
        showNotification(`Beklenmedik bir giriş hatası oluştu: ${error.message}`, 'error');
        console.error("Login attempt error:", error);
    } finally {
        // Hata olsa bile butonu normale döndür
        setButtonLoading(loginBtn, false);
    }
}

async function handleSignUpAttempt() {
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');
     // Butonun varlığını kontrol et
    if (!signupBtn || !authForm) {
        console.error("Kayıt ol butonu veya formu bulunamadı.");
        return;
    }
    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    const email = authForm.email.value;

    try {
        const { data, error } = await signUp(email, authForm.password.value);
        console.log("Supabase signUp sonucu:", { data, error });

        if (error) {
            showNotification(`Kayıt hatası: ${error.message}`, 'error');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            // E-posta zaten kayıtlı ama onaylanmamış
            showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
        } else if (data.user) {
            // Başarılı yeni kayıt
            authForm.classList.add('hidden');
            const confirmEmailEl = document.getElementById('user-email-confirm');
            const successMessageEl = document.getElementById('signup-success-message');
            if(confirmEmailEl) confirmEmailEl.textContent = email;
            if(successMessageEl) successMessageEl.classList.remove('hidden');
        } else {
            // Beklenmeyen durum
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
    if (!sendResetBtn || !passwordResetForm) return;

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
    const newPasswordEl = document.getElementById('new-password');
    const confirmPasswordEl = document.getElementById('confirm-password');
    const updateButton = document.getElementById('update-password-btn');
    const accountForm = DOM.get('accountSettingsForm'); // Formu al

    if (!newPasswordEl || !confirmPasswordEl || !updateButton || !accountForm) return;

    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;


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
            accountForm.reset(); // Formu sıfırla
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
    if(!addButton) return;

    // --- YENİ EKLENEN DOĞRULAMA KONTROLLERİ ---
    const platformSelect = document.getElementById('platform');
    const betAmountInput = document.getElementById('bet-amount');
    const oddsInput = document.getElementById('odds');
    const dateInput = document.getElementById('bet-date');

    // Elementlerin varlığını kontrol et
    if (!platformSelect || !betAmountInput || !oddsInput || !dateInput) {
        showNotification('Form elemanları yüklenemedi, lütfen sayfayı yenileyin.', 'error');
        return;
    }

    const platform = platformSelect.value;
    const betAmount = parseFloat(betAmountInput.value);
    const odds = parseFloat(oddsInput.value);
    const date = dateInput.value;

    if (!platform || platform === "all") { // 'all' değeri de geçersiz kabul edilir
        showNotification('Lütfen bir platform seçin.', 'warning');
        platformSelect.focus(); // Kullanıcıya hangi alanın eksik olduğunu göster
        return;
    }
    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı (0\'dan büyük) girin.', 'warning');
        betAmountInput.focus();
        return;
    }
    // Oran kontrolü 1.01 ve üzeri olmalı
    if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        oddsInput.focus();
        return;
    }
    if (!date) {
        showNotification('Lütfen bir tarih seçin.', 'warning');
        dateInput.focus();
        return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---


    setButtonLoading(addButton, true, 'Ekleniyor...');
    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: platform, // Doğrulanmış değeri kullan
            bet_type: document.getElementById('bet-type').value, // Bu alanın varlığını varsayıyoruz
            description: document.getElementById('description').value || 'Açıklama yok', // Bu alanın varlığını varsayıyoruz
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
        } else if (data && data.length > 0) {
            state.bets.unshift(data[0]);
            updateAllUI();
            resetForm(); // Formu temizle
            showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
        } else {
             showNotification('Bahis eklendi ancak sunucudan yanıt alınamadı.', 'warning');
             console.warn("addBet success but no data returned:", data);
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
    if(!amountInput || !button) return;

    const amount = parseFloat(amountInput.value);
    const odd = state.playingSpecialOdd;

    if (!odd) {
        showNotification('Oynanacak fırsat bulunamadı.', 'error');
        closePlaySpecialOddModal(); // Modalı kapat
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar (0\'dan büyük) girin.', 'warning');
        amountInput.focus();
        return;
    }
    if (odd.max_bet_amount && amount > odd.max_bet_amount) {
        showNotification(`Maksimum bahis limitini (${odd.max_bet_amount} ₺) aştınız.`, 'error');
        amountInput.focus();
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
            status: 'pending', // Özel oranlar her zaman 'pending' başlar
            win_amount: 0,
            profit_loss: 0,
            special_odd_id: odd.id // İlişkili özel oran ID'si
        };

        const { data: addedBetData, error: addBetError } = await addBet(newBetData);

        if (addBetError) {
            throw new Error('Bahis eklenemedi: ' + addBetError.message);
        }
        if (!addedBetData || addedBetData.length === 0) {
            throw new Error('Bahis eklendi ancak sunucudan yanıt alınamadı.');
        }

        // Bahis başarıyla eklendi, state'i güncelle
        state.bets.unshift(addedBetData[0]);

        // Özel oranın oynanma sayısını artır (hata olursa sadece logla, işlemi durdurma)
        const { data: updatedOdd, error: updateError } = await updateSpecialOdd(odd.id, { play_count: (odd.play_count || 0) + 1 });
        if(updateError) {
            console.warn(`Oynanma sayısı güncellenemedi (ID: ${odd.id}): ${updateError.message}`);
        } else if (updatedOdd && updatedOdd.length > 0) {
            // State'deki özel oranı da güncelle
            const index = state.specialOdds.findIndex(o => o.id === odd.id);
            if(index > -1) state.specialOdds[index] = updatedOdd[0];
        }

        // UI Güncelle ve Bildirim
        updateAllUI(); // Genel UI güncellemesi
        renderSpecialOddsPage(); // Fırsatlar sayfasını özellikle güncelle
        closePlaySpecialOddModal(); // Modalı kapat
        showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');

    } catch (error) {
        showNotification(`Fırsat oynanırken hata oluştu: ${error.message}`, 'error');
        console.error("Play special odd error:", error);
    } finally {
        setButtonLoading(button, false); // Buton state'ini her zaman sıfırla
    }
}


async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const quickAddButton = e.target.querySelector('button[type="submit"]');
    if(!quickAddButton) return;

    // --- DOĞRULAMA KONTROLLERİ (Hızlı Ekleme için) ---
    const platformSelect = document.getElementById('quick-platform');
    const betAmountInput = document.getElementById('quick-amount');
    const oddsInput = document.getElementById('quick-odds');

    if (!platformSelect || !betAmountInput || !oddsInput) {
         showNotification('Hızlı ekleme formu elemanları bulunamadı.', 'error');
         return;
    }

    const platform = platformSelect.value;
    const betAmount = parseFloat(betAmountInput.value);
    const odds = parseFloat(oddsInput.value);

    if (!platform || platform === "all") {
        showNotification('Lütfen bir platform seçin.', 'warning');
        platformSelect.focus();
        return;
    }
    if (isNaN(betAmount) || betAmount <= 0) {
        showNotification('Lütfen geçerli bir bahis miktarı (0\'dan büyük) girin.', 'warning');
        betAmountInput.focus();
        return;
    }
    if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        oddsInput.focus();
        return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---

    setButtonLoading(quickAddButton, true, 'Ekleniyor...');
    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: platform,
            bet_type: 'Spor Bahis', // Hızlı ekleme için varsayılan
            description: 'Hızlı bahis', // Hızlı ekleme için varsayılan
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
            closeQuickAddModal(); // Başarılı eklemeden sonra modalı kapat
            showNotification('🚀 Hızlı bahis eklendi!', 'success');
        } else {
            showNotification('Hızlı bahis eklendi ancak sunucudan yanıt alınamadı.', 'warning');
            console.warn("quickAdd success but no data returned:", data);
        }
    } catch (error) {
        showNotification(`Beklenmedik hızlı bahis ekleme hatası: ${error.message}`, 'error');
        console.error("Quick add error:", error);
    } finally {
        setButtonLoading(quickAddButton, false);
    }
}


async function handleSaveEditAttempt() {
    const saveButton = document.getElementById('save-edit-btn');
    const bet = state.currentlyEditingBet;
    if (!bet || !saveButton) return;

    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    if(!statusSelect || !winAmountInput) return;

    const status = statusSelect.value;
    const winAmount = parseFloat(winAmountInput.value) || 0; // || 0 ile NaN durumunu kontrol et

    // Kazandı durumu için ek doğrulama
    if (status === 'won' && winAmount < 0) { // Sadece 0'dan küçük olamaz kontrolü
        showNotification('Kazanan bahisler için geçerli bir kazanç miktarı girin (0 veya üzeri).', 'warning');
        winAmountInput.focus();
        return;
    }

    setButtonLoading(saveButton, true, 'Kaydediliyor...');
    try {
        let updateData = {
            status: status,
             win_amount: 0, // Varsayılan değerler
             profit_loss: 0
        };

        if (status === 'won') {
            updateData.win_amount = winAmount;
            updateData.profit_loss = winAmount - bet.bet_amount;
        } else if (status === 'lost') {
            // win_amount ve profit_loss zaten 0/-bet_amount olmalı
             updateData.profit_loss = -bet.bet_amount;
        }
        // 'pending' veya 'refunded' durumlarında win_amount ve profit_loss 0 kalır.

        const { data, error } = await updateBet(state.editingBetId, updateData);
        if (error) {
            showNotification('Bahis güncellenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            const index = state.bets.findIndex(b => b.id === state.editingBetId);
            if (index !== -1) {
                // Güncellenmiş veriyi state'e yansıt
                state.bets[index] = data[0];
            }
            updateAllUI(); // State değiştiği için UI'ı güncelle
            closeEditModal(); // Modalı kapat
            showNotification('✔️ Bahis başarıyla güncellendi!', 'success'); // Başarı bildirimi
        } else {
             showNotification('Bahis güncellendi ancak sunucudan yanıt alınamadı.', 'warning');
             console.warn("updateBet success but no data returned:", data);
        }
    } catch (error) {
        showNotification(`Beklenmedik bahis güncelleme hatası: ${error.message}`, 'error');
        console.error("Save edit error:", error);
    } finally {
        setButtonLoading(saveButton, false);
    }
}


async function handleDeleteBetAttempt(betId) {
    if (isNaN(betId)) {
         console.error("Geçersiz betId:", betId);
         return;
    }
    // Teyit penceresi
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    // İlgili butonu bulup loading state ayarlayabiliriz (opsiyonel)
    const deleteButton = document.querySelector(`button[data-action="delete-bet"][data-id="${betId}"]`);
    // if (deleteButton) setButtonLoading(deleteButton, true, 'Siliniyor...');

    try {
        const { error } = await deleteBet(betId);
        if (error) {
            showNotification('Kayıt silinemedi: ' + error.message, 'error');
        } else {
            // State'den sil
            updateState({ bets: state.bets.filter(b => b.id !== betId) });
            // UI'ı güncelle (History ve Dashboard gibi)
            updateAllUI(); // renderHistory() ve renderCashHistory() bu fonksiyon içinde çağrılıyor
            showNotification('🗑️ Kayıt başarıyla silindi.', 'success'); // Başarı bildirimi
        }
    } catch (error) {
        showNotification(`Beklenmedik silme hatası: ${error.message}`, 'error');
        console.error("Delete bet error:", error);
    } finally {
        // if (deleteButton) setButtonLoading(deleteButton, false);
    }
}


async function handleCashTransactionAttempt(type) {
    const input = document.getElementById('cash-amount');
    const depositButton = document.getElementById('cash-deposit-btn');
    const withdrawalButton = document.getElementById('cash-withdrawal-btn');
    if(!input || !depositButton || !withdrawalButton) return;

    const activeButton = type === 'deposit' ? depositButton : withdrawalButton;

    let amount = parseFloat(input.value);

    // Miktar kontrolü
    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar (0\'dan büyük) girin.', 'warning');
        input.focus();
        return;
    }

    setButtonLoading(activeButton, true, 'İşleniyor...');
    try {
        const isDeposit = type === 'deposit';
        const profitLoss = isDeposit ? amount : -amount;

        const cashTransaction = {
            user_id: state.currentUser.id,
            platform: 'Kasa İşlemi',
            bet_type: 'Kasa İşlemi',
            description: isDeposit ? 'Para Yatırma' : 'Para Çekme',
            bet_amount: Math.abs(amount), // Miktar her zaman pozitif
            odds: 1, // Kasa işlemi için anlamsız
            date: new Date().toISOString().split('T')[0], // Bugün
            // Durumu kar/zararı yansıtacak şekilde ayarlayalım (mantıksal olarak)
            status: isDeposit ? 'won' : 'lost',
            win_amount: isDeposit ? amount : 0,
            profit_loss: profitLoss, // Gerçek etki
        };

        const { data, error } = await addBet(cashTransaction); // Kasa işlemi de bet olarak ekleniyor
        if (error) {
            showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.bets.unshift(data[0]); // Yeni işlemi listenin başına ekle
            updateAllUI(); // Dashboard ve Kasa Geçmişini güncelle
            closeCashTransactionModal(); // Modalı kapat ve input'u temizle
            showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} ₺`, 'success');
        } else {
             showNotification('Kasa işlemi kaydedildi ancak sunucudan yanıt alınamadı.', 'warning');
             console.warn("addBet (cash) success but no data returned:", data);
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
    if (!input || !button) return;

    const name = input.value.trim();

    if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
        input.focus();
        return;
    }

    // Büyük/küçük harf duyarsız kontrol
    const allPlatformsLower = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)].map(p => p.toLowerCase());
    if (allPlatformsLower.includes(name.toLowerCase())) {
        showNotification(`"${name}" platformu zaten mevcut.`, 'warning');
        input.focus();
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
                renderCustomPlatformsModal();
            } else {
                renderCustomPlatforms();
            }
            populatePlatformOptions(); // Tüm dropdownları güncelle
            showNotification(`✅ "${name}" platformu başarıyla eklendi!`, 'success');
        } else {
            showNotification('Platform eklendi ancak sunucudan yanıt alınamadı.', 'warning');
            console.warn("addPlatform success but no data returned:", data);
        }
    } catch (error) {
        showNotification(`Beklenmedik platform ekleme hatası: ${error.message}`, 'error');
        console.error("Add platform error:", error);
    } finally {
        setButtonLoading(button, false);
    }
}


async function handleRemovePlatformAttempt(platformId, platformName) {
     if (isNaN(platformId) || !platformName) return;
    // Teyit al
    if (!confirm(`"${platformName}" platformunu silmek istediğinizden emin misiniz? \n\nNot: Bu platformla ilişkili bahisler silinmeyecektir.`)) {
        return;
    }

    // Loading state eklenebilir
    // const removeButton = document.querySelector(`[data-action="remove-platform"][data-id="${platformId}"]`);
    // if(removeButton) setButtonLoading(removeButton, true);

    try {
        const { error } = await deletePlatform(platformId);
        if (error) {
            // Özel hata mesajı (örneğin ilişkili bahis varsa silinemez gibi)
            if (error.message.includes('violates foreign key constraint')) {
                 showNotification(`"${platformName}" silinemedi. Bu platformu kullanan bahisler mevcut.`, 'error');
            } else {
                showNotification('Platform silinemedi: ' + error.message, 'error');
            }
        } else {
            // State'den kaldır
            updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
            // UI'ları güncelle
            renderCustomPlatforms(); // Ayarlar listesi
            renderCustomPlatformsModal(); // Modal listesi
            populatePlatformOptions(); // Dropdownlar
            showNotification(`🗑️ "${platformName}" platformu başarıyla silindi.`, 'success');
        }
    } catch (error) {
        showNotification(`Beklenmedik platform silme hatası: ${error.message}`, 'error');
        console.error("Remove platform error:", error);
    } finally {
        // if(removeButton) setButtonLoading(removeButton, false);
    }
}

async function handleClearAllDataAttempt() {
    // İKİ KEZ teyit al
    if (!confirm('!!! DİKKAT !!!\nTÜM kişisel verilerinizi (bahisler, platformlar) KALICI olarak silmek istediğinizden emin misiniz? Bu işlem KESİNLİKLE geri alınamaz!')) {
        return;
    }
    const confirmationText = prompt('Bu işlemi onaylamak için büyük harflerle "TÜM VERİLERİ SİL" yazın:');
    if (confirmationText !== 'TÜM VERİLERİ SİL') {
         showNotification('Onay metni yanlış girildiği için işlem iptal edildi.', 'info');
         return;
    }

    const clearButton = document.getElementById('clear-all-btn') || document.getElementById('clear-all-settings-btn');
    if(!clearButton) return;

    setButtonLoading(clearButton, true, 'Tüm Veriler Siliniyor...');
    try {
        // Sırayla silme: Önce bahisler, sonra platformlar (bağımlılık varsa hata vermemesi için)
        const betsRes = await clearAllBetsForUser(state.currentUser.id);
        if (betsRes.error) throw new Error("Bahisler silinemedi: " + betsRes.error.message);

        const platformsRes = await clearAllPlatformsForUser(state.currentUser.id);
        if (platformsRes.error) throw new Error("Platformlar silinemedi: " + platformsRes.error.message);

        // Başarılı olursa state'i ve UI'ı temizle
        updateState({ bets: [], customPlatforms: [] });
        updateAllUI(); // Her şeyi yeniden çiz
        populatePlatformOptions(); // Dropdownları güncelle
        renderCustomPlatforms(); // Listeyi temizle
        renderCustomPlatformsModal(); // Modal listesini temizle
        showNotification('🗑️ Tüm kişisel verileriniz (bahisler ve platformlar) başarıyla silindi!', 'success');

    } catch (error) {
        showNotification(`Veriler silinirken hata oluştu: ${error.message}`, 'error');
        console.error("Clear all data error:", error);
    } finally {
        setButtonLoading(clearButton, false);
    }
}

async function handleUserAnalyzeBetSlip() {
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    if(!geminiButton) return;

    setButtonLoading(geminiButton, true, 'Kupon Okunuyor...');

    try {
        const base64Data = state.currentImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);

        if (!result) throw new Error("API'den geçerli bir sonuç alınamadı.");

        // Gelen veriyi form alanlarına doldur
        const descriptionInput = document.getElementById('description');
        const betAmountInput = document.getElementById('bet-amount');
        const oddsInput = document.getElementById('odds');

        if (descriptionInput && result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
            const descriptionText = result.matches
                .map(match => `${match.matchName || '?'} (${(match.bets || []).join(', ') || '?'})`)
                .join(' / ');
            descriptionInput.value = descriptionText;
        }
        if (betAmountInput && result.betAmount && !isNaN(result.betAmount)) {
            betAmountInput.value = result.betAmount;
        }
        if (oddsInput && result.odds && !isNaN(result.odds)) {
            oddsInput.value = result.odds;
        }

        showNotification('✨ Kupon bilgileri başarıyla form alanlarına aktarıldı!', 'success');

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
    if(!geminiButton) return;

    setButtonLoading(geminiButton, true, 'Fırsat Okunuyor...');

    try {
        const base64Data = state.adminImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);

        if (!result) throw new Error("API'den geçerli bir sonuç alınamadı.");

        const descriptionInput = document.getElementById('special-odd-description');
        const oddsInput = document.getElementById('special-odd-odds');

        if (descriptionInput && result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
            const descriptionText = result.matches
                .map(match => `${match.matchName || '?'} (${(match.bets || []).join(', ') || '?'})`)
                .join(' / ');
            descriptionInput.value = descriptionText;
        }
        if (oddsInput && result.odds && !isNaN(result.odds)) {
            oddsInput.value = result.odds;
        }
        // Admin formunda betAmount alanı olmadığı için onu işlemiyoruz.

        showNotification('✨ Fırsat bilgileri başarıyla form alanlarına aktarıldı!', 'success');

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
    if(!form) return;
    const button = form.querySelector('button[type="submit"]');
    if(!button) return;

    // --- DOĞRULAMA KONTROLLERİ (Özel Oran için) ---
    const descriptionInput = document.getElementById('special-odd-description');
    const oddsInput = document.getElementById('special-odd-odds');
    const platformInput = document.getElementById('special-odd-platform');
    const maxBetInput = document.getElementById('special-odd-max-bet');

     if (!descriptionInput || !oddsInput || !platformInput || !maxBetInput) {
        showNotification('Özel oran formu elemanları bulunamadı.', 'error');
        return;
    }

    const description = descriptionInput.value.trim();
    const odds = parseFloat(oddsInput.value);
    const platform = platformInput.value.trim();
    const maxBet = parseFloat(maxBetInput.value); // NaN olabilir, sorun değil

    if (!description) {
        showNotification('Lütfen fırsat için bir açıklama girin.', 'warning');
        descriptionInput.focus();
        return;
    }
     if (isNaN(odds) || odds < 1.01) {
        showNotification('Lütfen geçerli bir oran (1.01 veya üzeri) girin.', 'warning');
        oddsInput.focus();
        return;
    }
     if (!platform) {
        showNotification('Lütfen platform adını girin.', 'warning');
        platformInput.focus();
        return;
    }
    // Maksimum bahis negatif olamaz
    if (!isNaN(maxBet) && maxBet <= 0) {
         showNotification('Maksimum bahis miktarı 0\'dan büyük olmalıdır (veya boş bırakılmalıdır).', 'warning');
         maxBetInput.focus();
         return;
    }
    // --- DOĞRULAMA KONTROLLERİ SONU ---

    setButtonLoading(button, true, 'Yayınlanıyor...');
    try {
        const oddData = {
            description: description,
            odds: odds,
            platform: platform,
            max_bet_amount: !isNaN(maxBet) && maxBet > 0 ? maxBet : null, // Sadece pozitifse ekle
            primary_link_text: document.getElementById('special-odd-primary-link-text')?.value.trim() || null,
            primary_link_url: document.getElementById('special-odd-primary-link-url')?.value.trim() || null,
            secondary_link_text: document.getElementById('special-odd-secondary-link-text')?.value.trim() || null,
            secondary_link_url: document.getElementById('special-odd-secondary-link-url')?.value.trim() || null,
            status: 'pending'
        };

        const { data, error } = await addSpecialOdd(oddData);
        if (error) {
            showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            state.specialOdds.unshift(data[0]); // Yeni fırsatı state'in başına ekle
            renderActiveSpecialOdds(); // Admin panelindeki listeyi güncelle
            renderSpecialOddsPage(); // Fırsatlar sayfasını güncelle
            form.reset(); // Formu temizle
            removeImage('admin'); // Admin resim alanını temizle
            showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
        } else {
             showNotification('Fırsat yayınlandı ancak sunucudan yanıt alınamadı.', 'warning');
             console.warn("addSpecialOdd success but no data returned:", data);
        }
    } catch (error) {
         showNotification(`Beklenmedik fırsat yayınlama hatası: ${error.message}`, 'error');
         console.error("Publish special odd error:", error);
    } finally {
        setButtonLoading(button, false);
    }
}


async function handleResolveSpecialOdd(id, status) {
     if (isNaN(id) || !['won', 'lost', 'refunded'].includes(status)) return;

    if (!confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`)) {
        return;
    }

    // İlgili butona loading state eklenebilir
    // const resolveButton = document.querySelector(`button[data-action="resolve-special-odd"][data-id="${id}"][data-status="${status}"]`);
    // if(resolveButton) setButtonLoading(resolveButton, true, 'İşaretleniyor...');

    try {
        // API'ye sadece status gönderiyoruz, güncellenmiş kayıt geri dönecek.
        const { data, error } = await updateSpecialOdd(id, { status });
        if (error) {
            showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
        } else if (data && data.length > 0) {
            // State'i güncelle
            const index = state.specialOdds.findIndex(o => o.id === id); // ID eşleşmesi yeterli
            if (index > -1) {
                state.specialOdds[index] = data[0]; // Güncellenmiş veriyi al
            }
            // İlgili UI'ları güncelle
            renderActiveSpecialOdds(); // Admin panelindeki listeyi
            renderSpecialOddsPage(); // Fırsatlar sayfasını
            updateAllUI(); // Bahis geçmişi gibi diğer yerleri etkileyebilir (status değiştiği için)
            showNotification(`✅ Fırsat "${status.toUpperCase()}" olarak işaretlendi!`, 'success');
        } else {
             showNotification('Fırsat durumu güncellendi ancak sunucudan yanıt alınamadı.', 'warning');
             console.warn("updateSpecialOdd success but no data returned:", data);
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
    if (state.listenersAttached) {
         // console.log("Event listeners zaten bağlı."); // Geliştirme sırasında loglama
        return; // Tekrar bağlamayı engelle
    }

    console.log("setupEventListeners çağrılıyor ve listener'lar bağlanıyor.");

    // --- Tek Seferlik Ana Listener'lar ---

    // Auth Listeners
    DOM.get('loginBtn')?.addEventListener('click', handleLoginAttempt);
    DOM.get('signupBtn')?.addEventListener('click', handleSignUpAttempt);
    DOM.get('logoutBtn')?.addEventListener('click', () => signOut().catch(err => console.error("Logout error:", err)));
    DOM.get('forgotPasswordLink')?.addEventListener('click', (e) => { e.preventDefault(); openModal('password-reset-modal'); });
    DOM.get('cancelResetBtn')?.addEventListener('click', () => closeModal('password-reset-modal'));
    DOM.get('passwordResetForm')?.addEventListener('submit', handlePasswordResetAttempt);
    DOM.get('accountSettingsForm')?.addEventListener('submit', handleUpdatePasswordAttempt);

    // Sidebar and Navigation
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section, item));
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileSidebar);
    document.getElementById('show-history-btn')?.addEventListener('click', () => {
         const historyItem = document.querySelector('.sidebar-item[data-section="history"]');
         if(historyItem) showSection('history', historyItem);
    });

    // Main Form Submissions
    document.getElementById('bet-form')?.addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form')?.addEventListener('submit', handleQuickAddSubmitAttempt);
    // Admin form submit listener'ları admin_actions.js içinde ayarlanıyor

    // --- Modal Açma/Kapama ve İçindeki Ana Eylemler ---
    // Floating Action Button
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal);
    // Dashboard Buttons
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal);
    // Platform Manager
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager);
    document.getElementById('close-platform-manager-btn')?.addEventListener('click', closePlatformManager);
    document.getElementById('add-platform-modal-btn')?.addEventListener('click', () => handleAddPlatformAttempt(true));
    // Quick Add Modal
    document.getElementById('close-quick-add-btn')?.addEventListener('click', closeQuickAddModal);
    // Edit Bet Modal
    document.getElementById('close-edit-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-edit-btn')?.addEventListener('click', handleSaveEditAttempt);
    // Cash Transaction Modal
    document.getElementById('cash-transaction-close-btn')?.addEventListener('click', closeCashTransactionModal);
    document.getElementById('cash-deposit-btn')?.addEventListener('click', () => handleCashTransactionAttempt('deposit'));
    document.getElementById('cash-withdrawal-btn')?.addEventListener('click', () => handleCashTransactionAttempt('withdrawal'));
    // Image Modal
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal); // Tıklayınca kapat
    // Ad Popup Modal
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);
    // Play Special Odd Modal (Kapatma butonu body delegation ile yakalanıyor)
    document.getElementById('special-odd-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') closePlaySpecialOddModal();
        if (e.target.id === 'confirm-play-special-odd') handlePlaySpecialOdd(e.target); // Butonu da gönder
    });
    // Import/Export Modal
    document.getElementById('import-btn')?.addEventListener('click', () => openModal('import-modal'));
    document.getElementById('close-import-btn')?.addEventListener('click', () => closeModal('import-modal'));
    document.getElementById('import-data-btn')?.addEventListener('click', handleImportData);


    // --- Filtreleme ve Arama Listener'ları ---
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
        }, 300);
    });
    document.querySelectorAll('#history-period-buttons .period-btn').forEach(button => {
        button.addEventListener('click', (e) => {
             const period = e.target.dataset.period;
             if (period !== undefined) {
                 const newPeriod = period === 'all' ? 'all' : parseInt(period, 10);
                 if (!isNaN(newPeriod) || newPeriod === 'all') {
                     updateState({ filters: { ...state.filters, period: newPeriod }, currentPage: 1 });
                     // Aktif butonu ayarla
                     document.querySelectorAll('#history-period-buttons .period-btn').forEach(btn => btn.classList.remove('active'));
                     e.target.classList.add('active');
                     renderHistory();
                 }
             }
        });
    });

    // Special Odds Page Filters
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

    // Statistics Page Date Filter Reset
    document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        state.statsFilters.dateRange = { start: null, end: null };
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if (datePicker) datePicker.clear();
        updateStatisticsPage();
        updateCharts();
    });
    // Dashboard Period Buttons
     document.querySelectorAll('#performance-period-buttons .period-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            if (period !== undefined) {
                const periodNum = parseInt(period, 10);
                if (!isNaN(periodNum)) {
                    updateState({ dashboardPeriod: periodNum });
                    // Aktif butonu ayarla (burada tekrar ayarlamaya gerek yok, updatePerformanceSummary yapıyor)
                    updatePerformanceSummary();
                }
            }
        });
    });


    // --- Diğer Butonlar ve İşlemler ---
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm()); // Ana bahis formu temizle
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip); // Admin Gemini
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip); // Kullanıcı Gemini
    document.getElementById('export-btn')?.addEventListener('click', handleExportData); // Dışa Aktar
    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt); // Geçmiş sayfasındaki temizle
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt); // Ayarlar sayfasındaki temizle
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false)); // Ayarlar sayfasındaki platform ekle

    // --- Resim Yükleme ---
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
             // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
             e.target.value = null;
        });
        removeBtn.addEventListener('click', () => removeImage(type));

        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                 if (['dragenter', 'dragover'].includes(eventName)) {
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

    // Resim Yapıştırma (Paste)
    document.addEventListener('paste', e => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return;

            let targetType = null;
            const quickAddModal = document.getElementById('quick-add-modal');
            const adminPanelContainer = document.getElementById('admin-panels-container');

            if (state.currentSection === 'new-bet') targetType = 'main';
            else if (quickAddModal && !quickAddModal.classList.contains('hidden')) targetType = 'quick';
            else if (state.currentSection === 'settings' && adminPanelContainer && !adminPanelContainer.classList.contains('hidden')) targetType = 'admin';

            if (targetType) handleImageFile(file, targetType);

        } catch (pasteError) { console.error("Resim yapıştırma hatası:", pasteError); }
    });

    // --- Body Üzerinden Dinamik Olarak Eklenen Elementler için Event Delegation ---
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;
        const name = target.dataset.name; // Genellikle silme onayı için
        const page = target.dataset.page ? parseInt(target.dataset.page, 10) : null; // Sayfalama için
        const src = target.dataset.src; // Resim modalı için
        // const period = target.dataset.period; // Yukarıda doğrudan butonlara eklendi
        const status = target.dataset.status; // Özel oran sonuçlandırma için

        // id gerektiren işlemler için kontrol
        if (['open-edit-modal', 'delete-bet', 'remove-platform', 'resolve-special-odd', 'open-play-special-odd-modal', 'delete-sponsor', 'delete-ad'].includes(action) && (id === null || isNaN(id))) {
            console.warn(`Action "${action}" için geçersiz veya eksik ID.`);
            return;
        }
         // Sayfa gerektiren işlemler için kontrol
        if (['changeBetPage', 'changeCashPage'].includes(action) && (page === null || isNaN(page))) {
            console.warn(`Action "${action}" için geçersiz veya eksik sayfa numarası.`);
            return;
        }

        switch (action) {
            // Bet Actions
            case 'open-edit-modal': openEditModal(id); break;
            case 'delete-bet': handleDeleteBetAttempt(id); break;
            // Platform Actions
            case 'remove-platform': if (name) handleRemovePlatformAttempt(id, name); break;
            // Pagination
            case 'changeBetPage': changeBetPage(page); break;
            case 'changeCashPage': changeCashPage(page); break;
            // Image Modal
            case 'show-image-modal': if (src) showImageModal(src); break;
            // Special Odd Actions
            case 'resolve-special-odd': if (status) handleResolveSpecialOdd(id, status); break;
            case 'open-play-special-odd-modal': openPlaySpecialOddModal(id); break;
            // Admin Actions (Dynamic Import)
            case 'delete-sponsor':
                if (name) import('./admin_actions.js').then(m => m.handleDeleteSponsor(id, name)).catch(err => console.error("Admin actions yüklenemedi:", err));
                break;
            case 'delete-ad':
                import('./admin_actions.js').then(m => m.handleDeleteAd(id)).catch(err => console.error("Admin actions yüklenemedi:", err));
                break;
            // Not: set-dashboard-period ve set-history-period yukarıda doğrudan butonlara eklendi.
        }
    });

    // Admin form listener'ları (sponsor/reklam ekleme), admin ise yüklenir.
    if (state.currentUser?.id === ADMIN_USER_ID) {
        import('./admin_actions.js')
            .then(module => module.setupAdminEventListeners?.()) // Fonksiyon varsa çağır
            .catch(err => console.error("Admin actions modülü yüklenemedi:", err));
    }


    updateState({ listenersAttached: true });
    console.log("Event listeners kurulumu tamamlandı.");
}

