import { state, updateState } from './state.js';
import { closeImportModal } from './components/modals.js';
import { DOM, DEFAULT_PLATFORMS } from './utils/constants.js'; // ADMIN_USER_ID importu kaldırıldı (Görev 1 iptal edildiği için geri geldi)
import { showNotification, setButtonLoading, calculateProfitLoss } from './utils/helpers.js';
import { signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword } from './api/auth.js';
import { addBet, updateBet, deleteBet, addPlatform, deletePlatform, clearAllBetsForUser, clearAllPlatformsForUser, addSpecialOdd, updateSpecialOdd } from './api/database.js';
import { analyzeBetSlipApi } from './api/gemini.js';
import { updateAllUI } from './main.js';
import { changeBetPage, changeCashPage, renderHistory } from './components/history.js';
import { showSection, toggleSidebar, toggleMobileSidebar, populatePlatformOptions, renderCustomPlatforms, resetForm, handleImageFile, removeImage, renderActiveSpecialOdds, renderSpecialOddsPage } from './components/ui_helpers.js';
// GÖREV 5: openImportModal ve closeImportModal import edildi
import { openModal, closeModal, openPlatformManager, closePlatformManager, openCashTransactionModal, closeCashTransactionModal, openQuickAddModal, closeQuickAddModal, openEditModal, closeEditModal, openResolveModal, closeResolveModal, openPlaySpecialOddModal, closePlaySpecialOddModal, showImageModal, closeImageModal, closeAdPopup, renderCustomPlatformsModal, openImportModal, closeImportModal } from './components/modals.js';
import { updateStatisticsPage } from './components/statistics.js';
import { updatePerformanceSummary } from './components/dashboard.js';
// ADMIN_USER_ID importu Görev 1 iptal edildiği için geri eklendi
import { ADMIN_USER_ID } from './utils/constants.js';


let searchDebounceTimer;

// HANDLER FUNCTIONS (OLAY YÖNETİCİLERİ)

async function handleLoginAttempt() {
    const loginBtn = document.getElementById('login-btn'); // DOM.get kullanımı yerine ID ile direkt erişim
    const authForm = document.getElementById('auth-form');
    if (!authForm) return;
    setButtonLoading(loginBtn, true, 'Giriş yapılıyor...');
    const email = authForm.email.value;
    const password = authForm.password.value;
    const { error } = await signIn(email, password);
    if (error) {
        showNotification(`Giriş hatası: ${error.message}`, 'error');
    }
    // Başarılı girişte state değişimi zaten handleAuthStateChange'de ele alınır.
    // Başarısız olsa bile butonu normale döndür
    setButtonLoading(loginBtn, false);
}

async function handleSignUpAttempt() {
    const signupBtn = document.getElementById('signup-btn');
    const authForm = document.getElementById('auth-form');
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
        // Kullanıcı zaten var ama doğrulanmamış olabilir veya başka bir sorun
        showNotification('Bu e-posta adresi zaten kayıtlı veya bir sorun oluştu. Lütfen e-postanızı kontrol edin veya şifrenizi sıfırlayın.', 'warning');
    } else if (data.user) {
        // Kayıt başarılı, doğrulama e-postası gönderildi
        authForm.classList.add('hidden');
        const userEmailConfirm = document.getElementById('user-email-confirm');
        if (userEmailConfirm) userEmailConfirm.textContent = email;
        const successMessage = document.getElementById('signup-success-message');
        if (successMessage) successMessage.classList.remove('hidden');
        showNotification('Kayıt başarılı! Lütfen e-postanızı kontrol ederek hesabınızı doğrulayın.', 'success'); // Ek bildirim
    } else {
        // Beklenmeyen durum
        showNotification('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
    setButtonLoading(signupBtn, false);
}

async function handlePasswordResetAttempt(e) {
    e.preventDefault();
    const sendResetBtn = document.getElementById('send-reset-btn');
    const passwordResetForm = document.getElementById('password-reset-form');
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
        // Formu sıfırla
        const form = document.getElementById('account-settings-form');
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

    // Doğrulamalar
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
        description: document.getElementById('description')?.value || null, // Boşsa null gönder
        bet_amount: betAmount,
        odds: odds,
        date: date,
        status: 'pending',
        win_amount: 0, // Başlangıçta 0
        profit_loss: 0 // Başlangıçta 0
        // tag: null // Başlangıçta etiket yok
    };

    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Bahis eklenirken hata oluştu: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        // Yeni bahsi state'in başına ekle
        state.bets.unshift(data[0]);
        // Tüm arayüzü güncelle
        updateAllUI();
        // Formu sıfırla
        resetForm(); // Ana formu sıfırlar
        showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
    } else {
         showNotification('Bahis eklendi ancak veri alınamadı. Sayfayı yenileyin.', 'warning');
    }
    setButtonLoading(addButton, false);
}

async function handlePlaySpecialOdd(button) {
    const amountInput = document.getElementById('special-odd-bet-amount');
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
    const odd = state.playingSpecialOdd; // Oynanacak fırsat state'den alınır

    // Doğrulamalar
    if (!odd) {
        showNotification('Oynanacak fırsat bulunamadı.', 'error');
        return;
    }
     if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin.', 'warning');
        return;
    }
    if (odd.max_bet_amount && amount > odd.max_bet_amount) {
        showNotification(`Maksimum bahis limitini (${odd.max_bet_amount} ₺) aştınız.`, 'error');
        return;
    }

    setButtonLoading(button, true, 'Ekleniyor...');

    // Yeni bahis verisini oluştur
    const newBetData = {
        user_id: state.currentUser.id,
        platform: odd.platform,
        bet_type: 'Özel Oran', // Bet tipini 'Özel Oran' olarak ayarla
        description: odd.description,
        bet_amount: amount,
        odds: odd.odds,
        date: new Date().toISOString().split('T')[0], // Bugünün tarihi
        status: 'pending', // Başlangıçta bekleyen
        win_amount: 0,
        profit_loss: 0,
        special_odd_id: odd.id // İlişkili özel oran ID'sini ekle
    };

    // Bahsi veritabanına ekle
    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Fırsat oynanırken bir hata oluştu: ' + error.message, 'error');
        setButtonLoading(button, false);
    } else if (data && data.length > 0) {
        // Yeni bahsi state'in başına ekle
        state.bets.unshift(data[0]);

        // Arka planda özel oranın play_count'unu güncelle (hata olsa bile devam et)
        const newPlayCount = (odd.play_count || 0) + 1;
        updateSpecialOdd(odd.id, { play_count: newPlayCount })
            .then(({ data: updatedOddData, error: updateError }) => {
                if (!updateError && updatedOddData && updatedOddData.length > 0) {
                    // State'deki özel oranı da güncelle (Realtime beklememek için)
                    const index = state.specialOdds.findIndex(o => o.id === odd.id);
                    if (index > -1) {
                         // Sadece play_count'u değil, dönen tüm güncel veriyi alalım
                         state.specialOdds[index] = updatedOddData[0];
                    }
                    // Fırsatlar sayfasını (eğer açıksa) yeniden render et
                    if (state.currentSection === 'special-odds-page') {
                        renderSpecialOddsPage();
                    }
                     // Admin panelindeki aktif fırsatlar listesini güncelle
                    if (state.currentUser.id === ADMIN_USER_ID) {
                         renderActiveSpecialOdds();
                    }

                } else if(updateError) {
                     console.error("Özel oran oynanma sayısı güncellenirken hata:", updateError);
                     // Kullanıcıya bildirim gösterilebilir (opsiyonel)
                     // showNotification("Oynanma sayısı güncellenemedi.", "warning");
                }
            });

        // Tüm arayüzü güncelle
        updateAllUI();
        // Modalı kapat
        closePlaySpecialOddModal();
        showNotification('✨ Fırsat başarıyla kasana eklendi!', 'success');
        // Butonu normale döndürmeye gerek yok, modal kapanıyor.
    } else {
        showNotification('Fırsat eklendi ancak veri alınamadı.', 'warning');
        setButtonLoading(button, false);
    }
    // Hata durumunda veya veri gelmezse butonu normale döndür
    // setButtonLoading(button, false); // Bu satır `else` bloğuna taşındı.
}


async function handleQuickAddSubmitAttempt(e) {
    e.preventDefault();
    const platformSelect = document.getElementById('quick-platform');
    const amountInput = document.getElementById('quick-amount');
    const oddsInput = document.getElementById('quick-odds');

    const platform = platformSelect ? platformSelect.value : '';
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
    const odds = oddsInput ? parseFloat(oddsInput.value) : NaN;

    // Doğrulamalar
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

    // Yeni bahis verisi (hızlı ekleme varsayılanları ile)
    const newBetData = {
        user_id: state.currentUser.id,
        platform: platform,
        bet_type: 'Spor Bahis', // Varsayılan
        description: 'Hızlı bahis', // Varsayılan açıklama
        bet_amount: amount,
        odds: odds,
        date: new Date().toISOString().split('T')[0], // Bugünün tarihi
        status: 'pending',
        win_amount: 0,
        profit_loss: 0
    };

    const submitButton = e.target.querySelector('button[type="submit"]'); // Form içindeki submit butonu
    setButtonLoading(submitButton, true, 'Ekleniyor...');

    const { data, error } = await addBet(newBetData);
    if (error) {
        showNotification('Hızlı bahis eklenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]); // State'in başına ekle
        updateAllUI(); // Arayüzü güncelle
        closeQuickAddModal(); // Modalı kapat
        showNotification('🚀 Hızlı bahis eklendi!', 'success');
    } else {
        showNotification('Hızlı bahis eklendi ancak veri alınamadı.', 'warning');
    }
    // Butonu normale döndür (her durumda)
    setButtonLoading(submitButton, false);
}

// Bahis Sonuçlandırma İşleyicisi (resolve-modal için)
async function handleSaveResolveAttempt() {
    const bet = state.currentlyEditingBet; // Düzenlenen bahis state'den alınır
    // Doğrulama: Bahis var mı ve 'bekleyen' durumda mı?
    if (!bet || bet.status !== 'pending') {
         showNotification('Sadece bekleyen bahisler sonuçlandırılabilir.', 'warning');
        return;
    }
     // Doğrulama: Özel oran bahsi mi? (Bunlar admin tarafından sonuçlandırılır)
     if (bet.special_odd_id) {
         showNotification('Özel oran bahisleri buradan sonuçlandırılamaz.', 'warning');
         return;
     }


    const statusSelect = document.getElementById('resolve-status');
    const winAmountInput = document.getElementById('resolve-win-amount');
    const saveButton = document.getElementById('save-resolve-btn');

    const status = statusSelect ? statusSelect.value : '';
    // Kazanç miktarını al, sayı değilse veya 0'dan küçükse 0 yap
    const winAmount = (status === 'won' && winAmountInput) ? parseFloat(winAmountInput.value) : 0;

    // Hata kontrolü: Sonuç seçilmeli
    if (!status) {
         showNotification('Lütfen bir sonuç seçin (Kazandı, Kaybetti, İade).', 'warning');
         return;
    }
     // Hata kontrolü: Durum 'won' ise kazanç miktarı girilmeli ve geçerli olmalı
    if (status === 'won' && (isNaN(winAmount) || winAmount <= 0)) {
         showNotification('Kazanan bahisler için geçerli bir Toplam Kazanç miktarı girmelisiniz (0\'dan büyük).', 'warning');
         return;
    }

    // Güncellenecek veriyi hazırla
    let updateData = {
        status: status,
        win_amount: 0, // Varsayılan
        profit_loss: 0 // Varsayılan
    };

    if (status === 'won') {
        updateData.win_amount = winAmount;
        // profit_loss hesaplaması: Kazanç - Yatırım
        updateData.profit_loss = winAmount - bet.bet_amount;
    } else if (status === 'lost') {
        // Kaybedince kazanç 0, kar/zarar -yatırım
        updateData.profit_loss = -bet.bet_amount;
    } // 'refunded' ise zaten win_amount ve profit_loss 0 kalır

    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    // Veritabanını güncelle
    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis sonuçlandırılamadı: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        // State'deki bahsi güncelle
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
            // Sadece dönen veriyi değil, mevcut bet objesi üzerine güncel veriyi birleştir
            // Bu, special_odds gibi ilişkili verilerin kaybolmasını önler.
            state.bets[index] = { ...state.bets[index], ...data[0] };
        }
        updateAllUI(); // Arayüzü güncelle
        closeResolveModal(); // Modalı kapat
        showNotification('✔️ Bahis sonuçlandırıldı!', 'success');
    } else {
         showNotification('Bahis sonuçlandırıldı ancak veri alınamadı.', 'warning');
    }
     setButtonLoading(saveButton, false); // Butonu normale döndür
}


// Bahis Düzenleme/Etiketleme İşleyicisi (edit-modal için)
async function handleSaveEditAttempt() {
    const bet = state.currentlyEditingBet; // Düzenlenen bahis state'den alınır
    if (!bet) {
        console.error("Düzenlenecek bahis bulunamadı (handleSaveEditAttempt).");
        return; // Düzenlenecek bahis yoksa çık
    }
     // Özel oran bahisleri düzenlenemez
     if (bet.special_odd_id) {
         showNotification('Özel oran bahisleri buradan düzenlenemez.', 'warning');
         return;
     }

    const tagInput = document.getElementById('edit-tag');
    const statusSelect = document.getElementById('edit-status');
    const winAmountInput = document.getElementById('edit-win-amount');
    const saveButton = document.getElementById('save-edit-btn');

    // Etiketi al (boşsa null yap)
    const tag = tagInput ? tagInput.value.trim() : null;
    const finalTag = tag === '' ? null : tag; // Boş string yerine null gönder

    // Güncellenecek veriyi başlat (etiket her zaman güncellenir)
    let updateData = { tag: finalTag };

    // Eğer sonuç bölümü görünürse (yani sonuçlanmış bahis düzenleniyorsa), sonucu da al
    const resultSection = document.getElementById('edit-result-section');
    if (resultSection && resultSection.style.display !== 'none') {
        const status = statusSelect ? statusSelect.value : bet.status;
        const winAmount = (status === 'won' && winAmountInput) ? parseFloat(winAmountInput.value) : 0;

        // Hata kontrolü: Durum 'won' ise kazanç miktarı geçerli olmalı
        if (status === 'won' && (isNaN(winAmount) || winAmount <= 0)) {
            showNotification('Kazanan bahisleri düzenlerken geçerli bir Toplam Kazanç miktarı girmelisiniz (0\'dan büyük).', 'warning');
            return;
        }

        // Güncellenecek veriye durum ve hesaplanmış değerleri ekle
        updateData.status = status;
        updateData.win_amount = 0; // Varsayılan
        updateData.profit_loss = 0; // Varsayılan

        if (status === 'won') {
            updateData.win_amount = winAmount;
            updateData.profit_loss = winAmount - bet.bet_amount;
        } else if (status === 'lost') {
            updateData.profit_loss = -bet.bet_amount;
        } else if (status === 'pending') {
             // Bekleyene geri döndürme durumu: win ve profit 0 olur
        } // 'refunded' ise zaten 0 kalır
    }
    // Eğer bahis 'pending' ise ve sadece etiketleniyorsa (resultSection gizli),
    // updateData sadece { tag: ... } içerir, durum ve kazanç değişmez.

    setButtonLoading(saveButton, true, 'Kaydediliyor...');

    // Veritabanını güncelle
    const { data, error } = await updateBet(state.editingBetId, updateData);
    if (error) {
        showNotification('Bahis güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        // State'deki bahsi güncelle (mevcut üzerine yeni veriyi birleştir)
        const index = state.bets.findIndex(b => b.id === state.editingBetId);
        if (index !== -1) {
             state.bets[index] = { ...state.bets[index], ...data[0] };
        }
        updateAllUI(); // Arayüzü güncelle
        closeEditModal(); // Modalı kapat
        showNotification('✔️ Bahis güncellendi!', 'info');
    } else {
         showNotification('Bahis güncellendi ancak veri alınamadı.', 'warning');
    }
     setButtonLoading(saveButton, false); // Butonu normale döndür
}


async function handleDeleteBetAttempt(betId) {
    // Silme onayı (window.confirm yerine özel bir modal kullanılabilir)
    const confirmation = confirm('Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmation) return;

    // Silme işlemi
    const { error } = await deleteBet(betId);
    if (error) {
        showNotification('Kayıt silinemedi: ' + error.message, 'error');
    } else {
        // State'den silinen bahsi kaldır
        updateState({ bets: state.bets.filter(b => b.id !== betId) });
        // Arayüzü güncelle (özellikle geçmiş ve dashboard)
        updateAllUI();
        showNotification('🗑️ Kayıt silindi.', 'error'); // Başarı mesajı ama 'error' tipiyle kırmızı gösterilebilir
    }
}

async function handleCashTransactionAttempt(type) {
    const amountInput = document.getElementById('cash-amount');
    const descriptionInput = document.getElementById('cash-description');
    const depositBtn = document.getElementById('cash-deposit-btn');
    const withdrawalBtn = document.getElementById('cash-withdrawal-btn');

    let amount = amountInput ? parseFloat(amountInput.value) : NaN;
    let description = descriptionInput ? descriptionInput.value.trim() : '';

    // Doğrulama
    if (isNaN(amount) || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin (0\'dan büyük).', 'error');
        return;
    }

    const isDeposit = type === 'deposit';
    // Kasa işlemi için profit_loss doğrudan miktarın kendisi (pozitif veya negatif)
    const profitLoss = isDeposit ? amount : -amount;
    // Açıklama boşsa varsayılanı kullan
    if (!description) {
        description = isDeposit ? 'Para Ekleme' : 'Para Çekme';
    }

    // Kasa işlemi verisini oluştur (bets tablosuna kaydedilecek)
    const cashTransaction = {
        user_id: state.currentUser.id,
        platform: 'Kasa İşlemi', // Özel platform adı
        bet_type: 'Kasa İşlemi', // Özel bet tipi
        description: description,
        bet_amount: Math.abs(amount), // Yatırılan/Çekilen miktar (pozitif)
        odds: 1, // Kasa işlemi için anlamsız, 1 olabilir
        date: new Date().toISOString().split('T')[0], // Bugünün tarihi
        // Durumu işlem tipine göre ayarla (raporlama için)
        status: isDeposit ? 'won' : 'lost', // 'won' yatırma, 'lost' çekme gibi düşünülebilir
        win_amount: isDeposit ? amount : 0, // Yatırmada kazanç miktarı, çekmede 0
        profit_loss: profitLoss, // Gerçek bakiye değişimi
    };

    const currentBtn = isDeposit ? depositBtn : withdrawalBtn;
    setButtonLoading(currentBtn, true, 'Kaydediliyor...');

    // Veritabanına ekle
    const { data, error } = await addBet(cashTransaction);
    if (error) {
        showNotification('Kasa işlemi kaydedilemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        state.bets.unshift(data[0]); // State'in başına ekle
        updateAllUI(); // Arayüzü güncelle
        closeCashTransactionModal(); // Modalı kapat
        showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
    } else {
        showNotification('Kasa işlemi eklendi ancak veri alınamadı.', 'warning');
    }
    // Her iki butonu da normale döndür (her durumda)
    setButtonLoading(depositBtn, false);
    setButtonLoading(withdrawalBtn, false);
}

async function handleAddPlatformAttempt(fromModal = false) {
    // Modal içinden mi yoksa Ayarlar sayfasından mı çağrıldığına göre input ID'sini belirle
    const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
    const input = document.getElementById(inputId);
    const name = input ? input.value.trim() : '';

    // Doğrulama: Boş olamaz
    if (!name) {
        showNotification('Platform adı boş olamaz.', 'warning');
        return;
    }

    // Doğrulama: Mevcut platformlarla (varsayılan + özel) çakışmamalı (büyük/küçük harf duyarsız)
    const allPlatformsLower = [
        ...DEFAULT_PLATFORMS.map(p => p.toLowerCase()),
        ...state.customPlatforms.map(p => p.name.toLowerCase())
    ];
    if (allPlatformsLower.includes(name.toLowerCase())) {
        showNotification('Bu platform zaten mevcut.', 'warning');
        return;
    }

    // Veritabanına ekle
    const { data, error } = await addPlatform({ name: name, user_id: state.currentUser.id });
    if (error) {
        showNotification('Platform eklenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        // State'e ekle
        state.customPlatforms.push(data[0]);
        // Input'u temizle
        if (input) input.value = '';
        // İlgili listeleri güncelle (Modal içi ve Ayarlar sayfası)
        if (fromModal) renderCustomPlatformsModal();
        renderCustomPlatforms(); // Ayarlar sayfasındaki listeyi de güncelle
        // Tüm platform <select> dropdown'larını güncelle
        populatePlatformOptions();
        showNotification(`✅ "${name}" platformu eklendi!`, 'success');
    } else {
         showNotification('Platform eklendi ancak veri alınamadı.', 'warning');
    }
}

async function handleRemovePlatformAttempt(platformId, platformName) {
    // Silme onayı
    const confirmation = confirm(`"${platformName}" platformunu silmek istediğinizden emin misiniz? Bu platformla ilişkili bahisler silinmeyecektir.`);
    if (!confirmation) return;

    // Veritabanından sil
    const { error } = await deletePlatform(platformId);
    if (error) {
        showNotification('Platform silinemedi: ' + error.message, 'error');
    } else {
        // State'den kaldır
        updateState({ customPlatforms: state.customPlatforms.filter(p => p.id !== platformId) });
        // İlgili listeleri güncelle
        renderCustomPlatforms();
        renderCustomPlatformsModal();
        // Platform dropdown'larını güncelle
        populatePlatformOptions();
        showNotification(`🗑️ "${platformName}" platformu silindi`, 'error');
    }
}

async function handleClearAllDataAttempt() {
    // Çok kritik bir işlem olduğu için iki aşamalı onay isteyelim
    const confirm1 = prompt('DİKKAT! TÜM kişisel verilerinizi (bahis kayıtları, özel platformlar) KALICI olarak silmek üzeresiniz. Bu işlem geri alınamaz!\n\nDevam etmek için "SİL" yazın:');
    if (confirm1?.toUpperCase() !== 'SİL') {
        showNotification('İşlem iptal edildi.', 'info');
        return;
    }
    const confirm2 = confirm('Son kez soruyorum: Tüm verileriniz silinecek. Emin misiniz?');
     if (!confirm2) {
        showNotification('İşlem iptal edildi.', 'info');
        return;
    }


    const clearBtn1 = document.getElementById('clear-all-btn'); // History
    const clearBtn2 = document.getElementById('clear-all-settings-btn'); // Settings
    // Butonları yükleme durumuna al
    if (clearBtn1) setButtonLoading(clearBtn1, true, 'Siliniyor...');
    if (clearBtn2) setButtonLoading(clearBtn2, true, 'Siliniyor...');

    // Veritabanından silme işlemlerini paralel yap
    const [betsRes, platformsRes] = await Promise.all([
        clearAllBetsForUser(state.currentUser.id),
        clearAllPlatformsForUser(state.currentUser.id)
    ]);

    let success = true;
    if (betsRes.error) {
        console.error("Bahisleri silme hatası:", betsRes.error);
        showNotification('Bahisler silinirken bir hata oluştu.', 'error');
        success = false;
    }
    if (platformsRes.error) {
         console.error("Platformları silme hatası:", platformsRes.error);
         showNotification('Platformlar silinirken bir hata oluştu.', 'error');
         success = false;
    }

    if (success) {
        // State'i sıfırla
        updateState({ bets: [], customPlatforms: [] });
        // Arayüzü güncelle (listeleri boşalt, dropdownları güncelle)
        updateAllUI(); // Bu fonksiyon içindeki render'lar listeleri boşaltmalı
        populatePlatformOptions(); // Dropdown'ları varsayılana döndür
        renderCustomPlatforms(); // Ayarlar listesini boşalt
        renderCustomPlatformsModal(); // Modal listesini boşalt
        showNotification('🗑️ Tüm kişisel verileriniz başarıyla silindi!', 'error');
    }
    // Butonları normale döndür
    if (clearBtn1) setButtonLoading(clearBtn1, false);
    if (clearBtn2) setButtonLoading(clearBtn2, false);
}

// Kupon Okuma (Ana Form - Kullanıcı)
async function handleUserAnalyzeBetSlip() {
    if (!state.currentImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('gemini-analyze-btn');
    // Buton metnini ve ikonunu değiştirerek yükleme durumunu göster
    const iconSpan = geminiButton.querySelector('#gemini-button-icon');
    const textSpan = geminiButton.querySelector('#gemini-button-text');
    const originalText = textSpan.textContent;
    if (iconSpan) iconSpan.innerHTML = '<span class="btn-loader inline-block"></span>'; // Yükleyici ikonu
    if (textSpan) textSpan.textContent = 'Okunuyor...';
    geminiButton.disabled = true; // Butonu devre dışı bırak

    try {
        // Base64 verisinin sadece data kısmını al (başındaki 'data:image/jpeg;base64,' kısmını at)
        const base64Data = state.currentImageData.split(',')[1];
        // API'ye isteği gönder
        const result = await analyzeBetSlipApi(base64Data);

        // Sonucu işle
        if (result) {
            // Açıklama alanını doldur
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                // Maçları ve bahisleri birleştirerek açıklama oluştur
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                const descriptionInput = document.getElementById('description');
                 if(descriptionInput) descriptionInput.value = descriptionText;
            }
            // Miktar alanını doldur
            const betAmountInput = document.getElementById('bet-amount');
            // result.betAmount null veya undefined değilse ve geçerli bir sayıya çevrilebiliyorsa doldur
            if (result.betAmount != null && !isNaN(parseFloat(result.betAmount))) {
                 if(betAmountInput) betAmountInput.value = parseFloat(result.betAmount);
            }
            // Oran alanını doldur
            const oddsInput = document.getElementById('odds');
             if (result.odds != null && !isNaN(parseFloat(result.odds))) {
                 if(oddsInput) oddsInput.value = parseFloat(result.odds);
             }
            showNotification('✨ Kupon bilgileri başarıyla okundu!', 'success');
        } else {
            // API'den beklenen formatta cevap gelmedi
            throw new Error("API'den geçerli bir sonuç alınamadı veya sonuç boş.");
        }
    } catch (error) {
        console.error('Kupon okuma (Gemini API) Hatası:', error);
        showNotification(`Kupon okunurken bir hata oluştu: ${error.message}`, 'error');
    } finally {
        // Butonu eski haline getir
         if (iconSpan) iconSpan.innerHTML = '✨'; // İkonu geri getir
         if (textSpan) textSpan.textContent = originalText; // Metni geri getir
         // Butonun tekrar etkinleştirilmesi: Eğer resim hala varsa etkin kalsın
         geminiButton.disabled = !state.currentImageData;
    }
}

// Kupon Okuma (Admin Paneli - Özel Oran Formu)
async function handleAdminAnalyzeBetSlip() {
    if (!state.adminImageData) {
        showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning');
        return;
    }
    const geminiButton = document.getElementById('admin-gemini-analyze-btn');
    const iconSpan = geminiButton.querySelector('#admin-gemini-button-icon');
    const textSpan = geminiButton.querySelector('#admin-gemini-button-text');
    const originalText = textSpan.textContent;
    if (iconSpan) iconSpan.innerHTML = '<span class="btn-loader inline-block"></span>';
    if (textSpan) textSpan.textContent = 'Okunuyor...';
    geminiButton.disabled = true;

    try {
        const base64Data = state.adminImageData.split(',')[1];
        const result = await analyzeBetSlipApi(base64Data);
        if (result) {
            // Açıklama alanını doldur
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const descriptionText = result.matches
                    .map(match => `${match.matchName} (${match.bets.join(', ')})`)
                    .join(' / ');
                const descriptionInput = document.getElementById('special-odd-description');
                 if(descriptionInput) descriptionInput.value = descriptionText;
            }
            // Oran alanını doldur
             const oddsInput = document.getElementById('special-odd-odds');
             if (result.odds != null && !isNaN(parseFloat(result.odds))) {
                 if(oddsInput) oddsInput.value = parseFloat(result.odds);
             }
            showNotification('✨ Fırsat bilgileri başarıyla okundu!', 'success');
        } else {
            throw new Error("API'den geçerli bir sonuç alınamadı.");
        }
    } catch (error) {
        console.error('Admin kupon okuma (Gemini API) Hatası:', error);
        showNotification(`Kupon okunurken bir hata oluştu: ${error.message}`, 'error');
    } finally {
         if (iconSpan) iconSpan.innerHTML = '✨';
         if (textSpan) textSpan.textContent = originalText;
         geminiButton.disabled = !state.adminImageData; // Resim varsa tekrar aktif
    }
}


// Panodan Resim Yapıştırma İşleyicisi
async function handlePasteFromClipboard(type) { // 'main', 'quick', 'admin'
    try {
        // Tarayıcı desteğini kontrol et
        if (!navigator.clipboard || !navigator.clipboard.read) {
            showNotification('Tarayıcınız panodan okumayı desteklemiyor veya izin verilmemiş.', 'warning');
            return;
        }
        // Kullanıcıya bilgi ver
        showNotification('📋 Pano okunuyor...', 'info', 2000); // Kısa süreli bildirim

        // Panodaki öğeleri oku
        const items = await navigator.clipboard.read();
        let imageBlob = null;
        // Resim tipindeki ilk öğeyi bul
        for (const item of items) {
            const imageType = item.types.find(t => t.startsWith('image/'));
            if (imageType) {
                imageBlob = await item.getType(imageType);
                break; // İlk resmi bulunca döngüden çık
            }
        }

        // Resim bulunduysa işle
        if (imageBlob) {
            // Blob'dan bir File objesi oluştur (isim ve tip ile)
            const fileName = `pasted-image-${Date.now()}.${imageBlob.type.split('/')[1] || 'png'}`;
            const file = new File([imageBlob], fileName, { type: imageBlob.type });
            // Resmi ilgili alana yükle (ui_helpers'daki fonksiyonu çağır)
            handleImageFile(file, type);
            showNotification('✅ Resim panodan başarıyla yapıştırıldı!', 'success');
        } else {
            // Panoda resim yoksa bildir
            showNotification('Panoda yapıştırılacak bir resim bulunamadı.', 'warning');
        }
    } catch (err) {
        // Hataları yakala ve kullanıcıya bildir
        console.error('Panodan yapıştırma hatası:', err);
        // İzin hatalarını ayrıca ele al
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message.includes('permission')) {
             showNotification('Panodan okuma izni gerekli. Lütfen tarayıcı ayarlarınızı kontrol edin veya sayfayı yenileyip tekrar deneyin.', 'error', 6000);
        } else if (err.name === 'NotFoundError') {
             showNotification('Panoda okunacak veri bulunamadı.', 'warning');
        } else {
             showNotification(`Panodan okuma sırasında bir hata oluştu: ${err.name}`, 'error');
        }
    }
}


// Özel Oran Yayınlama (Admin Paneli)
async function handlePublishSpecialOdd(e) {
    e.preventDefault();
    const form = document.getElementById('special-odd-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');

    // Formdan değerleri al
    const descriptionInput = document.getElementById('special-odd-description');
    const oddsInput = document.getElementById('special-odd-odds');
    const platformInput = document.getElementById('special-odd-platform');
    const maxBetInput = document.getElementById('special-odd-max-bet');

    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const odds = oddsInput ? parseFloat(oddsInput.value) : NaN;
    const platform = platformInput ? platformInput.value.trim() : '';
    const maxBetAmount = maxBetInput ? parseFloat(maxBetInput.value) : null;

    // Doğrulamalar
    if (!description || !platform) {
        showNotification('Lütfen Açıklama ve Platform alanlarını doldurun.', 'warning');
        return;
    }
    if (isNaN(odds) || odds < 1) {
        showNotification('Lütfen geçerli bir oran girin (1 veya daha büyük).', 'warning');
        return;
    }
     // Max bet null değilse ve geçerli bir sayı değilse veya negatifse hata ver
     if (maxBetAmount !== null && (isNaN(maxBetAmount) || maxBetAmount < 0)) {
         showNotification('Maksimum Bahis geçerli bir sayı olmalı (0 veya daha büyük) veya boş bırakılmalıdır.', 'warning');
         return;
    }

    setButtonLoading(button, true, 'Yayınlanıyor...');

    // Veritabanına gönderilecek veriyi oluştur
    const oddData = {
        description: description,
        odds: odds,
        platform: platform,
        max_bet_amount: maxBetAmount, // null olabilir
        primary_link_text: document.getElementById('special-odd-primary-link-text')?.value.trim() || null,
        primary_link_url: document.getElementById('special-odd-primary-link-url')?.value.trim() || null,
        secondary_link_text: document.getElementById('special-odd-secondary-link-text')?.value.trim() || null,
        secondary_link_url: document.getElementById('special-odd-secondary-link-url')?.value.trim() || null,
        status: 'pending' // Başlangıç durumu
    };

    // Veritabanına ekle
    const { data, error } = await addSpecialOdd(oddData);
    if (error) {
        showNotification('Fırsat yayınlanamadı: ' + error.message, 'error');
    } else if (data && data.length > 0){
        // State'in başına ekle
        state.specialOdds.unshift(data[0]);
        // Admin panelindeki aktif listeyi güncelle
        renderActiveSpecialOdds();
        // Fırsatlar sayfasını güncelle (eğer açıksa)
        if (state.currentSection === 'special-odds-page') {
            renderSpecialOddsPage();
        }
        // Platform filtresini güncelle (yeni platform eklendiyse)
        populateSpecialOddsPlatformFilter();
        // Formu sıfırla ve resmi kaldır
        form.reset();
        removeImage('admin');
        showNotification('📢 Yeni fırsat başarıyla yayınlandı!', 'success');
    } else {
         showNotification('Fırsat yayınlandı ancak veri alınamadı.', 'warning');
    }
    setButtonLoading(button, false); // Butonu normale döndür
}


// Özel Oran Sonuçlandırma (Admin Paneli)
async function handleResolveSpecialOdd(id, status) {
    // Onay iste
    const confirmation = confirm(`Bu fırsatı "${status.toUpperCase()}" olarak işaretlemek istediğinizden emin misiniz? Bu işlem, bu bahsi oynayan tüm kullanıcıları etkileyecektir ve geri alınamaz.`);
    if (!confirmation) return;

    // İlgili butonu bul ve yükleme durumuna al (spesifik durum butonu)
    const button = document.querySelector(`button[data-action="resolve-special-odd"][data-id="${id}"][data-status="${status}"]`);
    if (button) setButtonLoading(button, true, 'İşleniyor...'); // Geçici metin

    // Veritabanını güncelle (sadece status ve resulted_at)
    // resulted_at: Fırsatın sonuçlandığı zamanı kaydetmek için
    const updatePayload = {
        status: status,
        resulted_at: new Date().toISOString()
    };

    const { data, error } = await updateSpecialOdd(id, updatePayload); // `id` number olmalı

    if(error) {
        showNotification('Fırsat durumu güncellenemedi: ' + error.message, 'error');
    } else if (data && data.length > 0) {
        // State'deki fırsatı güncelle
        const index = state.specialOdds.findIndex(o => o.id === id); // id ile eşleşeni bul
        if(index > -1) {
            // Güncellenmiş veriyi state'e yansıt
            state.specialOdds[index] = { ...state.specialOdds[index], ...data[0] };
        }
        // Admin panelindeki aktif listeyi güncelle (sonuçlanan oradan kalkacak)
        renderActiveSpecialOdds();
        // Fırsatlar sayfasını güncelle (sonuç orada görünecek)
         if (state.currentSection === 'special-odds-page') {
            renderSpecialOddsPage();
        }
        // Ana UI'ı güncelle (ilgili bahislerin durumu değişmiş olabilir - Realtime da yapabilir)
        // updateAllUI(); // Realtime'a bırakmak daha iyi olabilir
        showNotification(`Fırsat durumu "${status.toUpperCase()}" olarak güncellendi!`, 'info');
    } else {
        showNotification('Fırsat güncellendi ancak veri alınamadı.', 'warning');
    }

    // O ID'ye ait TÜM sonuçlandırma butonlarını normale döndür
    document.querySelectorAll(`button[data-action="resolve-special-odd"][data-id="${id}"]`).forEach(btn => {
         // Butonun orijinal metnini dataset'ten al veya varsayılanı kullan
         const defaultText = btn.dataset.defaultText || (btn.dataset.status === 'won' ? 'Kazandı' : (btn.dataset.status === 'lost' ? 'Kaybetti' : 'İade Et'));
         setButtonLoading(btn, false, defaultText);
    });
}

// GÖREV 5: İçe/Dışa Aktarma İşleyicileri (Placeholder)
async function handleImportData() {
    // Bu fonksiyon henüz implemente edilmedi.
    // Dosyayı oku (veya textarea'dan al), JSON'u parse et.
    // Seçilen moda göre (merge/replace) state.bets ve state.customPlatforms'u güncelle.
    // Supabase'e yeni verileri kaydet (toplu insert/upsert).
    // Arayüzü güncelle.
    const importMode = document.getElementById('import-mode')?.value;
    const fileInput = document.getElementById('import-file');
    const textArea = document.getElementById('import-text');
    let jsonData = null;

    // TODO: Dosya okuma veya textarea'dan alma mantığı eklenecek.
    // Örneğin: if (fileInput.files.length > 0) { ... } else if (textArea.value) { ... }

    if (!jsonData) {
         showNotification('İçe aktarılacak veri bulunamadı (Dosya seçin veya metin yapıştırın).', 'warning');
         return;
    }

    console.log(`İçe Aktarma Modu: ${importMode}`, jsonData);
    showNotification('İçe aktarma işlemi henüz tamamlanmadı.', 'info');
    closeImportModal(); // Şimdilik modalı kapat
}

async function handleExportData() {
    // Bu fonksiyon henüz implemente edilmedi.
    // state.bets ve state.customPlatforms verilerini al.
    // JSON formatına çevir.
    // Kullanıcıya .json dosyası olarak indirt.
    if (state.bets.length === 0 && state.customPlatforms.length === 0) {
        showNotification('Dışa aktarılacak veri bulunmuyor.', 'warning');
        return;
    }

    const dataToExport = {
        bets: state.bets,
        customPlatforms: state.customPlatforms,
        exportedAt: new Date().toISOString()
    };

    try {
        const jsonString = JSON.stringify(dataToExport, null, 2); // Okunabilir formatta JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Dosya adı: kasamatik_yedek_YYYY-MM-DD.json
        a.download = `kasamatik_yedek_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Hafızayı boşalt
        showNotification('📥 Veriler başarıyla dışa aktarıldı!', 'success');
    } catch (error) {
        console.error("Dışa aktarma hatası:", error);
        showNotification('Veriler dışa aktarılırken bir hata oluştu.', 'error');
    }
}


// EVENT LISTENER SETUP (Olay Dinleyici Kurulumu)
export function setupEventListeners() {
    // Dinleyicilerin tekrar tekrar eklenmesini önle
    if (state.listenersAttached) {
        console.warn("Event listeners zaten bağlı, tekrar eklenmiyor.");
        return;
    }
    console.log("setupEventListeners çağrılıyor...");

    // Butonların varsayılan metinlerini kaydet (sadece bir kez)
    document.querySelectorAll('button[id]').forEach(button => {
        const textElement = button.querySelector('.btn-text');
        if (textElement && !button.dataset.defaultText) {
            button.dataset.defaultText = textElement.textContent.trim();
        }
    });

    // --- Form Gönderimleri ---
    document.getElementById('auth-form')?.addEventListener('submit', (e) => e.preventDefault()); // Formun sayfa yenilemesini engelle
    document.getElementById('login-btn')?.addEventListener('click', handleLoginAttempt);
    document.getElementById('signup-btn')?.addEventListener('click', handleSignUpAttempt);
    document.getElementById('password-reset-form')?.addEventListener('submit', handlePasswordResetAttempt);
    document.getElementById('account-settings-form')?.addEventListener('submit', handleUpdatePasswordAttempt);
    document.getElementById('bet-form')?.addEventListener('submit', handleBetFormSubmitAttempt);
    document.getElementById('quick-add-form')?.addEventListener('submit', handleQuickAddSubmitAttempt);
    document.getElementById('special-odd-form')?.addEventListener('submit', handlePublishSpecialOdd);
    // Admin Sponsor/Reklam formları için listener'lar admin_actions.js içinde eklenecek

    // --- Navigasyon ve Sidebar ---
    document.getElementById('logout-btn')?.addEventListener('click', () => signOut().catch(err => console.error("Çıkış hatası:", err)));
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
             const sectionName = item.dataset.section;
             if (sectionName) {
                 showSection(sectionName, item); // ui_helpers'daki fonksiyon
             }
        });
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar); // ui_helpers
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileSidebar); // ui_helpers

    // --- Modalları Açma/Kapatma Butonları ---
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => { e.preventDefault(); openModal('password-reset-modal'); });
    document.getElementById('cancel-reset-btn')?.addEventListener('click', () => closeModal('password-reset-modal'));
    document.getElementById('platform-manager-btn')?.addEventListener('click', openPlatformManager); // Yeni Kayıt sayfasındaki
    document.getElementById('close-platform-manager-btn')?.addEventListener('click', closePlatformManager);
    document.getElementById('cash-transaction-btn')?.addEventListener('click', openCashTransactionModal); // Dashboard hızlı işlem
    document.getElementById('cash-transaction-close-btn')?.addEventListener('click', closeCashTransactionModal);
    document.getElementById('quick-add-btn')?.addEventListener('click', openQuickAddModal); // Dashboard hızlı işlem
    document.getElementById('floating-add-btn')?.addEventListener('click', openQuickAddModal); // Floating button
    // GÖREV 5: Hızlı Ekle Modalı Kapatma Butonu Listener'ı eklendi
    document.getElementById('close-quick-add-btn')?.addEventListener('click', closeQuickAddModal);
    document.getElementById('close-play-special-odd-modal')?.addEventListener('click', closePlaySpecialOddModal); // Modalı doğrudan kapatır
    document.getElementById('close-edit-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('close-resolve-btn')?.addEventListener('click', closeResolveModal);
    document.getElementById('image-modal')?.addEventListener('click', closeImageModal); // Resim modalı dışına tıklayınca kapat
    document.getElementById('close-ad-popup-btn')?.addEventListener('click', closeAdPopup);
    // GÖREV 5: İçe/Dışa Aktarma Butonları Listener'ları eklendi
    document.getElementById('import-btn')?.addEventListener('click', openImportModal);
    document.getElementById('export-btn')?.addEventListener('click', handleExportData); // Dışa aktarma modal gerektirmez
    document.getElementById('close-import-btn')?.addEventListener('click', closeImportModal);
    document.getElementById('import-data-btn')?.addEventListener('click', handleImportData);


    // --- Diğer Buton ve Input Olayları ---
    document.getElementById('add-platform-btn')?.addEventListener('click', () => handleAddPlatformAttempt(false)); // Ayarlar sayfasındaki
    document.getElementById('add-platform-modal-btn')?.addEventListener('click', () => handleAddPlatformAttempt(true)); // Modal içindeki
    document.getElementById('reset-form-btn')?.addEventListener('click', () => resetForm()); // Yeni Kayıt formu temizle
    document.getElementById('clear-all-btn')?.addEventListener('click', handleClearAllDataAttempt); // History sayfası tümünü sil
    document.getElementById('clear-all-settings-btn')?.addEventListener('click', handleClearAllDataAttempt); // Ayarlar sayfası tümünü sil
    document.getElementById('gemini-analyze-btn')?.addEventListener('click', handleUserAnalyzeBetSlip); // Ana form kupon oku
    document.getElementById('admin-gemini-analyze-btn')?.addEventListener('click', handleAdminAnalyzeBetSlip); // Admin form kupon oku

    // Kasa İşlemi Modal Butonları
    document.getElementById('cash-deposit-btn')?.addEventListener('click', () => handleCashTransactionAttempt('deposit'));
    document.getElementById('cash-withdrawal-btn')?.addEventListener('click', () => handleCashTransactionAttempt('withdrawal'));

    // Sonuçlandırma ve Düzenleme Modal Kaydet Butonları
    document.getElementById('save-resolve-btn')?.addEventListener('click', handleSaveResolveAttempt);
    document.getElementById('save-edit-btn')?.addEventListener('click', handleSaveEditAttempt);
    // Fırsat Oynama Modal Onay Butonu
    document.getElementById('confirm-play-special-odd')?.addEventListener('click', (e) => handlePlaySpecialOdd(e.currentTarget)); // Butonun kendisini gönder


    // --- Filtreleme ve Sıralama Olayları ---
    // Dashboard Periyot Filtresi (Event delegation ile body'e taşındı)
    // History Periyot Filtresi (Event delegation ile body'e taşındı)
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        updateState({ filters: { ...state.filters, status: e.target.value }, currentPage: 1 }); // Sayfayı 1'e resetle
        renderHistory();
    });
    document.getElementById('platform-filter')?.addEventListener('change', (e) => {
        updateState({ filters: { ...state.filters, platform: e.target.value }, currentPage: 1 }); // Sayfayı 1'e resetle
        renderHistory();
    });
     document.getElementById('search-filter')?.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            updateState({ filters: { ...state.filters, searchTerm: e.target.value }, currentPage: 1 }); // Sayfayı 1'e resetle
            renderHistory();
        }, 300); // Kullanıcı yazmayı bitirdikten 300ms sonra ara
    });
    // Fırsatlar Sayfası Filtreleme
    document.getElementById('special-odds-status-filter')?.addEventListener('change', e => {
        updateState({ specialOddsFilters: { ...state.specialOddsFilters, status: e.target.value } });
        renderSpecialOddsPage();
    });
    document.getElementById('special-odds-platform-filter')?.addEventListener('change', e => {
         updateState({ specialOddsFilters: { ...state.specialOddsFilters, platform: e.target.value } });
        renderSpecialOddsPage();
    });
    document.getElementById('special-odds-sort-filter')?.addEventListener('change', e => {
         updateState({ specialOddsFilters: { ...state.specialOddsFilters, sort: e.target.value } });
        renderSpecialOddsPage();
    });
    // İstatistikler Sayfası Filtre Sıfırlama
     document.getElementById('stats-reset-filters-btn')?.addEventListener('click', () => {
        updateState({ statsFilters: { dateRange: { start: null, end: null } } });
        const datePicker = document.getElementById('stats-date-range-filter')?._flatpickr;
        if(datePicker) datePicker.clear(); // Flatpickr input'unu temizle
        updateStatisticsPage(); // İstatistikleri güncelle
        updateCharts(); // Grafikleri güncelle
    });


    // --- Resim Yükleme ve Panodan Yapıştırma ---
    const setupImageUpload = (type) => { // 'main', 'quick', 'admin'
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');
        const imageInput = document.getElementById(`${prefix}image-input`);
        const selectBtn = document.getElementById(`${prefix}image-select-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-image-btn`);
        const uploadArea = document.getElementById(`${prefix}image-upload-area`);
        const pasteBtn = document.getElementById(`${prefix}paste-image-btn`); // Panodan yapıştır butonu

        if (!imageInput || !selectBtn || !removeBtn || !uploadArea) {
            // console.warn(`Image upload elements not found for type: ${type}`);
            return; // Elementler eksikse devam etme
        }

        // Dosya Seç Butonu
        selectBtn.addEventListener('click', () => imageInput.click());
        // Panodan Yapıştır Butonu
        if (pasteBtn) pasteBtn.addEventListener('click', () => handlePasteFromClipboard(type));
        // Dosya Seçildiğinde (Input Değiştiğinde)
        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                 handleImageFile(e.target.files[0], type); // ui_helpers'daki fonksiyon
            }
        });
        // Resmi Kaldır Butonu
        removeBtn.addEventListener('click', () => removeImage(type)); // ui_helpers'daki fonksiyon

        // Sürükle ve Bırak Alanı
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Sürükleme sırasında görsel geri bildirim
                if (eventName === 'dragenter' || eventName === 'dragover') {
                    uploadArea.classList.add('dragover');
                } else {
                    uploadArea.classList.remove('dragover');
                }
                // Dosya bırakıldığında
                if (eventName === 'drop' && e.dataTransfer?.files?.length > 0) {
                     handleImageFile(e.dataTransfer.files[0], type); // İlk dosyayı işle
                }
            }, false);
        });
    };
    setupImageUpload('main');
    setupImageUpload('quick');
    setupImageUpload('admin');

    // Genel Panodan Yapıştırma (Ctrl+V) - Sadece ilgili modal/sayfa aktifken çalışmalı
    document.addEventListener('paste', e => {
        // Hedef element input veya textarea ise yapıştırmaya izin ver
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            // Resim tipindeki ilk öğeyi bul
            const file = Array.from(items).find(item => item.type.startsWith('image/'))?.getAsFile();
            if (!file) return; // Panoda resim yoksa devam etme

            // Hangi alana yapıştırılacağını belirle
            let activeType = null;
            const quickAddModal = document.getElementById('quick-add-modal');
            const specialOddForm = document.getElementById('special-odd-form');
            const isAdmin = state.currentUser?.id === ADMIN_USER_ID; // Tekrar kontrol et

            if (state.currentSection === 'new-bet') activeType = 'main';
            else if (quickAddModal && !quickAddModal.classList.contains('hidden')) activeType = 'quick';
             // Admin panelindeki özel oran formu aktifse ve kullanıcı admin ise
            else if (state.currentSection === 'settings' && isAdmin && specialOddForm) activeType = 'admin';

            // Eğer uygun bir alan aktifse resmi işle
            if (activeType) {
                handleImageFile(file, activeType);
                 showNotification('📋 Resim panodan yapıştırıldı!', 'success');
                 e.preventDefault(); // Varsayılan yapıştırma işlemini engelle
            }
        } catch (pasteError) {
             console.error("Genel yapıştırma hatası:", pasteError);
             // showNotification('Resim yapıştırılırken bir hata oluştu.', 'error'); // Çok sıkıcı olabilir
        }
    });

    // --- Ana Olay Dinleyicisi (Event Delegation) ---
    // Dinamik olarak eklenen veya çok sayıda olan butonlar için kullanılır
    document.body.addEventListener('click', e => {
        // En yakın data-action'a sahip elementi bul (butonun içindeki ikona tıklansa bile)
        const target = e.target.closest('[data-action]');
        if (!target) return; // data-action yoksa çık

        // Aksiyon ve diğer data-* özelliklerini al
        const action = target.dataset.action;
        const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;
        const name = target.dataset.name;
        const page = target.dataset.page ? parseInt(target.dataset.page, 10) : null;
        const src = target.dataset.src; // Resim URL'si için
        const period = target.dataset.period; // Dashboard ve History periyotları için
        const status = target.dataset.status; // Sonuçlandırma ve Admin panel için
        const section = target.dataset.section; // Navigasyon için

        // console.log("data-action tıklandı:", { action, id, name, page, src, period, status, section }); // Debug

        // Aksiyona göre ilgili fonksiyonu çağır
        switch (action) {
            case 'open-resolve-modal':
                if (id !== null) openResolveModal(id);
                break;
            case 'open-edit-modal':
                if (id !== null) openEditModal(id);
                break;
            case 'delete-bet':
                if (id !== null) handleDeleteBetAttempt(id);
                break;
            case 'remove-platform': // Hem Ayarlar hem Modal içindeki silme butonu
                if (id !== null && name !== undefined) handleRemovePlatformAttempt(id, name);
                break;
            case 'changeBetPage': // Bahis Geçmişi Sayfalama
                if (page !== null) changeBetPage(page);
                break;
            case 'changeCashPage': // Kasa Geçmişi Sayfalama
                if (page !== null) changeCashPage(page);
                break;
             case 'show-image-modal': // Kupon resmini büyütme (varsa)
                if (src) showImageModal(src);
                break;
            case 'set-dashboard-period': // Dashboard periyot seçimi
                if (period !== undefined) {
                    const periodNum = parseInt(period, 10);
                    if (!isNaN(periodNum)) {
                         updateState({ dashboardPeriod: periodNum });
                         updatePerformanceSummary(); // Sadece özeti güncelle
                         // Aktif butonu işaretle
                         document.querySelectorAll('#performance-period-buttons .period-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.period === period);
                         });
                    }
                }
                break;
            case 'set-history-period': // Bahis Geçmişi periyot seçimi
                 if (period !== undefined) {
                    const periodValue = period === 'all' ? 'all' : parseInt(period, 10);
                    if (!isNaN(periodValue) || periodValue === 'all') {
                        updateState({ filters: { ...state.filters, period: periodValue }, currentPage: 1 }); // Sayfa 1'e dön
                        // Aktif butonu işaretle
                        document.querySelectorAll('#history-period-buttons .period-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.period === period);
                        });
                        renderHistory(); // Geçmişi yeniden render et
                    }
                 }
                break;
            case 'resolve-special-odd': // Admin panelindeki fırsat sonuçlandırma
                if (id !== null && status) handleResolveSpecialOdd(id, status);
                break;
            case 'open-play-special-odd-modal': // Fırsatlar sayfasındaki "Oyna" butonu
                if (id !== null) openPlaySpecialOddModal(id);
                break;
            // Admin panel silme butonları (Sponsor/Reklam) - Bunlar için ayrı listener daha iyi olabilir
            // Eğer admin_actions.js import edilecekse, bu case'ler oraya taşınabilir.
            case 'delete-sponsor':
                if (id !== null && name !== undefined && state.currentUser.id === ADMIN_USER_ID) {
                    import('./admin_actions.js').then(module => module.handleDeleteSponsor(id, name)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
            case 'delete-ad':
                if (id !== null && state.currentUser.id === ADMIN_USER_ID) {
                    import('./admin_actions.js').then(module => module.handleDeleteAd(id)).catch(err => console.error("Admin actions yüklenemedi:", err));
                }
                break;
             case 'navigate-section': // Başka bir sekmeye programatik geçiş için
                 if (section) {
                    const targetSidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
                    if (targetSidebarItem) {
                        showSection(section, targetSidebarItem);
                    }
                 }
                 break;
        }
    });

    // --- Admin Eylemleri için Özel Listener'lar (Eğer admin_actions.js kullanılmayacaksa) ---
    // Eğer admin_actions.js import ediliyorsa, bu listener'lar ORADA olmalı.
    // document.getElementById('sponsor-form')?.addEventListener('submit', handleAddSponsorAttempt);
    // document.getElementById('ad-form')?.addEventListener('submit', handleAddAdAttempt);


    // Dinleyicilerin bağlandığını işaretle
    updateState({ listenersAttached: true });
    console.log("Event listeners başarıyla bağlandı.");
}

