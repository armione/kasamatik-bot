import { state, updateState } from './state.js';
import { DOM, DEFAULT_PLATFORMS, ADMIN_USER_ID } from './utils/constants.js';
import { showNotification, setButtonLoading, calculateProfitLoss } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSpecialOdd, updateSpecialOdd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { changeBetPage, changeCashPage, renderHistory } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderActiveSpecialOdds, renderSpecialOddsPage } from './components/ui_helpers.js';
import { 
    openModal, closeModal, openPlatformManager, closePlatformManager, 
    openCashTransactionModal, closeCashTransactionModal, openQuickAddModal, 
    closeQuickAddModal, openEditModal, closeEditModal, openPlaySpecialOddModal, 
    closePlaySpecialOddModal, showImageModal, closeImageModal, closeAdPopup, 
    renderCustomPlatformsModal 
} from './components/modals.js';
import { updateStatisticsPage } from './components/statistics.js';
import { updatePerformanceSummary } from './components/dashboard.js';
// İçe/Dışa Aktarma fonksiyonları eklendi
import { handleExportData, handleImportData, showImportModal, closeImportModal } from './data_actions.js';

let searchDebounceTimer;

// HANDLER FUNCTIONS (OLAY YÖNETİCİLERİ)

/**
 * Giriş yapma denemesini yönetir.
 * HATA DÜZELTMESİ: Butonun hata durumunda takılı kalmasını önlemek için try...catch...finally eklendi.
 */
async function handleLoginAttempt() {
    const loginBtn = DOM.get('loginBtn');
    const authForm = DOM.get('authForm');
    
    // Formun var olup olmadığını kontrol et
    if (!authForm || !loginBtn) {
        console.error("Giriş formu veya butonu DOM'da bulunamadı.");
        showNotification("Kritik bir hata oluştu, lütfen sayfayı yenileyin.", "error");
        return;
    }

    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    
    try {
        const email = authForm.email.value;
        const password = authForm.password.value;
        
        if (!email || !password) {
            showNotification("Lütfen e-posta ve şifre alanlarını doldurun.", "warning");
            // 'finally' bloğu butonu sıfırlayacak.
            return;
        }
        
        const { error } = await signIn(email, password);
        
        if (error) {
            showNotification(`Giriş hatası: ${error.message}`, 'error');
        }
        // Başarılı olursa, onAuthStateChange tetiklenecek ve main.js uygulamayı başlatacak.
        
    } catch (err) {
        console.error("Giriş sırasında kritik hata (handleLoginAttempt):", err);
        showNotification(`Beklenmedik bir hata oluştu: ${err.message}`, 'error');
    } finally {
        // Hata olsa da, başarılı olsa da butonu tekrar aktif et.
        // Başarılı girişte zaten onAuthStateChange tetikleneceği için butonun 
        // kısa bir süre normale dönmesi sorun yaratmaz.
        setButtonLoading(loginBtn, false);
    }
}

/**
 * Kayıt olma denemesini yönetir.
 * HATA DÜZELTMESİ: Butonun hata durumunda takılı kalmasını önlemek için try...catch...finally eklendi.
 */
async function handleSignUpAttempt() {
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');

    if (!authForm || !signupBtn) {
        console.error("Kayıt formu veya butonu DOM'da bulunamadı.");
        showNotification("Kritik bir hata oluştu, lütfen sayfayı yenileyin.", "error");
        return;
    }

    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    
    try {
        const email = authForm.email.value;
        const password = authForm.password.value;

        if (!email || !password) {
            showNotification("Lütfen e-posta ve şifre alanlarını doldurun.", "warning");
            return;
        }
        
        const { data, error } = await signUp(email, password);

        if (error) {
            console.log("Kayıt hatası yakalandı:", error.message);
            showNotification(`Kayıt hatası: ${error.message}`, 'error');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            console.log("Mevcut ama onaylanmamış e-posta durumu.");
            showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
        } else if (data.user) {
            console.log("Yeni kayıt başarılı.");
            authForm.classList.add('hidden');
            // 'user-email-confirm' elementinin varlığını kontrol et
            const emailConfirmEl = document.getElementById('user-email-confirm');
            if(emailConfirmEl) emailConfirmEl.textContent = email;
            
            const successMessageEl = document.getElementById('signup-success-message');
            if(successMessageEl) successMessageEl.classList.remove('hidden');
        } else {
            console.log("Beklenmeyen Supabase signUp cevabı:", data);
            showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    } catch (err) {
        console.error("Kayıt sırasında kritik hata (handleSignUpAttempt):", err);
        showNotification(`Beklenmedik bir hata oluştu: ${err.message}`, 'error');
    } finally {
        setButtonLoading(signupBtn, false);
    }
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
    setButtonLoading(addButton, true, 'Ekleniyor...');

    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: document.getElementById('platform').value,
            bet_type: document.getElementById('bet-type').value,
            description: document.getElementById('description').value || 'Açıklama yok',
            bet_amount: parseFloat(document.getElementById('bet-amount').value),
            odds: parseFloat(document.getElementById('odds').value),
            date: document.getElementById('bet-date').value,
            status: 'pending',
            win_amount: 0,
            profit_loss: 0 // Profit/loss sunucuda (veya get'te) hesaplanmalı, ama şimdilik 0.
        };

        if (!newBetData.platform || isNaN(newBetData.bet_amount) || isNaN(newBetData.odds) || !newBetData.date) {
             showNotification('Lütfen Platform, Miktar, Oran ve Tarih alanlarını doldurun.', 'warning');
             setButtonLoading(addButton, false); // Butonu serbest bırak
             return;
        }

        const { data, error } = await addBet(newBetData);
        if (error) {
            showNotification('Bahis eklenirken hata oluştu: ' + error.message, 'error');
        } else {
            state.bets.unshift(data[0]);
            updateAllUI();
            resetForm();
            showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
        }
    } catch (err) {
        console.error("Bahis eklerken kritik hata:", err);
        showNotification(`Bahis eklenemedi: ${err.message}`, 'error');
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
        } else {
            state.bets.unshift(data[0]);

            // RPC veya 'play_count: odd.play_count + 1' ile güncelleme
            // Not: Bu işlemde race condition olabilir, ideali RPC ile increment etmektir.
            const { data: updatedOdd, error: updateError } = await updateSpecialOdd(odd.id, { play_count: (odd.play_count || 0) + 1 });
            
            if(!updateError && updatedOdd.length > 0) {
                const index = state.specialOdds.findIndex(o => o.id === odd.id);
                if(index > -1) state.specialOdds[index] = updatedOdd[0];
            } else if (updateError) {
                console.error("Play count güncellenirken hata:", updateError.message);
            }
            
            updateAllUI();
            renderSpecialOddsPage();
            closePlaySpecialOddModal();
            showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
        }
    } catch (err) {
        console.error("Fırsat oynanırken kritik hata:", err);
        showNotification(`Fırsat eklenemedi: ${err.message}`, 'error');
    } finally {
         setButtonLoading(button, false);
    }
}


async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const form = document.getElementById('quick-add-form');
    const platform = document.getElementById('quick-platform').value;
    const amount = parseFloat(document.getElementById('quick-amount').value);
    const odds = parseFloat(document.getElementById('quick-odds').value);

    if (!platform || isNaN(amount) || isNaN(odds) || amount <= 0 || odds < 1) {
        showNotification('Lütfen tüm alanları geçerli bir şekilde doldurun.', 'warning');
        return;
    }
    
    // Butonu bul ve yükleme durumuna al
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Ekleniyor...');

    try {
        const newBetData = {
            user_id: state.currentUser.id,
            platform: platform,
            bet_type: 'Spor Bahis', // Hızlı ekle varsayılanı
            description: 'Hızlı bahis',
            bet_amount: amount,
            odds: odds,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            win_amount: 0,
            profit_loss: 0
        };

        const { data, error } = await addBet(newBetData);
        if (error) {
            showNotification('Hızlı bahis eklenemedi: ' + error.message, 'error');
        } else {
            state.bets.unshift(data[0]);
            updateAllUI();
            closeQuickAddModal();
            showNotification('🚀 Hızlı bahis eklendi!', 'success');
        }
    } catch (err) {
         console.error("Hızlı bahis eklerken kritik hata:", err);
         showNotification(`Hızlı bahis eklenemedi: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

async function handleSaveEditAttempt() {
    const bet = state.currentlyEditingBet;
    if (!bet) return;
    
    const saveButton = document.getElementById('save-edit-btn');
    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    try {
        const status = document.getElementById('edit-status').value;
        const winAmountInput = document.getElementById('edit-win-amount');
        const winAmount = parseFloat(winAmountInput.value) || 0;

        let updateData = { 
            status: status,
            win_amount: 0, // Varsayılan
            profit_loss: 0 // Varsayılan
        };

        if (status === 'won') {
             if (winAmount <= 0) {
                showNotification("Kazanan bahis için lütfen 0'dan büyük bir kazanç miktarı girin.", "warning");
                setButtonLoading(saveButton, false);
                return;
            }
            updateData.win_amount = winAmount;
            updateData.profit_loss = winAmount - bet.bet_amount;
        } else if (status === 'lost') {
            updateData.win_amount = 0;
            updateData.profit_loss = -bet.bet_amount;
        } else if (status === 'refunded') {
             updateData.win_amount = 0; // İade durumunda kazanç 0
             updateData.profit_loss = 0; // Kar/zarar 0
        }
        // 'pending' durumu zaten varsayılanları (0, 0) kullanır.

        const { data, error } = await updateBet(state.editingBetId, updateData);
        if (error) {
            showNotification('Bahis güncellenemedi: ' + error.message, 'error');
        } else {
            const index = state.bets.findIndex(b => b.id === state.editingBetId);
            if (index !== -1) {
                state.bets[index] = data[0];
            }
            updateAllUI();
            closeEditModal();
            showNotification('✔️ Bahis güncellendi!', 'info');
        }
    } catch (err) {
        console.error("Bahis güncellerken kritik hata:", err);
        showNotification(`Bahis güncellenemedi: ${err.message}`, 'error');
    } finally {
        setButtonLoading(saveButton, false);
    }
}

async function handleDeleteBetAttempt(betId) {
    // confirm kullanımı PWA'larda ve bazı ortamlarda sorunlu olabilir,
    // ideal olanı özel bir modal kullanmaktır.
    // Şimdilik confirm'i koruyoruz:
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        try {
            const { error } = await deleteBet(betId);
            if (error) {
                showNotification('Kayıt silinemedi: ' + error.message, 'error');
            } else {
                updateState({ bets: state.bets.filter(b => b.id !== betId) });
                updateAllUI();
                showNotification('🗑️ Kayıt silindi.', 'info'); // 'error' yerine 'info'
            }
        } catch (err) {
             console.error("Bahis silerken kritik hata:", err);
             showNotification(`Kayıt silinemedi: ${err.message}`, 'error');
        }
    }
}

async function handleCashTransactionAttempt(type) {
    const input = document.getElementById('cash-amount');
    let amount = parseFloat(input.value);

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin.', 'error');
        return;
    }

    const isDeposit = type === 'deposit';
    const profitLoss = isDeposit ? amount : -amount;
    const buttonId = isDeposit ? 'cash-deposit-btn' : 'cash-withdrawal-btn';
    const button = document.getElementById(buttonId);
    setButtonLoading(button, true, 'İşleniyor...');

    try {
        const cashTransaction = {
            user_id: state.currentUser.id,
            platform: 'Kasa İşlemi',
            bet_type: 'Kasa İşlemi',
            description: isDeposit ? 'Para Ekleme' : 'Para Çekme',
            bet_amount: Math.abs(amount), // Miktar her zaman pozitif
            odds: 1,
            date: new Date().toISOString().split('T')[0],
            status: isDeposit ? 'won' : 'lost', // Kasa işlemleri için anlamsal statü
            win_amount: isDeposit ? amount : 0,
            profit_loss: profitLoss,
        };

        const { data, error } = await addBet(cashTransaction);
        if (error) {
            showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
        } else {
            state.bets.unshift(data[0]);
            updateAllUI();
            closeCashTransactionModal();
            showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
        }
    } catch (err) {
        console.error("Kasa işlemi sırasında kritik hata:", err);
        showNotification(`Kasa işlemi yapılamadı: ${err.message}`, 'error');
    } finally {
         setButtonLoading(button, false);
    }
}

async function handleAddPlatformAttempt(fromModal = false) {
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const buttonId = fromModal ? 'add-platform-modal-btn' : 'add-platform-btn';
    
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const name = input.value.trim();
    
    const allPlatforms = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)];

    if (name && !allPlatforms.some(p => p.toLowerCase() === name.toLowerCase())) {
        setButtonLoading(button, true, '...');
        try {
            const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
            if (error) {
                showNotification('Platform eklenemedi: ' + error.message, 'error');
            } else {
                state.customPlatforms.push(data[0]);
                input.value = '';
                renderCustomPlatformsModal(); // Modal'ı her zaman güncelle
                if (!fromModal) {
                    renderCustomPlatforms(); // Ayarlar sayfasını da güncelle
                }
                populatePlatformOptions();
                showNotification(`✅ ${name} platformu eklendi!`, 'success');
            }
        } catch (err) {
            console.error("Platform eklerken kritik hata:", err);
            showNotification(`Platform eklenemedi: ${err.message}`, 'error');
        } finally {
            setButtonLoading(button, false);
        }
    } else if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
    } else {
        showNotification('Bu platform zaten mevcut.', 'warning');
    }
}

async function handleRemovePlatformAttempt(platformId, platformName) {
    if (confirm(`'${platformName}' platformunu silmek istediğinizden emin misiniz?`)) {
        try {
            const { error } = await deletePlatform(platformId);
            if (error) {
                showNotification('Platform silinemedi: ' + error.message, 'error');
            } else {
                updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
                renderCustomPlatforms();
                renderCustomPlatformsModal();
                populatePlatformOptions();
                showNotification(`🗑️ ${platformName} platformu silindi`, 'info');
            }
        } catch (err) {
             console.error("Platform silerken kritik hata:", err);
             showNotification(`Platform silinemedi: ${err.message}`, 'error');
        }
    }
}

async function handleClearAllDataAttempt() {
    if (confirm('TÜM KİŞİSEL VERİLERİNİZİ (BAHİS, PLATFORM) SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!')) {
        try {
            // Butonları yükleme durumuna al
            const clearBtn1 = document.getElementById('clear-all-btn');
            const clearBtn2 = document.getElementById('clear-all-settings-btn');
            if(clearBtn1) setButtonLoading(clearBtn1, true, 'Siliniyor...');
            if(clearBtn2) setButtonLoading(clearBtn2, true, 'Siliniyor...');

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
                renderCustomPlatformsModal();
                showNotification('🗑️ Tüm kişisel verileriniz silindi!', 'info');
            }
            
            if(clearBtn1) setButtonLoading(clearBtn1, false);
            if(clearBtn2) setButtonLoading(clearBtn2, false);

        } catch (err) {
            console.error("Verileri temizlerken kritik hata:", err);
            showNotification(`Veriler temizlenemedi: ${err.message}`, 'error');
        }
    }
}

async function handleUserAnalyzeBetSlip() {
    if (!state.currentImageData) { // 'mainImageData' -> 'currentImageData' olarak düzeltildi (state.js'e göre)
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Okunuyor...');

    try {
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

async function handlePublishSpecialOdd(e) {
    e.preventDefault();
    const form = document.getElementById('special-odd-form');
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Yayınlanıyor...');

    try {
        const oddData = {
            description: document.getElementById('special-odd-description').value,
            odds: parseFloat(document.getElementById('special-odd-odds').value),
            platform: document.getElementById('special-odd-platform').value,
            max_bet_amount: parseFloat(document.getElementById('special-odd-max-bet').value) || null,
            primary_link_text: document.getElementById('special-odd-primary-link-text').value || null,
            primary_link_url: document.getElementById('special-odd-primary-link-url').value || null,
            secondary_link_text: document.getElementById('special-odd-secondary-link-text').value || null,
            secondary_link_url: document.getElementById('special-odd-secondary-link-url').value || null,
            status: 'pending'
        };

        if (!oddData.description || !oddData.odds || !oddData.platform) {
            showNotification('Lütfen Açıklama, Oran ve Platform alanlarını doldurun.', 'warning');
            setButtonLoading(button, false);
            return;
        }

        const { data, error } = await addSpecialOdd(oddData);
        if (error) {
            showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
        } else {
            state.specialOdds.unshift(data[0]);
            renderActiveSpecialOdds(); // Admin panelini güncelle
            renderSpecialOddsPage(); // Kullanıcı sayfasını güncelle
            form.reset();
            removeImage('admin');
            showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
        }
    } catch (err) {
        console.error("Fırsat yayınlarken kritik hata:", err);
        showNotification(`Fırsat yayınlanamadı: ${err.message}`, 'error');
    } finally {
        setButtonLoading(button, false);
    }
}


async function handleResolveSpecialOdd(id, status) {
    if (!confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`)) {
        return;
    }

    try {
        const { data, error } = await updateSpecialOdd(id, { status: status, resulted_at: new Date().toISOString() }); // resulted_at eklendi
        if(error) {
            showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
        } else {
            const index = state.specialOdds.findIndex(o => o.id === parseInt(id));
            if(index > -1) {
                // state.specialOdds[index] = data[0]; // Bu, realtime tarafından zaten yapılacak
            }
            // Realtime'ın güncellemesini beklemek yerine manuel olarak da güncelleyebiliriz:
            const updatedOdd = data[0];
            const stateIndex = state.specialOdds.findIndex(o => o.id === updatedOdd.id);
            if(stateIndex > -1) state.specialOdds[stateIndex] = updatedOdd;
            
            renderActiveSpecialOdds(); // Admin listesini güncelle
            renderSpecialOddsPage(); // Kullanıcı listesini güncelle
            updateAllUI(); // Dashboard vb. güncelle
            showNotification('Fırsat durumu güncellendi!', 'info');
        }
    } catch (err) {
        console.error("Fırsat çözümlerken kritik hata:", err);
        showNotification(`Fırsat durumu güncellenemedi: ${err.message}`, 'error');
    }
}

// EVENT LISTENER SETUP
export function setupEventListeners() {
    if (state.listenersAttached) {
        return;
    };

    console.log("setupEventListeners çağrılıyor.");

    // Butonların varsayılan metinlerini kaydet
    document.querySelectorAll('button').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement) {
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
    
    // Admin formu listener'ı (state.currentUser'a bağlı olmamalı, admin_actions'a taşınmalı)
    // document.getElementById('special-odd-form')?.addEventListener('submit', handlePublishSpecialOdd);
    // document.getElementById('sponsor-form')?.addEventListener('submit', ... );
    // document.getElementById('ad-form')?.addEventListener('submit', ... );


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
            case 'resolve-special-odd':
                if (id !== null && status) handleResolveSpecialOdd(id, status);
                break;
            case 'open-play-special-odd-modal':
                if (id !== null) openPlaySpecialOddModal(id);
                break;
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

    // Fırsatı Oyna Modal (Event Delegation ile)
    document.getElementById('special-odd-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') {
            closePlaySpecialOddModal();
        }
        // Butonun kendisine veya içindeki span'lere tıklanabilir, closest ile yakala
        if (e.target.closest('#confirm-play-special-odd')) {
            handlePlaySpecialOdd(e.target.closest('#confirm-play-special-odd'));
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

    // İstatistikler Filtreleme
     document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        state.statsFilters.dateRange = { start: null, end: null };
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if(datePicker) datePicker.clear();
        updateStatisticsPage();
        updateCharts(); // Grafikleri de sıfırla
    });

    // Diğer UI etkileşimleri
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm());
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip);
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip);

    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt);
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt);
    
    // İçe/Dışa Aktarma Butonları (Adım 1'de eklendi)
    document.getElementById('import-btn')?.addEventListener('click', showImportModal);
    document.getElementById('export-btn')?.addEventListener('click', handleExportData);
    document.getElementById('close-import-btn')?.addEventListener('click', closeImportModal);
    document.getElementById('import-data-btn')?.addEventListener('click', handleImportData);


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

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) {
            return;
        }

        selectBtn.addEventListener('click', () => imageInput.click());
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

            let type = 'main'; // Varsayılan
            const quickAddModal = document.getElementById('quick-add-modal');
            const adminPanelContainer = document.getElementById('admin-panels-container');

            if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                type = 'quick';
            } else if (state.currentSection === 'settings' && adminPanelContainer && !adminPanelContainer.classList.contains('hidden')) {
                 type = 'admin';
            } else if (state.currentSection !== 'new-bet') {
                return; // Sadece ilgili sayfalardayken yapıştır
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

    // Admin eylemleri için listener'ları kur
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

