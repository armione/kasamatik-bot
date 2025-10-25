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
    if (!authForm) return; // Form yoksa çık
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    const { error } = await signIn(authForm.email.value, authForm.password.value);
    if (error) {
        showNotification(`Giriş hatası: ${error.message}`, 'error');
    }
    setButtonLoading(loginBtn, false);
}

// GÖREV 0.1 DÜZELTMESİ: Kayıt fonksiyonu, mevcut e-posta adreslerini doğru bir şekilde ele alacak şekilde güncellendi.
async function handleSignUpAttempt() {
    console.log("handleSignUpAttempt çağrıldı.");
    const signupBtn = DOM.get('signupBtn');
    const authForm = DOM.get('authForm');
    if (!authForm) return; // Form yoksa çık
    setButtonLoading(signupBtn, true, 'Kayıt olunuyor...');
    const email = authForm.email.value;
    const password = authForm.password.value;

    // Hata Kontrolü: Şifre uzunluğu
    if (!password || password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
        setButtonLoading(signupBtn, false);
        return;
    }

    const { data, error } = await signUp(email, password);
    console.log("Supabase signUp sonucu:", { data, error });

    if (error) {
        console.log("Kayıt hatası yakalandı:", error.message);
        showNotification(`Kayıt hatası: ${error.message}`, 'error');
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log("Mevcut ama onaylanmamış e-posta durumu.");
        showNotification('Bu e-posta adresi zaten kayıtlı. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
    } else if (data.user) {
        console.log("Yeni kayıt başarılı.");
        authForm.classList.add('hidden');
        const userEmailConfirm = document.getElementById('user-email-confirm');
        if (userEmailConfirm) userEmailConfirm.textContent = email;
        const successMessage = document.getElementById('signup-success-message');
        if (successMessage) successMessage.classList.remove('hidden');
    } else {
        console.log("Beklenmeyen Supabase signUp cevabı:", data);
        showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
    setButtonLoading(signupBtn, false);
}

async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    const sendResetBtn = DOM.get('sendResetBtn');
    const passwordResetForm = DOM.get('passwordResetForm');
    if (!passwordResetForm) return; // Form yoksa çık
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

    // HATA DÜZELTME: Zorunlu alan kontrolü
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
        status: 'pending', // Özel oranlar her zaman 'pending' başlar
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

        // Arka planda play_count'u güncelle, hata olursa sadece logla
        updateSpecialOdd(odd.id, { play_count: (odd.play_count || 0) + 1 })
            .then(({ data: updatedOddData, error: updateError }) => {
                if (!updateError && updatedOddData && updatedOddData.length > 0) {
                    const index = state.specialOdds.findIndex(o => o.id === odd.id);
                    if (index > -1) state.specialOdds[index] = updatedOddData[0];
                    renderSpecialOddsPage(); // UI'ı güncelle
                } else if(updateError) {
                     console.error("Özel oran oynanma sayısı güncellenirken hata:", updateError);
                }
            });

        updateAllUI();
        closePlaySpecialOddModal();
        showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
    } else {
        showNotification('Fırsat eklendi ancak veri alınamadı.', 'warning');
        setButtonLoading(button, false); // Butonu tekrar aktif et
    }
    // Başarılı durumda buton zaten modal kapanınca resetlenir.
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
        bet_type: 'Spor Bahis', // Hızlı ekleme varsayılanı
        description: 'Hızlı bahis',
        bet_amount: amount,
        odds: odds,
        date: new Date().toISOString().split('T')[0], // Bugünün tarihi
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

async function handleSaveEditAttempt() {
    const bet = state.currentlyEditingBet;
    if (!bet) return;

    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const tagInput = document.getElementById('edit-tag');

    const status = statusSelect ? statusSelect.value : bet.status;
    const winAmount = winAmountInput ? parseFloat(winAmountInput.value) : 0;
    const tag = tagInput ? tagInput.value.trim() : bet.tag; // Mevcut etiketi koru veya yenisini al

    // HATA DÜZELTME: Durum 'won' ise kazanç miktarı girilmeli
    if (status === 'won' && (isNaN(winAmount) || winAmount <= 0)) {
         showNotification('Kazanan bahisler için geçerli bir Toplam Kazanç miktarı girmelisiniz (0\'dan büyük).', 'warning');
         return;
    }

    let updateData = {
        status: status,
        tag: tag || null // Boş etiket null olarak kaydedilsin
    };

    if (status === 'won') {
        updateData.win_amount = winAmount;
        // profit_loss hesaplaması: özel oran mı değil mi kontrol et
        const profit = bet.special_odd_id
            ? (bet.bet_amount * bet.odds) - bet.bet_amount // Özel oransa, oran üzerinden hesapla
            : winAmount - bet.bet_amount; // Normal bahisse, girilen kazançtan hesapla
        updateData.profit_loss = profit;
    } else if (status === 'lost') {
        updateData.win_amount = 0;
        updateData.profit_loss = -bet.bet_amount;
    } else if (status === 'refunded') {
        updateData.win_amount = 0; // İade ise kazanç 0
        updateData.profit_loss = 0; // İade ise kar/zarar 0
    } else { // pending
        updateData.win_amount = 0;
        updateData.profit_loss = 0;
    }

    const saveButton = document.getElementById('save-edit-btn');
    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
            state.bets[index] = data[0]; // Güncellenmiş bahsi state'e yansıt
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
    // Önce kullanıcıya onay sorusu göster
    const confirmation = confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmation) return; // Kullanıcı iptal ederse işlemi durdur

    const { error } = await deleteBet(betId);
    if (error) {
        showNotification('Kayıt silinemedi: ' + error.message, 'error');
    } else {
        // State'i güncelle: Silinen bahsi listeden çıkar
        updateState({ bets: state.bets.filter(b => b.id !== betId) });
        updateAllUI(); // Arayüzü yeniden çiz
        showNotification('🗑️ Kayıt silindi.', 'error'); // Bilgi mesajı göster (tip 'error' ama içerik bilgi)
    }
}

async function handleCashTransactionAttempt(type) {
    const amountInput = document.getElementById('cash-amount');
    const descriptionInput = document.getElementById('cash-description'); // GÖREV 3.3: Açıklama input'unu al
    const depositBtn = document.getElementById('cash-deposit-btn');
    const withdrawalBtn = document.getElementById('cash-withdrawal-btn');

    let amount = amountInput ? parseFloat(amountInput.value) : NaN;
    let description = descriptionInput ? descriptionInput.value.trim() : ''; // GÖREV 3.3: Açıklamayı al

    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin (0\'dan büyük).', 'error');
        return;
    }

    const isDeposit = type === 'deposit';
    const profitLoss = isDeposit ? amount : -amount;

    // GÖREV 3.3: Açıklama boşsa varsayılanı kullan
    if (!description) {
        description = isDeposit ? 'Para Ekleme' : 'Para Çekme';
    }

    const cashTransaction = {
        user_id: state.currentUser.id,
        platform: 'Kasa İşlemi', // Sabit platform adı
        bet_type: 'Kasa İşlemi', // Sabit bahis türü
        description: description, // GÖREV 3.3: Kullanıcının girdiği veya varsayılan açıklama
        bet_amount: Math.abs(amount), // Her zaman pozitif miktar
        odds: 1, // Kasa işlemi için oran 1
        date: new Date().toISOString().split('T')[0], // Bugünün tarihi
        status: isDeposit ? 'won' : 'lost', // Teknik olarak durumu belirtir
        win_amount: isDeposit ? amount : 0, // Yatırmada kazanç miktarı
        profit_loss: profitLoss, // Kasa hareketini yansıtır
    };

    // İlgili butonu yükleme durumuna al
    const currentBtn = isDeposit ? depositBtn : withdrawalBtn;
    setButtonLoading(currentBtn, true, 'Kaydediliyor...');

    const { data, error } = await addBet(cashTransaction);
    if (error) {
        showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]); // Yeni işlemi listenin başına ekle
        updateAllUI();
        closeCashTransactionModal(); // Modalı kapat ve alanları temizle
        showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
    } else {
        showNotification('Kasa işlemi eklendi ancak veri alınamadı.', 'warning');
    }

    // Butonu normal durumuna döndür
    setButtonLoading(depositBtn, false);
    setButtonLoading(withdrawalBtn, false);
}

async function handleAddPlatformAttempt(fromModal = false) {
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const input = document.getElementById(inputId);
    const name = input ? input.value.trim() : '';

    // Platform adı boş olamaz
    if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
        return;
    }

    // Varsayılan ve özel platformları birleştir, küçük harfe çevirerek kontrol et
    const allPlatformsLower = [
        ...DEFAULT_PLATFORMS.map(p => p.toLowerCase()),
        ...state.customPlatforms.map(p => p.name.toLowerCase())
    ];

    // Platform zaten mevcut mu kontrol et
    if (allPlatformsLower.includes(name.toLowerCase())) {
        showNotification('Bu platform zaten mevcut.', 'warning');
        return;
    }

    const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
    if (error) {
        showNotification('Platform eklenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.customPlatforms.push(data[0]); // Yeni platformu state'e ekle
        if (input) input.value = ''; // Input alanını temizle

        // Arayüzleri güncelle
        if (fromModal) {
            renderCustomPlatformsModal(); // Modal içindeki listeyi güncelle
        } else {
            renderCustomPlatforms(); // Ayarlar sayfasındaki listeyi güncelle
        }
        populatePlatformOptions(); // Tüm platform select dropdown'larını güncelle

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
        // State'i güncelle: Silinen platformu listeden çıkar
        updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });

        // Arayüzleri güncelle
        renderCustomPlatforms(); // Ayarlar sayfasındaki listeyi güncelle
        renderCustomPlatformsModal(); // Modal içindeki listeyi güncelle
        populatePlatformOptions(); // Tüm platform select dropdown'larını güncelle

        showNotification(`🗑️ "${platformName}" platformu silindi`, 'error');
    }
}

async function handleClearAllDataAttempt() {
    const confirmation = confirm('DİKKAT! TÜM KİŞİSEL VERİLERİNİZİ (BAHİS KAYITLARI, ÖZEL PLATFORMLAR) KALICI OLARAK SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!');
    if (!confirmation) return;

    // Butonu yükleme durumuna al (her iki sayfada da olabilir)
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
        // State'i sıfırla
        updateState({ bets: [], customPlatforms: [] });
        // Arayüzü güncelle
        updateAllUI();
        populatePlatformOptions();
        renderCustomPlatforms();
        renderCustomPlatformsModal(); // Platform modalını da güncelle
        showNotification('🗑️ Tüm kişisel verileriniz başarıyla silindi!', 'error');
    }

    // Butonları normal durumuna döndür
    if (clearBtn1) setButtonLoading(clearBtn1, false);
    if (clearBtn2) setButtonLoading(clearBtn2, false);
}

async function handleUserAnalyzeBetSlip() {
    // HATA DÜZELTME: Doğru state değişkenini kontrol et
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Kasamatik AI Okuyor...'); // Metin güncellendi

    try {
        const base64Data = state.currentImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);

        if (result) {
            // Sonuçları ilgili alanlara doldur
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
            // API'den beklenen formatta cevap gelmezse
            throw new Error("API'den geçerli bir sonuç alınamadı veya sonuç boş.");
        }
    } catch (error) {
        console.error('Kupon okuma (Gemini API) Hatası:', error);
        showNotification(`Kupon okunurken bir hata oluştu: ${error.message}`, 'error');
    } finally {
        setButtonLoading(geminiButton, false); // Butonu her durumda normale döndür
    }
}

async function handleAdminAnalyzeBetSlip() {
    if (!state.adminImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('admin-gemini-analyze-btn');
    setButtonLoading(geminiButton, true, 'Kasamatik AI Okuyor...'); // Metin güncellendi

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

// GÖREV 1.4: Panodan resim yapıştırma işleyicisi
async function handlePasteFromClipboard(type) {
    try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            showNotification('Tarayıcınız panodan okumayı desteklemiyor.', 'warning');
            return;
        }

        showNotification('📋 Pano okunuyor...', 'info', 2000); // Kullanıcıya geri bildirim
        const items = await navigator.clipboard.read();
        let imageBlob = null;

        // Panodaki öğeleri dolaşarak bir resim bulmaya çalış
        for (const item of items) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                imageBlob = await item.getType(imageType);
                break; // İlk bulunan resmi al ve döngüden çık
            }
        }

        if (imageBlob) {
            // Blob'u File objesine çevir (handleImageFile bunu bekliyor)
            const fileName = `pasted-image-${Date.now()}.png`; // Benzersiz dosya adı
            const file = new File([imageBlob], fileName, { type: imageBlob.type });
            handleImageFile(file, type); // ui_helpers'dan gelen fonksiyonu çağır
            showNotification('✅ Resim panodan başarıyla yapıştırıldı!', 'success');
        } else {
            showNotification('Panoda yapıştırılacak bir resim bulunamadı.', 'warning');
        }
    } catch (err) {
        console.error('Panodan yapıştırma hatası:', err);
        // İzin hatalarını veya diğer sorunları kullanıcıya bildir
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message.includes('permission')) {
             showNotification('Panodan okuma izni gerekli. Tarayıcı ayarlarınızı kontrol edin.', 'error');
        } else if (err.name === 'NotFoundError') {
             showNotification('Panoda okunacak veri bulunamadı.', 'warning');
        }
         else {
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

    // HATA DÜZELTME: Zorunlu alan kontrolü
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
        max_bet_amount: maxBetAmount, // null veya geçerli sayı
        primary_link_text: document.getElementById('special-odd-primary-link-text')?.value || null,
        primary_link_url: document.getElementById('special-odd-primary-link-url')?.value || null,
        secondary_link_text: document.getElementById('special-odd-secondary-link-text')?.value || null,
        secondary_link_url: document.getElementById('special-odd-secondary-link-url')?.value || null,
        status: 'pending' // Yeni fırsatlar her zaman bekleyen başlar
    };

    const { data, error } = await addSpecialOdd(oddData);
    if (error) {
        showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
    } else if (data && data.length > 0){
        state.specialOdds.unshift(data[0]); // Yeni fırsatı listenin başına ekle
        renderActiveSpecialOdds(); // Admin panelindeki listeyi güncelle
        renderSpecialOddsPage(); // Fırsatlar sayfasını güncelle
        form.reset(); // Formu temizle
        removeImage('admin'); // Admin resim önizlemesini kaldır
        showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
    } else {
         showNotification('Fırsat yayınlandı ancak veri alınamadı.', 'warning');
    }
    setButtonLoading(button, false);
}


async function handleResolveSpecialOdd(id, status) {
    const confirmation = confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir.`);
    if (!confirmation) return;

    // İlgili butonu bul ve yükleme durumuna al (event delegation'dan dolayı biraz dolaylı)
    const button = document.querySelector(`button[data-action="resolve-special-odd"][data-id="${id}"][data-status="${status}"]`);
    if (button) setButtonLoading(button, true);

    const { data, error } = await updateSpecialOdd(id, { status: status }); // status'u gönder
    if(error) {
        showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        const index = state.specialOdds.findIndex(o => o.id === parseInt(id));
        if(index > -1) {
            state.specialOdds[index] = data[0]; // State'i güncelle
        }
        renderActiveSpecialOdds(); // Admin panelindeki listeyi güncelle
        renderSpecialOddsPage(); // Fırsatlar sayfasını güncelle
        updateAllUI(); // Genel UI güncellemesi (özellikle bahis geçmişi için)
        showNotification(`Fırsat durumu "${status.toUpperCase()}" olarak güncellendi!`, 'info');
    } else {
        showNotification('Fırsat güncellendi ancak veri alınamadı.', 'warning');
    }

    // Tüm çözümle butonlarını normale döndür (hangisine basıldığını spesifik tutmak zor)
    document.querySelectorAll(`button[data-action="resolve-special-odd"][data-id="${id}"]`).forEach(btn => {
         setButtonLoading(btn, false);
    });
}

// EVENT LISTENER SETUP
export function setupEventListeners() {
    // Mevcut listener'lar varsa temizle (tekrarlı eklemeyi önlemek için)
    // Bu kısım UI güncellemeleri sonrası butonların çalışmama sorununu çözebilir
    const oldBody = document.body;
    const newBody = oldBody.cloneNode(true);
    oldBody.parentNode.replaceChild(newBody, oldBody);
    state.listenersAttached = false; // Tekrar bağlanacağını belirt

    // Şimdi listener'ları yeniden ekle
    if (state.listenersAttached) return;

    console.log("setupEventListeners çağrılıyor.");

    // Tüm butonlara varsayılan metni data attribute olarak ekle
    document.querySelectorAll('button').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement && !button.dataset.defaultText) { // Sadece yoksa ekle
            button.dataset.defaultText = textElement.textContent;
        }
    });

    // Auth
    DOM.get('loginBtn')?.addEventListener('click', handleLoginAttempt);
    DOM.get('signupBtn')?.addEventListener('click', handleSignUpAttempt);
    DOM.get('logoutBtn')?.addEventListener('click', () => signOut().catch(err => console.error("Çıkış hatası:", err))); // Çıkışta hata olursa yakala

    const forgotPasswordLink = DOM.get('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Şifremi Unuttum tıklandı.");
            openModal('password-reset-modal');
        });
    }

    DOM.get('cancelResetBtn')?.addEventListener('click', () => closeModal('password-reset-modal'));
    DOM.get('passwordResetForm')?.addEventListener('submit', handlePasswordResetAttempt);
    DOM.get('accountSettingsForm')?.addEventListener('submit', handleUpdatePasswordAttempt);

    // Sidebar and Navigation
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
             // Tıklanan öğenin kendisini ve section adını al
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

    // Clicks on dynamically generated content (Event Delegation - Ana gövdeye bağla)
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]'); // data-action içeren en yakın parent'ı bul
        if (!target) return; // Eğer tıklanan yer veya parent'ı data-action içermiyorsa çık

        // Tıklanan elementin data attribute'larını al
        const action = target.dataset.action;
        const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;
        const name = target.dataset.name;
        const page = target.dataset.page ? parseInt(target.dataset.page, 10) : null;
        const src = target.dataset.src;
        const period = target.dataset.period;
        const status = target.dataset.status;
        const section = target.dataset.section; // Dashboard'daki "Tümünü Gör" butonu için

        console.log("data-action tıklandı:", { action, id, name, page, src, period, status, section }); // Tıklamayı logla

        // Aksiyona göre ilgili fonksiyonu çağır
        switch (action) {
            case 'open-edit-modal':
                if (id !== null) {
                    console.log(`openEditModal çağrılıyor - ID: ${id}`); // Log eklendi
                    openEditModal(id);
                }
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
                         updatePerformanceSummary(); // Sadece performans özetini güncelle
                    }
                }
                break;
            case 'set-history-period':
                 if (period !== undefined) {
                    updateState({ filters: { ...state.filters, period: period === 'all' ? 'all' : parseInt(period, 10) }, currentPage: 1 });
                    // Aktif butonu güncelle
                    document.querySelectorAll('#history-period-buttons .period-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.period === period);
                    });
                    renderHistory(); // Geçmişi yeniden render et
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
                    import('./admin_actions.js').then(module => module.handleDeleteSponsor(id, name)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
            case 'delete-ad':
                if (id !== null) {
                    import('./admin_actions.js').then(module => module.handleDeleteAd(id)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
             case 'navigate-section': // Dashboard'daki "Tümünü Gör" için
                 if (section) {
                    const targetSidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
                    if (targetSidebarItem) {
                        showSection(section, targetSidebarItem);
                    }
                 }
                 break;
        }
    });

    // Fırsatı Oyna Modal (Modal'ın kendisine listener ekle)
    const specialOddModal = document.getElementById('special-odd-modal');
    specialOddModal?.addEventListener('click', (e) => {
        if (e.target.id === 'close-play-special-odd-modal') {
            closePlaySpecialOddModal();
        }
        // Butonun kendisi veya içindeki span ise (loader/text)
        if (e.target.closest('#confirm-play-special-odd')) {
             handlePlaySpecialOdd(document.getElementById('confirm-play-special-odd'));
        }
    });

    // Edit Modal (Modal'ın kendisine listener ekle)
    const editModal = document.getElementById('edit-modal');
    editModal?.addEventListener('click', (e) => {
        if (e.target.id === 'close-edit-btn') {
            closeEditModal();
        }
         // Butonun kendisi veya içindeki span ise (loader/text)
        if (e.target.closest('#save-edit-btn')) {
            handleSaveEditAttempt();
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
        }, 300); // 300ms bekleme süresi
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
        updateState({ statsFilters: { dateRange: { start: null, end: null } } }); // State'i güncelle
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if(datePicker) datePicker.clear();
        updateStatisticsPage(); // İstatistikleri yeniden hesapla ve çiz
        updateCharts(); // Grafikleri de güncelle
    });

    // Diğer UI etkileşimleri
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm());
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip);
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip);

    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt);
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt);

    // Modals (Açma Butonları)
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal);
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager);

    // Modals (Kapatma Butonları - closeModal içinde handle ediliyor genelde)
    document.getElementById('close-quick-add-btn')?.addEventListener('click', closeQuickAddModal);
    // document.getElementById('close-edit-btn') -> Modal içindeki listener ile handle ediliyor
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal); // Resme tıklayınca kapatma
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);

    // Image Upload (Setup Fonksiyonu)
    const setupImageUpload = (type) => {
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);
        const pasteBtn = document.getElementById(`${prefix}paste-image-btn`); // Panodan yapıştır butonu

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) return;

        selectBtn.addEventListener('click', () => imageInput.click());
        // Panodan yapıştır butonu varsa listener ekle
        if (pasteBtn) pasteBtn.addEventListener('click', () => handlePasteFromClipboard(type));
        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                 handleImageFile(e.target.files[0], type);
            }
        });
        removeBtn.addEventListener('click', () => removeImage(type));

        // Sürükle-Bırak Alanı
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
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

    // Genel Yapıştırma Olayı (document seviyesinde)
    document.addEventListener('paste', e => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;

            // Yapıştırılan öğeler arasında bir resim dosyası ara
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return; // Resim yoksa çık

            // Hangi yükleme alanının aktif olduğunu belirle
            let activeType = null;
            const quickAddModal = document.getElementById('quick-add-modal');
            const specialOddForm = document.getElementById('special-odd-form'); // Admin panelindeki form

            if (state.currentSection === 'new-bet') {
                 activeType = 'main';
            } else if (quickAddModal && !quickAddModal.classList.contains('hidden')) {
                activeType = 'quick';
            } else if (state.currentSection === 'settings' && specialOddForm && state.currentUser?.id === ADMIN_USER_ID) {
                 // Sadece admin ise ve ayarlar sayfasındaysa admin yapıştırmasını kabul et
                 activeType = 'admin';
            }

            // Eğer uygun bir yükleme alanı aktifse, resmi işle
            if (activeType) {
                handleImageFile(file, activeType);
                 showNotification('📋 Resim panodan yapıştırıldı!', 'success');
                 e.preventDefault(); // Tarayıcının varsayılan yapıştırma işlemini engelle
            }
        } catch (pasteError) {
             console.error("Genel yapıştırma hatası:", pasteError);
             showNotification('Resim yapıştırılırken bir hata oluştu.', 'error');
        }
    });

    // Platform Management
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false));
    document.getElementById('add-platform-modal-btn')?.addEventListener('click', () => handleAddPlatformAttempt(true));
    document.getElementById('close-platform-manager-btn')?.addEventListener('click', closePlatformManager);

    // Cash Management (Modal içindeki butonlar)
    const cashModal = document.getElementById('cash-transaction-modal');
    cashModal?.addEventListener('click', (e) => {
         if (e.target.id === 'cash-transaction-close-btn') {
            closeCashTransactionModal();
        } else if (e.target.closest('#cash-deposit-btn')) {
             handleCashTransactionAttempt('deposit');
        } else if (e.target.closest('#cash-withdrawal-btn')) {
             handleCashTransactionAttempt('withdrawal');
        }
    });

    // Dinamik admin eylemleri için modül yükleme
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

