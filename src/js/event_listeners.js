import { state, updateState } from './state.js';
import { DOM, DEFAULT_PLATFORMS } from './utils/constants.js';
import { showNotification } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { renderHistory, changeBetPage, changeCashPage } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage } from './components/ui_helpers.js';
import * as Modals from './components/modals.js';

// HANDLER FUNCTIONS
async function handleLoginAttempt() {
    DOM.loginBtn.disabled = true;
    DOM.loginBtn.textContent = "Giriş yapılıyor...";
    const { error } = await signIn(DOM.authForm.email.value, DOM.authForm.password.value);
    if (error) {
        showNotification(`Giriş hatası: ${error.message}`, 'error');
    }
    DOM.loginBtn.disabled = false;
    DOM.loginBtn.textContent = "Giriş Yap";
}

async function handleSignUpAttempt() {
    DOM.signupBtn.disabled = true;
    DOM.signupBtn.textContent = "Kayıt olunuyor...";
    const email = DOM.authForm.email.value;
    const { error } = await signUp(email, DOM.authForm.password.value);
    if (error) {
        showNotification(`Kayıt hatası: ${error.message}`, 'error');
    } else {
        DOM.authForm.classList.add('hidden');
        document.getElementById('user-email-confirm').textContent = email;
        document.getElementById('signup-success-message').classList.remove('hidden');
    }
    DOM.signupBtn.disabled = false;
    DOM.signupBtn.textContent = "Kayıt Ol";
}

async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    DOM.sendResetBtn.disabled = true;
    DOM.sendResetBtn.textContent = "Gönderiliyor...";
    const { error } = await resetPasswordForEmail(DOM.passwordResetForm['reset-email'].value);
    if (error) {
        showNotification(`Hata: ${error.message}`, 'error');
    } else {
        showNotification('Şifre sıfırlama linki e-postana gönderildi.', 'success');
        Modals.closeModal('password-reset-modal');
    }
    DOM.sendResetBtn.disabled = false;
    DOM.sendResetBtn.textContent = "Gönder";
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

    updateButton.disabled = true;
    updateButton.textContent = 'Güncelleniyor...';
    const { error } = await updateUserPassword(newPassword);
    if (error) {
        showNotification(`Hata: ${error.message}`, 'error');
    } else {
        showNotification('Şifreniz başarıyla güncellendi!', 'success');
        DOM.accountSettingsForm.reset();
    }
    updateButton.disabled = false;
    updateButton.textContent = 'Şifreyi Güncelle';
}

async function handleBetFormSubmitAttempt(e) {
    e.preventDefault();
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
}

async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const newBetData = {
        user_id: state.currentUser.id,
        platform: document.getElementById('quick-platform').value,
        bet_type: 'Spor Bahis',
        description: 'Hızlı bahis',
        bet_amount: parseFloat(document.getElementById('quick-amount').value),
        odds: parseFloat(document.getElementById('quick-odds').value),
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
        Modals.closeQuickAddModal();
        showNotification('🚀 Hızlı bahis eklendi!', 'success');
    }
}

async function handleSaveEditAttempt() {
    const bet = state.bets.find(b => b.id === state.editingBetId);
    if (!bet) return;

    const status = document.getElementById('edit-status').value;
    const winAmount = parseFloat(document.getElementById('edit-win-amount').value) || 0;
    
    let updateData = { status: status };
    if (status === 'won') {
        updateData.win_amount = winAmount;
        updateData.profit_loss = winAmount - bet.bet_amount;
    } else if (status === 'lost') {
        updateData.win_amount = 0;
        updateData.profit_loss = -bet.bet_amount;
    } else {
        updateData.win_amount = 0;
        updateData.profit_loss = 0;
    }

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi.', 'error');
    } else {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) state.bets[index] = data[0];
        updateAllUI();
        Modals.closeEditModal();
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

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin.', 'error');
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
        odds: 1,
        date: new Date().toISOString().split('T')[0],
        status: isDeposit ? 'won' : 'lost',
        win_amount: isDeposit ? amount : 0,
        profit_loss: profitLoss,
    };

    const { data, error } = await addBet(cashTransaction);
    if (error) {
        showNotification('Kasa işlemi kaydedilemedi.', 'error');
    } else {
        state.bets.unshift(data[0]);
        updateAllUI();
        Modals.closeCashTransactionModal();
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
                Modals.renderCustomPlatformsModal();
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
            Modals.renderCustomPlatformsModal();
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

async function analyzeBetSlipAttempt() {
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    const buttonText = document.getElementById('gemini-button-text');
    const buttonIcon = document.getElementById('gemini-button-icon');
    geminiButton.disabled = true;
    buttonText.textContent = 'Okunuyor...';
    buttonIcon.innerHTML = '🧠';
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
        showNotification('Kupon okunurken bir hata oluştu. Lütfen API anahtarınızı kontrol edin.', 'error');
    } finally {
        geminiButton.disabled = false;
        buttonText.textContent = 'Kuponu Oku';
        buttonIcon.innerHTML = '✨';
    }
}

export function setupAuthEventListeners() {
    DOM.loginBtn.addEventListener('click', handleLoginAttempt);
    DOM.signupBtn.addEventListener('click', handleSignUpAttempt);
    DOM.forgotPasswordLink.addEventListener('click', () => Modals.openModal('password-reset-modal'));
    DOM.cancelResetBtn.addEventListener('click', () => Modals.closeModal('password-reset-modal'));
    DOM.passwordResetForm.addEventListener('submit', handlePasswordResetAttempt);
}

export function setupEventListeners() {
    if (state.listenersAttached) return;

    // Filtreleme Dinleyicileri
    const historyFilters = [
        document.getElementById('start-date-filter'),
        document.getElementById('end-date-filter'),
        document.getElementById('platform-filter'),
        document.getElementById('status-filter'),
        document.getElementById('search-filter')
    ];
    historyFilters.forEach(filter => {
        if(filter) {
            const eventType = filter.id === 'search-filter' ? 'keyup' : 'change';
            filter.addEventListener(eventType, () => {
                updateState({ currentPage: 1 });
                renderHistory();
            });
        }
    });

    // Auth (Logout and Account Update)
    DOM.logoutBtn.addEventListener('click', () => signOut());
    DOM.accountSettingsForm.addEventListener('submit', handleUpdatePasswordAttempt);

    document.getElementById('edit-status').addEventListener('change', (e) => {
        const status = e.target.value;
        const winAmountSection = document.getElementById('win-amount-section');
        const winAmountInput = document.getElementById('edit-win-amount');
        const bet = state.currentlyEditingBet;

        if (status === 'won') {
            winAmountSection.classList.remove('hidden');
            if (bet) {
                const calculatedWin = bet.bet_amount * bet.odds;
                winAmountInput.value = calculatedWin.toFixed(2);
            }
        } else {
            winAmountSection.classList.add('hidden');
            winAmountInput.value = 0;
        }
    });

    // Sidebar and Navigation
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => showSection(item.dataset.section, item));
    });
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('mobile-menu-toggle').addEventListener('click', toggleMobileSidebar);

    // Form Submissions
    document.getElementById('bet-form').addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form').addEventListener('submit', handleQuickAddSubmitAttempt);

    // Genel tıklama yöneticisi (Event Delegation)
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const { action, id, name, page, src, range } = target.dataset;

        switch (action) {
            case 'open-edit-modal': Modals.openEditModal(parseInt(id)); break;
            case 'delete-bet': handleDeleteBetAttempt(parseInt(id)); break;
            case 'remove-platform': handleRemovePlatformAttempt(parseInt(id), name); break;
            case 'changeBetPage': changeBetPage(parseInt(page)); break;
            case 'changeCashPage': changeCashPage(parseInt(page)); break;
            case 'show-image-modal': Modals.showImageModal(src); break;
            case 'set-date-filter':
                setDateFilter(range);
                document.querySelectorAll('.date-filter-btn').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                break;
        }
    });
    
    // Diğer Butonlar
    document.getElementById('reset-form-btn').addEventListener('click', () => resetForm());
    document.getElementById('gemini-analyze-btn').addEventListener('click', analyzeBetSlipAttempt);
    document.getElementById('clear-all-settings-btn').addEventListener('click', handleClearAllDataAttempt);
    
    // Modal Butonları
    document.getElementById('floating-add-btn').addEventListener('click', Modals.openQuickAddModal);
    document.getElementById('quick-add-btn').addEventListener('click', Modals.openQuickAddModal);
    document.getElementById('cash-transaction-btn').addEventListener('click', Modals.openCashTransactionModal);
    document.getElementById('platform-manager-btn').addEventListener('click', Modals.openPlatformManager);
    document.getElementById('close-quick-add-btn').addEventListener('click', Modals.closeQuickAddModal);
    document.getElementById('close-edit-btn').addEventListener('click', Modals.closeEditModal);
    document.getElementById('save-edit-btn').addEventListener('click', handleSaveEditAttempt);
    document.getElementById('image-modal').addEventListener('click', Modals.closeImageModal);
    
    const setupImageUpload = (type) => {
        const prefix = type === 'main' ? '' : 'quick-';
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);
        selectBtn?.addEventListener('click', () => imageInput.click());
        imageInput?.addEventListener('change', (e) => handleImageFile(e.target.files[0], type));
        removeBtn?.addEventListener('click', () => removeImage(type));
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea?.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.toggle('dragover', eventName === 'dragover');
                if (eventName === 'drop') handleImageFile(e.dataTransfer.files[0], type);
            });
        });
    };
    setupImageUpload('main');
    setupImageUpload('quick');
    document.addEventListener('paste', e => {
        const file = Array.from(e.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (!file) return;
        const quickModalOpen = !document.getElementById('quick-add-modal').classList.contains('hidden');
        const type = quickModalOpen ? 'quick' : 'main';
        if (type === 'main' && state.currentSection !== 'new-bet') return;
        handleImageFile(file, type);
    });

    document.getElementById('add-platform-btn').addEventListener('click', () => handleAddPlatformAttempt(false));
    document.getElementById('add-platform-modal-btn').addEventListener('click', () => handleAddPlatformAttempt(true));
    document.getElementById('close-platform-manager-btn').addEventListener('click', Modals.closePlatformManager);
    
    document.getElementById('cash-transaction-close-btn').addEventListener('click', Modals.closeCashTransactionModal);
    document.getElementById('cash-deposit-btn').addEventListener('click', () => handleCashTransactionAttempt('deposit'));
    document.getElementById('cash-withdrawal-btn').addEventListener('click', () => handleCashTransactionAttempt('withdrawal'));

    updateState({ listenersAttached: true });
}

function setDateFilter(range) {
    const startDateInput = document.getElementById('start-date-filter');
    const endDateInput = document.getElementById('end-date-filter');
    const today = new Date();
    
    endDateInput.value = today.toISOString().split('T')[0];

    if (range === 'today') {
        startDateInput.value = today.toISOString().split('T')[0];
    } else if (range === 'last7') {
        const last7 = new Date();
        last7.setDate(today.getDate() - 6);
        startDateInput.value = last7.toISOString().split('T')[0];
    } else if (range === 'last30') {
        const last30 = new Date();
        last30.setDate(today.getDate() - 29);
        startDateInput.value = last30.toISOString().split('T')[0];
    } else if (range === 'all') {
        startDateInput.value = '';
        endDateInput.value = '';
    }

    updateState({ currentPage: 1 });
    renderHistory();
}
