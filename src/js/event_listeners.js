import { state, updateState, applyFilters } from './state.js';
import { DOM, DEFAULT_PLATFORMS } from './utils/constants.js';
import { showNotification } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSponsor, deleteSponsor, addAd, deleteAd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { renderHistory, changeBetPage, changeCashPage } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderAdminPanels } from './components/ui_helpers.js';
import * as Modals from './components/modals.js';
import { renderStatistics } from './components/statistics.js'; // GÜNCELLEME: updateStatisticsPage -> renderStatistics

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
    const bet = state.currentlyEditingBet;
    if (!bet) return;

    const newStatus = document.getElementById('edit-status').value;
    const newAmount = parseFloat(document.getElementById('edit-bet-amount').value);
    const newOdds = parseFloat(document.getElementById('edit-odds').value);
    const newWinAmount = parseFloat(document.getElementById('edit-win-amount').value) || 0;
    
    let updateData = {
        platform: document.getElementById('edit-platform').value,
        description: document.getElementById('edit-description').value,
        bet_amount: newAmount,
        odds: newOdds,
        date: document.getElementById('edit-date').value,
        status: newStatus,
    };
    
    if (newStatus === 'won') {
        updateData.win_amount = newWinAmount;
        updateData.profit_loss = newWinAmount - newAmount;
    } else if (newStatus === 'lost') {
        updateData.win_amount = 0;
        updateData.profit_loss = -newAmount;
    } else { // pending
        updateData.win_amount = 0;
        updateData.profit_loss = 0;
    }

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi: ' + error.message, 'error');
    } else {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) state.bets[index] = data[0];
        updateAllUI();
        Modals.closeEditModal();
        showNotification('✔️ Bahis başarıyla güncellendi!', 'info');
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
            populatePlatformOptions(); 
            if (fromModal) {
                Modals.renderCustomPlatformsModal();
            } else {
                renderCustomPlatforms();
            }
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
            populatePlatformOptions();
            renderCustomPlatforms();
            Modals.renderCustomPlatformsModal();
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

async function handleSponsorFormSubmit(e) {
    e.preventDefault();
    const sponsorData = {
        name: document.getElementById('sponsor-name').value,
        logo_url: document.getElementById('sponsor-logo-url').value,
        target_url: document.getElementById('sponsor-target-url').value,
    };
    const { data, error } = await addSponsor(sponsorData);
    if (error) {
        showNotification('Sponsor eklenemedi.', 'error');
    } else {
        state.sponsors.unshift(data[0]);
        renderAdminPanels();
        e.target.reset();
        showNotification('Sponsor eklendi!', 'success');
    }
}

async function handleDeleteSponsor(sponsorId) {
    if (confirm('Bu sponsoru silmek istediğinizden emin misiniz?')) {
        const { error } = await deleteSponsor(sponsorId);
        if (error) {
            showNotification('Sponsor silinemedi.', 'error');
        } else {
            updateState({ sponsors: state.sponsors.filter(s => s.id !== sponsorId) });
            renderAdminPanels();
            showNotification('Sponsor silindi.', 'info');
        }
    }
}

async function handleAdFormSubmit(e) {
    e.preventDefault();
    const adData = {
        image_url: document.getElementById('ad-image-url').value,
        target_url: document.getElementById('ad-target-url').value,
        location: document.getElementById('ad-location').value,
    };
    const { data, error } = await addAd(adData);
    if (error) {
        showNotification('Reklam eklenemedi.', 'error');
    } else {
        state.ads.unshift(data[0]);
        renderAdminPanels();
        e.target.reset();
        showNotification('Reklam eklendi!', 'success');
    }
}

async function handleDeleteAd(adId) {
    if (confirm('Bu reklamı silmek istediğinizden emin misiniz?')) {
        const { error } = await deleteAd(adId);
        if (error) {
            showNotification('Reklam silinemedi.', 'error');
        } else {
            updateState({ ads: state.ads.filter(ad => ad.id !== adId) });
            renderAdminPanels();
            showNotification('Reklam silindi.', 'info');
        }
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
    const filterInputs = {
        'start-date-filter': 'historyStartDate',
        'end-date-filter': 'historyEndDate',
        'platform-filter': 'historyPlatform',
        'status-filter': 'historyStatus',
        'search-filter': 'historySearch'
    };

    Object.entries(filterInputs).forEach(([id, stateKey]) => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = id === 'search-filter' ? 'input' : 'change';
            element.addEventListener(eventType, (e) => {
                updateState({ [stateKey]: e.target.value, currentPage: 1 });
                renderHistory();
            });
        }
    });
    
    // Auth (Logout and Account Update)
    DOM.logoutBtn.addEventListener('click', () => {
        signOut();
        updateState({ appInitialized: false });
    });
    DOM.accountSettingsForm.addEventListener('submit', handleUpdatePasswordAttempt);

    // Edit Modal Status Change
    document.getElementById('edit-status').addEventListener('change', (e) => {
        const status = e.target.value;
        const winAmountSection = document.getElementById('edit-win-amount-section');
        const winAmountInput = document.getElementById('edit-win-amount');
        const bet = state.currentlyEditingBet;

        if (status === 'won') {
            winAmountSection.classList.remove('hidden');
            if (bet) {
                const betAmount = parseFloat(document.getElementById('edit-bet-amount').value) || 0;
                const odds = parseFloat(document.getElementById('edit-odds').value) || 0;
                const calculatedWin = betAmount * odds;
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
    document.getElementById('show-history-btn').addEventListener('click', () => {
        const historyNavItem = document.querySelector('.sidebar-item[data-section="history"]');
        showSection('history', historyNavItem);
    });

    // Form Submissions
    document.getElementById('bet-form').addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form').addEventListener('submit', handleQuickAddSubmitAttempt);
    DOM.sponsorForm.addEventListener('submit', handleSponsorFormSubmit);
    DOM.adForm.addEventListener('submit', handleAdFormSubmit);
    
    // Genel tıklama yöneticisi (Event Delegation)
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const { action, id, name, page, src, range } = target.dataset;
        const parsedId = id ? parseInt(id, 10) : null;

        switch (action) {
            case 'open-edit-modal': Modals.openEditModal(parsedId); break;
            case 'delete-bet': handleDeleteBetAttempt(parsedId); break;
            case 'remove-platform': handleRemovePlatformAttempt(parsedId, name); break;
            case 'delete-sponsor': handleDeleteSponsor(parsedId); break;
            case 'delete-ad': handleDeleteAd(parsedId); break;
            case 'changeBetPage': changeBetPage(parseInt(page)); break;
            case 'changeCashPage': changeCashPage(parseInt(page)); break;
            case 'show-image-modal': Modals.showImageModal(src); break;
            case 'set-date-filter':
                setDateFilter(range, 'history');
                document.querySelectorAll('.date-filter-btn').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                break;
            case 'set-stats-date-filter':
                setDateFilter(range, 'stats');
                document.querySelectorAll('.stats-date-filter-btn').forEach(btn => btn.classList.remove('active'));
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
    document.getElementById('close-ad-popup-btn').addEventListener('click', Modals.closeAdPopup);
    
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
    
    // Stats Date Filters
    const statsStartDate = document.getElementById('stats-start-date-filter');
    const statsEndDate = document.getElementById('stats-end-date-filter');

    statsStartDate.addEventListener('change', () => {
        updateState({ statsStartDate: statsStartDate.value });
        renderStatistics(); // GÜNCELLEME: updateStatisticsPage -> renderStatistics
    });
    statsEndDate.addEventListener('change', () => {
        updateState({ statsEndDate: statsEndDate.value });
        renderStatistics(); // GÜNCELLEME: updateStatisticsPage -> renderStatistics
    });

    updateState({ listenersAttached: true });
}

function setDateFilter(range, type) {
    const isStats = type === 'stats';
    const startDateKey = isStats ? 'statsStartDate' : 'historyStartDate';
    const endDateKey = isStats ? 'statsEndDate' : 'historyEndDate';
    const startDateInput = document.getElementById(isStats ? 'stats-start-date-filter' : 'start-date-filter');
    const endDateInput = document.getElementById(isStats ? 'stats-end-date-filter' : 'end-date-filter');
    
    const today = new Date();
    let startDate = new Date();
    
    if (range === 'today') {
        // startDate is already today
    } else if (range === 'last7') {
        startDate.setDate(today.getDate() - 6);
    } else if (range === 'last30') {
        startDate.setDate(today.getDate() - 29);
    } else if (range === 'all') {
        startDateInput.value = '';
        endDateInput.value = '';
        updateState({ [startDateKey]: '', [endDateKey]: '' });
        
        if (isStats) {
            renderStatistics(); // GÜNCELLEME: updateStatisticsPage -> renderStatistics
        } else {
            renderHistory();
        }
        return;
    }

    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = today.toISOString().split('T')[0];

    startDateInput.value = formattedStartDate;
    endDateInput.value = formattedEndDate;
    
    updateState({
        [startDateKey]: formattedStartDate,
        [endDateKey]: formattedEndDate
    });

    if (isStats) {
        renderStatistics(); // GÜNCELLEME: updateStatisticsPage -> renderStatistics
    } else {
        updateState({ currentPage: 1 });
        renderHistory();
    }
}
