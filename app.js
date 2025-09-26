// Bu dosyanın adı: app.js
// Bu kod, tarayıcıda çalışır ve uygulamanın tüm mantığını içerir.

(function() {
    // ============== SUPABASE SETUP ==============
    const SUPABASE_URL = 'https://huaelrdjrcoljkkprewz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWVscmRqcmNvbGpra3ByZXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDI4ODMsImV4cCI6MjA3MjQxODg4M30.kYcxJtT9qQ8rMcNUD2Dy7W8kgYBK9c9xRUVUthJV2Qg';
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const ADMIN_USER_ID = 'fbf57686-1ec6-4ef0-9ee1-b908d3fae274';

    // ============== DOM ELEMENTS ==============
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authForm = document.getElementById('auth-form');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailDisplay = document.getElementById('user-email-display');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const passwordResetModal = document.getElementById('password-reset-modal');
    const passwordResetForm = document.getElementById('password-reset-form');
    const cancelResetBtn = document.getElementById('cancel-reset-btn');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const sponsorForm = document.getElementById('sponsor-form');
    const sponsorsListContainer = document.getElementById('sponsors-list');
    const sponsorsGridContainer = document.getElementById('sponsors-grid');
    const sponsorManagementPanel = document.getElementById('sponsor-management-panel');
    const adManagementPanel = document.getElementById('ad-management-panel');
    const adForm = document.getElementById('ad-form');
    const adsListContainer = document.getElementById('ads-list');
    const adPopupModal = document.getElementById('ad-popup-modal');
    const closeAdPopupBtn = document.getElementById('close-ad-popup-btn');
    const dashboardAdBanner = document.getElementById('dashboard-ad-banner');
    const updatePasswordForm = document.getElementById('update-password-form');


    // ============== APPLICATION STATE ==============
    let currentUser = null;
    let bets = [];
    let customPlatforms = [];
    let sponsors = [];
    let ads = [];
    let editingBetId = null;
    let currentImageData = null;
    let quickImageData = null;
    let profitChart, platformChart;
    let currentSection = 'dashboard';
    let currentPage = 1;
    let cashCurrentPage = 1;
    const itemsPerPage = 10;
    const defaultPlatforms = [ "Bilyoner", "Misli", "Nesine", "Tuttur" ];
    let listenersAttached = false; 
    let currentlyEditingBet = null;
    
    // ============== AUTHENTICATION ==============
    async function setupAuthEventListeners() {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            loginBtn.disabled = true;
            loginBtn.textContent = "Giriş yapılıyor...";
            await handleLogin(authForm.email.value, authForm.password.value);
            loginBtn.disabled = false;
            loginBtn.textContent = "Giriş Yap";
        });
        
        signupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            signupBtn.disabled = true;
            signupBtn.textContent = "Kayıt olunuyor...";
            await handleSignUp(authForm.email.value, authForm.password.value);
            signupBtn.disabled = false;
            signupBtn.textContent = "Kayıt Ol";
        });

        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            passwordResetModal.classList.remove('hidden');
            passwordResetModal.classList.add('flex');
        });

        cancelResetBtn.addEventListener('click', () => {
            passwordResetModal.classList.add('hidden');
            passwordResetModal.classList.remove('flex');
        });

        passwordResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            sendResetBtn.disabled = true;
            sendResetBtn.textContent = "Gönderiliyor...";
            await handlePasswordResetRequest(passwordResetForm['reset-email'].value);
            sendResetBtn.disabled = false;
            sendResetBtn.textContent = "Gönder";
        });
    }

    const handleSignUp = async (email, password) => {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) {
            showNotification(`Kayıt hatası: ${error.message}`, 'error');
        } else {
            document.getElementById('auth-form').classList.add('hidden');
            document.getElementById('user-email-confirm').textContent = email;
            document.getElementById('signup-success-message').classList.remove('hidden');
        }
    };

    const handleLogin = async (email, password) => {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showNotification(`Giriş hatası: ${error.message}`, 'error');
        }
    };
    
    const handleLogout = async () => {
        const { error } = await _supabase.auth.signOut();
        if (error) {
            showNotification(`Çıkış hatası: ${error.message}`, 'error');
        }
    };

    const handlePasswordResetRequest = async (email) => {
        const { data, error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href, 
        });

        if (error) {
            showNotification(`Hata: ${error.message}`, 'error');
        } else {
            showNotification('Şifre sıfırlama linki e-postana gönderildi.', 'success');
            passwordResetModal.classList.add('hidden');
            passwordResetModal.classList.remove('flex');
        }
    };

    const handlePasswordUpdate = async (newPassword) => {
        const { data, error } = await _supabase.auth.updateUser({ password: newPassword });
        if (error) {
            showNotification(`Şifre güncellenemedi: ${error.message}`, 'error');
        } else {
            showNotification('Şifreniz başarıyla güncellendi!', 'success');
            updatePasswordForm.reset();
        }
    };
    
    // ============== APP INITIALIZATION ==============
    
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 6 karakter):");
            if (newPassword && newPassword.length >= 6) {
                await handlePasswordUpdate(newPassword);
            } else if (newPassword) {
                 showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
            }
        }

        const authEl = document.getElementById('auth-container');
        const appEl = document.getElementById('app-container');

        if (session && session.user) {
            currentUser = session.user;
            authEl.style.display = 'none';
            appEl.style.display = 'block';
            if (!listenersAttached) {
                listenersAttached = true; 
                setupEventListeners();
            }
            initializeUserSession();
        } else {
            currentUser = null;
            authEl.style.display = 'flex';
            appEl.style.display = 'none';
            bets = [];
            customPlatforms = [];
            sponsors = [];
            ads = [];
        }
    });

    async function initializeUserSession() {
        if (!currentUser) return;
        
        userEmailDisplay.textContent = currentUser.email;
        if (currentUser.id === ADMIN_USER_ID) {
            sponsorManagementPanel.style.display = 'block';
            adManagementPanel.style.display = 'block';
        } else {
            sponsorManagementPanel.style.display = 'none';
            adManagementPanel.style.display = 'none';
        }

        await loadData();
        initializeUI();
        showWelcomeNotification();
        showLoginAdPopup();
    }

    async function loadData() {
        if (!currentUser) return;

        const [betsResponse, platformsResponse, sponsorsResponse, adsResponse] = await Promise.all([
            _supabase.from('bets').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
            _supabase.from('platforms').select('id, name').eq('user_id', currentUser.id),
            _supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
            _supabase.from('ads').select('*').order('created_at', { ascending: false })
        ]);

        if (betsResponse.error) console.error('Bahisler yüklenemedi:', betsResponse.error);
        else bets = betsResponse.data;

        if (platformsResponse.error) console.error('Platformlar yüklenemedi:', platformsResponse.error);
        else customPlatforms = platformsResponse.data;
        
        if (sponsorsResponse.error) console.error('Sponsorlar yüklenemedi:', sponsorsResponse.error);
        else sponsors = sponsorsResponse.data;

        if (adsResponse.error) console.error('Reklamlar yüklenemedi:', adsResponse.error);
        else ads = adsResponse.data;
    }


    function initializeUI() {
        setDefaultDates();
        populatePlatformOptions();
        renderCustomPlatforms();
        renderSponsorsPage(); 
        renderSponsorManagementList();
        renderAdManagementList();
        renderDashboardBannerAd();
        updateAllStatsAndRenders();
    }
    
    function updateAllStatsAndRenders() {
        updateStats();
        updateStatisticsPage();
        renderHistory();
        renderRecentBets();
        renderCashHistory();
         if (currentSection === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
            updateCharts();
        }
    }
    
    function setupEventListeners() {
        logoutBtn.addEventListener('click', handleLogout);
        document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
            item.addEventListener('click', () => showSection(item.dataset.section, item));
        });
        document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
        document.getElementById('mobile-menu-toggle').addEventListener('click', toggleMobileSidebar);
        document.getElementById('quick-add-btn').addEventListener('click', openQuickAddModal);
        document.getElementById('cash-transaction-btn').addEventListener('click', openCashTransactionModal);
        document.getElementById('show-history-btn').addEventListener('click', () => showSection('history', document.querySelector('[data-section="history"]')));
        document.getElementById('floating-add-btn').addEventListener('click', openQuickAddModal);
        document.getElementById('bet-form').addEventListener('submit', handleBetFormSubmit);
        document.getElementById('reset-form-btn').addEventListener('click', resetForm);
        document.getElementById('platform-manager-btn').addEventListener('click', openPlatformManager);
        document.getElementById('gemini-analyze-btn').addEventListener('click', analyzeBetSlip);
        document.getElementById('status-filter').addEventListener('change', () => {
            currentPage = 1;
            renderHistory();
        });
        document.getElementById('clear-all-btn').addEventListener('click', clearAllData);
        document.getElementById('add-platform-btn').addEventListener('click', () => addCustomPlatform(false));
        document.getElementById('import-btn').addEventListener('click', openImportModal);
        document.getElementById('export-btn').addEventListener('click', exportData);
        document.getElementById('clear-all-settings-btn').addEventListener('click', clearAllData);
        document.getElementById('reset-bankroll-btn').addEventListener('click', resetBankroll);
        document.getElementById('close-platform-manager-btn').addEventListener('click', closePlatformManager);
        document.getElementById('add-platform-modal-btn').addEventListener('click', () => addCustomPlatform(true));
        document.getElementById('cash-transaction-close-btn').addEventListener('click', closeCashTransactionModal);
        document.getElementById('cash-deposit-btn').addEventListener('click', () => handleCashTransaction('deposit'));
        document.getElementById('cash-withdrawal-btn').addEventListener('click', () => handleCashTransaction('withdrawal'));
        document.getElementById('quick-add-form').addEventListener('submit', handleQuickAddSubmit);
        document.getElementById('close-quick-add-btn').addEventListener('click', closeQuickAddModal);
        document.getElementById('close-import-btn').addEventListener('click', closeImportModal);
        document.getElementById('import-data-btn').addEventListener('click', importData);
        sponsorForm.addEventListener('submit', handleSponsorFormSubmit);
        adForm.addEventListener('submit', handleAdFormSubmit);
        closeAdPopupBtn.addEventListener('click', () => adPopupModal.classList.add('hidden'));
        
        updatePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword.length < 6) {
                showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification('Şifreler eşleşmiyor.', 'error');
                return;
            }

            handlePasswordUpdate(newPassword);
        });

        document.getElementById('edit-status').addEventListener('change', () => {
            const status = document.getElementById('edit-status').value;
            const winAmountSection = document.getElementById('win-amount-section');
            const winAmountInput = document.getElementById('edit-win-amount');

            if (status === 'won') {
                winAmountSection.classList.remove('hidden');
                if (currentlyEditingBet) {
                    const calculatedWin = currentlyEditingBet.bet_amount * currentlyEditingBet.odds;
                    winAmountInput.value = calculatedWin.toFixed(2);
                }
            } else {
                winAmountSection.classList.add('hidden');
                winAmountInput.value = 0;
            }
        });
        document.getElementById('save-edit-btn').addEventListener('click', saveEdit);
        document.getElementById('close-edit-btn').addEventListener('click', closeEditModal);
        document.getElementById('image-modal').addEventListener('click', closeImageModal);
        setupImageUpload('main');
        setupImageUpload('quick');
        setupKeyboardShortcuts();
    }


    // ============== DATA MANIPULATION (CRUD) ==============

    async function handleAdFormSubmit(e) {
        e.preventDefault();
        if (currentUser.id !== ADMIN_USER_ID) {
            showNotification('Bu işlem için yetkiniz yok.', 'error');
            return;
        }
        const image_url = document.getElementById('ad-image-url').value;
        const target_url = document.getElementById('ad-target-url').value;
        const location = document.getElementById('ad-location').value;

        if (!image_url || !target_url || !location) {
            showNotification('Lütfen tüm reklam alanlarını doldurun.', 'warning');
            return;
        }

        const { data, error } = await _supabase
            .from('ads')
            .insert({ image_url, target_url, location, user_id: ADMIN_USER_ID })
            .select();
        
        if (error) {
            showNotification('Reklam eklenirken hata oluştu.', 'error');
        } else {
            ads.unshift(data[0]);
            renderAdManagementList();
            renderDashboardBannerAd();
            adForm.reset();
            showNotification(`📢 Yeni reklam eklendi!`, 'success');
        }
    }

    async function deleteAd(id) {
        if (currentUser.id !== ADMIN_USER_ID) {
            showNotification('Bu işlem için yetkiniz yok.', 'error');
            return;
        }
        if (confirm(`Bu reklamı silmek istediğinizden emin misiniz?`)) {
            const { error } = await _supabase.from('ads').delete().eq('id', id);

            if (error) {
                showNotification('Reklam silinirken hata oluştu.', 'error');
            } else {
                ads = ads.filter(ad => ad.id !== id);
                renderAdManagementList();
                renderDashboardBannerAd();
                showNotification(`Reklam silindi.`, 'error');
            }
        }
    }

    async function handleSponsorFormSubmit(e) {
        e.preventDefault();
        if (currentUser.id !== ADMIN_USER_ID) {
            showNotification('Bu işlem için yetkiniz yok.', 'error');
            return;
        }
        const name = document.getElementById('sponsor-name').value;
        const logo_url = document.getElementById('sponsor-logo-url').value;
        const target_url = document.getElementById('sponsor-target-url').value;

        if (!name || !logo_url || !target_url) {
            showNotification('Lütfen tüm sponsor alanlarını doldurun.', 'warning');
            return;
        }
        
        const { data, error } = await _supabase
            .from('sponsors')
            .insert({ name, logo_url, target_url, user_id: ADMIN_USER_ID })
            .select();

        if (error) {
            showNotification('Sponsor eklenirken hata oluştu.', 'error');
            console.error(error);
        } else {
            sponsors.unshift(data[0]);
            renderSponsorsPage();
            renderSponsorManagementList();
            sponsorForm.reset();
            showNotification(`🏆 "${name}" sponsoru eklendi!`, 'success');
        }
    }

    async function deleteSponsor(id, name) {
        if (currentUser.id !== ADMIN_USER_ID) {
            showNotification('Bu işlem için yetkiniz yok.', 'error');
            return;
        }
        if (confirm(`'${name}' sponsorunu silmek istediğinizden emin misiniz?`)) {
            const { error } = await _supabase.from('sponsors').delete().eq('id', id);

            if (error) {
                showNotification('Sponsor silinirken hata oluştu.', 'error');
            } else {
                sponsors = sponsors.filter(s => s.id !== id);
                renderSponsorsPage();
                renderSponsorManagementList();
                showNotification(`"${name}" sponsoru silindi.`, 'error');
            }
        }
    }
    
    async function addCustomPlatform(fromModal = false) {
        const inputId = fromModal ? 'new-platform-name-modal' : 'new-platform-name';
        const input = document.getElementById(inputId);
        const name = input.value.trim();
        const allPlatforms = [...defaultPlatforms, ...customPlatforms.map(p => p.name)];

        if (name && !allPlatforms.includes(name)) {
            const { data, error } = await _supabase.from('platforms').insert({ name: name, user_id: currentUser.id }).select();
            if(error){
                showNotification('Platform eklenemedi.', 'error');
                console.error(error);
            } else {
                customPlatforms.push(data[0]);
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

    async function removeCustomPlatform(platformId, platformName) {
        if (confirm(`'${platformName}' platformunu silmek istediğinizden emin misiniz?`)) {
            const { error } = await _supabase.from('platforms').delete().eq('id', platformId);
            if(error){
                showNotification('Platform silinemedi.', 'error');
            } else {
                customPlatforms = customPlatforms.filter(p => p.id !== platformId);
                renderCustomPlatforms();
                renderCustomPlatformsModal();
                populatePlatformOptions();
                showNotification(`🗑️ ${platformName} platformu silindi`, 'error');
            }
        }
    }

    async function handleBetFormSubmit(e) {
        e.preventDefault();
        const newBetData = {
            user_id: currentUser.id,
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
        
        const { data, error } = await _supabase.from('bets').insert(newBetData).select();

        if(error) {
            showNotification('Bahis eklenirken hata oluştu: ' + error.message, 'error');
            console.error(error);
        } else {
            bets.unshift(data[0]);
            updateAllStatsAndRenders();
            resetForm();
            showNotification('🎯 Yeni bahis başarıyla eklendi!', 'success');
        }
    }

    async function handleQuickAddSubmit(e) {
        e.preventDefault();
        const newBetData = {
            user_id: currentUser.id,
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
        
        const { data, error } = await _supabase.from('bets').insert(newBetData).select();
         if(error) {
            showNotification('Hızlı bahis eklenemedi.', 'error');
        } else {
            bets.unshift(data[0]);
            updateAllStatsAndRenders();
            closeQuickAddModal();
            showNotification('🚀 Hızlı bahis eklendi!', 'success');
        }
    }
    
    async function saveEdit() {
        const bet = bets.find(b => b.id === editingBetId);
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

        const { data, error } = await _supabase
            .from('bets')
            .update(updateData)
            .eq('id', editingBetId)
            .select();

        if(error){
             showNotification('Bahis güncellenemedi.', 'error');
        } else {
            const index = bets.findIndex(b => b.id === editingBetId);
            if (index !== -1) bets[index] = data[0];
            updateAllStatsAndRenders();
            closeEditModal();
            showNotification('✔️ Bahis güncellendi!', 'info');
        }
    }

    async function deleteBet(id) {
        if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
            const { error } = await _supabase.from('bets').delete().eq('id', id);
            if(error){
                showNotification('Kayıt silinemedi.', 'error');
            } else {
                bets = bets.filter(b => b.id !== id);
                updateAllStatsAndRenders();
                showNotification('🗑️ Kayıt silindi.', 'error');
            }
        }
    }

    async function handleCashTransaction(type) {
        const input = document.getElementById('cash-amount');
        let amount = parseFloat(input.value);

        if (isNaN(amount) || amount <= 0) {
            showNotification('Lütfen geçerli bir miktar girin.', 'error');
            return;
        }

        const isDeposit = type === 'deposit';
        const profitLoss = isDeposit ? amount : -amount;

        const cashTransaction = {
            user_id: currentUser.id,
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
        
        const { data, error } = await _supabase.from('bets').insert(cashTransaction).select();
        if(error){
            showNotification('Kasa işlemi kaydedilemedi.', 'error');
        } else {
            bets.unshift(data[0]);
            updateAllStatsAndRenders();
            closeCashTransactionModal();
            showNotification(`💸 Kasa işlemi kaydedildi: ${profitLoss.toFixed(2)} ₺`, 'success');
        }
    }

    async function resetBankroll() {
        if (confirm('Tüm kasa bakiyesini sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            const currentBankroll = bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
            if (currentBankroll !== 0) {
                const resetTransaction = {
                    user_id: currentUser.id,
                    platform: 'Kasa Sıfırlama',
                    bet_type: 'Kasa İşlemi',
                    description: 'Bakiye Sıfırlandı',
                    bet_amount: Math.abs(currentBankroll),
                    odds: 1,
                    date: new Date().toISOString().split('T')[0],
                    status: 'lost',
                    win_amount: 0,
                    profit_loss: -currentBankroll,
                };
                 const { data, error } = await _supabase.from('bets').insert(resetTransaction).select();
                 if(error){
                     showNotification('Kasa sıfırlanamadı.', 'error');
                 } else {
                     bets.unshift(data[0]);
                     updateAllStatsAndRenders();
                     showNotification('🔄 Kasa sıfırlandı!', 'warning');
                 }
            }
        }
    }
    
    async function clearAllData() {
         if (confirm('TÜM KİŞİSEL VERİLERİNİZİ (BAHİS, PLATFORM) SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!')) {
            const [betsRes, platformsRes] = await Promise.all([
                _supabase.from('bets').delete().eq('user_id', currentUser.id),
                _supabase.from('platforms').delete().eq('user_id', currentUser.id)
            ]);

            if(betsRes.error || platformsRes.error) {
                showNotification('Veriler silinirken bir hata oluştu.', 'error');
            } else {
                bets = [];
                customPlatforms = [];
                updateAllStatsAndRenders();
                populatePlatformOptions();
                renderCustomPlatforms();
                showNotification('🗑️ Kişisel verileriniz silindi!', 'error');
            }
        }
    }

     // ============== UI & HELPERS ==============
    
    function showWelcomeNotification() {
         setTimeout(() => {
            if(currentUser) {
                showNotification(`🚀 Hoş geldin ${currentUser.email}!`, 'success');
            }
        }, 1000);
    }
    
    function showNotification(message, type = 'info', duration = 4000) {
        const notificationsContainer = document.getElementById('notifications');
        const notification = document.createElement('div');
        const colors = { success: 'from-green-500 to-emerald-600', error: 'from-red-500 to-red-600', warning: 'from-yellow-500 to-orange-600', info: 'from-blue-500 to-blue-600' };
        notification.className = `notification bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg max-w-sm glass-card`;
        notification.innerHTML = `<div class="flex items-center justify-between"><span class="font-medium">${message}</span><button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200 text-xl">×</button></div>`;
        notificationsContainer.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    }
    
    function showSection(sectionName, clickedElement) {
        document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionName)?.classList.add('active');
        document.querySelectorAll('.sidebar-item[data-section]').forEach(item => item.classList.remove('active'));
        clickedElement?.classList.add('active');
        currentSection = sectionName;
        document.getElementById('sidebar').classList.remove('mobile-open');
        if (sectionName === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
            updateCharts();
        }
    }
    
    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('main-content').classList.toggle('expanded');
    }

    function toggleMobileSidebar() {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    }

    function populatePlatformOptions() {
        const allPlatforms = [...defaultPlatforms, ...customPlatforms.map(p => p.name)].sort();
        const platformSelects = [document.getElementById('platform'), document.getElementById('quick-platform')];
        platformSelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Platform Seçin</option>';
                allPlatforms.forEach(platform => {
                    const option = document.createElement('option');
                    option.value = platform;
                    option.textContent = platform;
                    select.appendChild(option);
                });
            }
        });
    }

    function renderCustomPlatforms() {
        const container = document.getElementById('custom-platforms-list');
        if (!container) return;
        if (customPlatforms.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Henüz özel platform eklenmemiş</p>';
            return;
        }
        container.innerHTML = customPlatforms.map(p => `
            <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                <span class="text-white text-sm">${p.name}</span>
                <button onclick="removeCustomPlatform(${p.id}, '${p.name}')" class="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded">🗑️</button>
            </div>
        `).join('');
    }

    function renderCustomPlatformsModal() {
        const container = document.getElementById('custom-platforms-list-modal');
        if (!container) return;
        if (customPlatforms.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Henüz özel platform eklenmemiş</p>';
            return;
        }
        container.innerHTML = customPlatforms.map(p => `
            <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-2 rounded">
                <span class="text-white text-sm">${p.name}</span>
                <button onclick="removeCustomPlatform(${p.id}, '${p.name}')" class="text-red-400 hover:text-red-300 text-sm">🗑️</button>
            </div>
        `).join('');
    }

    function renderSponsorsPage() {
        if (!sponsorsGridContainer) return;
        if (sponsors.length === 0) {
            sponsorsGridContainer.innerHTML = `<div class="text-center py-16 text-gray-400 col-span-full"><div class="text-6xl mb-4">🏆</div><p class="text-xl">Henüz sponsor bulunmuyor.</p></div>`;
            return;
        }
        sponsorsGridContainer.innerHTML = sponsors.map(s => `
            <a href="${s.target_url}" target="_blank" rel="noopener noreferrer" class="sponsor-card glass-card rounded-2xl block p-4">
                <div class="h-40 flex items-center justify-center rounded-xl overflow-hidden mb-4 bg-black bg-opacity-20">
                    <img src="${s.logo_url}" alt="${s.name} Logosu" class="max-h-full max-w-full object-contain">
                </div>
                <h4 class="font-bold text-center text-lg text-white">${s.name}</h4>
            </a>
        `).join('');
    }

    function renderSponsorManagementList() {
        if (!sponsorsListContainer) return;
        if (sponsors.length === 0) {
            sponsorsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz sponsor eklenmemiş.</p>';
            return;
        }
        sponsorsListContainer.innerHTML = sponsors.map(s => `
            <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                <div class="flex items-center space-x-3">
                    <img src="${s.logo_url}" class="w-10 h-10 object-contain rounded-md bg-white p-1">
                    <div>
                        <p class="text-white font-semibold">${s.name}</p>
                        <a href="${s.target_url}" target="_blank" class="text-xs text-blue-400 hover:underline">${s.target_url}</a>
                    </div>
                </div>
                <button onclick="deleteSponsor(${s.id}, '${s.name.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 text-xl px-2 py-1 rounded">🗑️</button>
            </div>
        `).join('');
    }

    function renderAdManagementList() {
        if (!adsListContainer) return;
        if (ads.length === 0) {
            adsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz reklam eklenmemiş.</p>';
            return;
        }
        adsListContainer.innerHTML = ads.map(ad => `
            <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                <div class="flex items-center space-x-3">
                    <img src="${ad.image_url}" class="w-16 h-10 object-cover rounded-md">
                    <div>
                        <p class="text-white font-semibold">${ad.location === 'login_popup' ? 'Giriş Pop-up' : 'Ana Panel Banner'}</p>
                        <a href="${ad.target_url}" target="_blank" class="text-xs text-blue-400 hover:underline">${ad.target_url}</a>
                    </div>
                </div>
                <button onclick="deleteAd(${ad.id})" class="text-red-400 hover:text-red-300 text-xl px-2 py-1 rounded">🗑️</button>
            </div>
        `).join('');
    }

    function renderDashboardBannerAd() {
        if (!dashboardAdBanner) return;
        const bannerAd = ads.find(ad => ad.location === 'dashboard_banner');
        if (bannerAd) {
            dashboardAdBanner.innerHTML = `
                <a href="${bannerAd.target_url}" target="_blank" rel="noopener noreferrer">
                    <img src="${bannerAd.image_url}" alt="Reklam" class="rounded-2xl w-full object-cover">
                </a>
            `;
            dashboardAdBanner.style.display = 'block';
        } else {
            dashboardAdBanner.innerHTML = '';
            dashboardAdBanner.style.display = 'none';
        }
    }

    function showLoginAdPopup() {
        const popupAd = ads.find(ad => ad.location === 'login_popup');
        if (popupAd) {
            document.getElementById('ad-popup-image').src = popupAd.image_url;
            document.getElementById('ad-popup-link').href = popupAd.target_url;
            adPopupModal.classList.remove('hidden');
            adPopupModal.classList.add('flex');
        }
    }

    function openPlatformManager() {
        document.getElementById('platform-manager-modal')?.classList.remove('hidden');
        document.getElementById('platform-manager-modal')?.classList.add('flex');
        renderCustomPlatformsModal();
    }

    function closePlatformManager() { document.getElementById('platform-manager-modal')?.classList.add('hidden'); }
    function openCashTransactionModal() { document.getElementById('cash-transaction-modal')?.classList.remove('hidden'); document.getElementById('cash-transaction-modal')?.classList.add('flex'); }
    function closeCashTransactionModal() { const modal = document.getElementById('cash-transaction-modal'); modal?.classList.add('hidden'); modal?.classList.remove('flex'); document.getElementById('cash-amount').value = ''; }
    function openQuickAddModal() { document.getElementById('quick-add-modal')?.classList.remove('hidden'); document.getElementById('quick-add-modal')?.classList.add('flex'); }
    function closeQuickAddModal() { const modal = document.getElementById('quick-add-modal'); modal?.classList.add('hidden'); modal?.classList.remove('flex'); document.getElementById('quick-add-form')?.reset(); removeImage('quick'); }
    function openImportModal() { showNotification("Bu özellik Supabase entegrasyonu ile devre dışı bırakılmıştır.", "info"); }
    function exportData() {
        const dataToExport = { bets, customPlatforms: customPlatforms.map(p => p.name) };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kasamatik-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('📤 Kişisel verileriniz dışa aktarıldı!', 'success');
    }
    function importData() { showNotification("Bu özellik Supabase entegrasyonu ile devre dışı bırakılmıştır.", "info"); }
    function closeImportModal() { document.getElementById('import-modal')?.classList.add('hidden'); document.getElementById('import-file').value = ''; document.getElementById('import-text').value = ''; }
    
    function openEditModal(id) {
        editingBetId = id;
        const bet = bets.find(b => b.id === id);
        if (!bet) return;

        currentlyEditingBet = bet;

        document.getElementById('edit-status').value = bet.status;
        document.getElementById('edit-win-amount').value = bet.win_amount;
        
        document.getElementById('edit-modal')?.classList.remove('hidden');
        document.getElementById('edit-modal')?.classList.add('flex');
    }

    function closeEditModal() { document.getElementById('edit-modal')?.classList.add('hidden'); editingBetId = null; }
    function showImageModal(imageSrc) { const modal = document.getElementById('image-modal'); document.getElementById('modal-image').src = imageSrc; modal?.classList.remove('hidden'); modal?.classList.add('flex'); }
    function closeImageModal() { document.getElementById('image-modal')?.classList.add('hidden'); }
    function setDefaultDates() { const today = new Date().toISOString().split('T')[0]; document.getElementById('bet-date').value = today; }
    function resetForm() { document.getElementById('bet-form').reset(); setDefaultDates(); removeImage('main'); }
    function setupKeyboardShortcuts() { document.addEventListener('paste', handleGlobalPaste); }
    
    function setupImageUpload(type) {
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
                if (eventName === 'drop') {
                    handleImageFile(e.dataTransfer.files[0], type);
                }
            });
        });
    }

    function handleImageFile(file, type) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
            const imageData = e.target.result;
            const prefix = type === 'main' ? '' : 'quick-';
            if (type === 'main') {
                currentImageData = imageData;
                document.getElementById('gemini-analyze-btn').disabled = false;
            } else {
                quickImageData = imageData;
            }
            document.getElementById(`${prefix}preview-img`).src = imageData;
            document.getElementById(`${prefix}upload-area`).classList.add('hidden');
            document.getElementById(`${prefix}image-preview`).classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function removeImage(type) {
        const prefix = type === 'main' ? '' : 'quick-';
        if (type === 'main') {
            currentImageData = null;
            document.getElementById('gemini-analyze-btn').disabled = true;
        } else {
            quickImageData = null;
        }
        document.getElementById(`${prefix}upload-area`).classList.remove('hidden');
        document.getElementById(`${prefix}image-preview`).classList.add('hidden');
        document.getElementById(`${prefix}image-input`).value = '';
    }
    
    function handleGlobalPaste(e) {
        const file = Array.from(e.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (!file) return;
        const quickModalOpen = !document.getElementById('quick-add-modal').classList.contains('hidden');
        const type = quickModalOpen ? 'quick' : 'main';
        if (type === 'main' && currentSection !== 'new-bet') {
            return;
        }
        handleImageFile(file, type);
    }

    // ============== STATS & RENDERING ==============
    
    function updateStats() {
        const actualBets = bets.filter(b => b.bet_type !== 'Kasa İşlemi');
        const totalProfit = actualBets.reduce((sum, bet) => sum + (bet.profit_loss > 0 ? bet.profit_loss : 0), 0);
        const totalLoss = Math.abs(actualBets.reduce((sum, bet) => sum + (bet.profit_loss < 0 ? bet.profit_loss : 0), 0));
        const totalBankroll = bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
        document.getElementById('total-bets').textContent = actualBets.length;
        document.getElementById('total-profit').textContent = `+${totalProfit.toFixed(2)} ₺`;
        document.getElementById('total-loss').textContent = `-${totalLoss.toFixed(2)} ₺`;
        const bankrollEl = document.getElementById('total-bankroll');
        bankrollEl.textContent = `${totalBankroll.toFixed(2)} ₺`;
        bankrollEl.className = `text-2xl font-montserrat font-bold ${totalBankroll >= 0 ? 'text-green-400' : 'text-red-400'}`;
    }
    
    function updateStatisticsPage() {
        const actualBets = bets.filter(b => b.bet_type !== 'Kasa İşlemi');
        const settledBets = actualBets.filter(b => b.status !== 'pending');
        const wonBets = settledBets.filter(b => b.status === 'won');
        document.getElementById('stats-total-bets').textContent = actualBets.length;
        const sportsBetsCount = actualBets.filter(b => b.bet_type === 'Spor Bahis').length;
        const liveBetsCount = actualBets.filter(b => b.bet_type === 'Canlı Bahis').length;
        document.getElementById('stats-bet-breakdown').textContent = `Spor: ${sportsBetsCount} | Canlı: ${liveBetsCount}`;
        const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
        document.getElementById('stats-win-rate').textContent = `${winRate.toFixed(1)}%`;
        document.getElementById('stats-win-breakdown').textContent = `Kazanan: ${wonBets.length} | Kaybeden: ${settledBets.length - wonBets.length}`;
        const sportsBets = actualBets.filter(b => (b.bet_type === 'Spor Bahis' || b.bet_type === 'Canlı Bahis') && b.odds > 0);
        const avgOdds = sportsBets.length > 0 ? sportsBets.reduce((sum, b) => sum + b.odds, 0) / sportsBets.length : 0;
        document.getElementById('stats-avg-odds').textContent = avgOdds.toFixed(2);
        const odds = sportsBets.map(b => b.odds);
        document.getElementById('stats-odds-range').textContent = `En düşük: ${odds.length ? Math.min(...odds).toFixed(2) : '0.00'} | En yüksek: ${odds.length ? Math.max(...odds).toFixed(2) : '0.00'}`;
        const totalInvested = actualBets.reduce((sum, b) => sum + b.bet_amount, 0);
        const netProfit = actualBets.reduce((sum, b) => sum + b.profit_loss, 0);
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
        document.getElementById('stats-roi').textContent = `${roi.toFixed(1)}%`;
        document.getElementById('stats-roi-breakdown').textContent = `Yatırım: ${totalInvested.toFixed(2)}₺ | Net kar: ${netProfit.toFixed(2)}₺`;
        document.getElementById('stats-roi').style.color = roi >= 0 ? 'var(--success-green)' : 'var(--danger-red)';
        const avgBet = actualBets.length > 0 ? totalInvested / actualBets.length : 0;
        document.getElementById('stats-avg-bet').textContent = `${avgBet.toFixed(2)}₺`;
        const amounts = actualBets.map(b => b.bet_amount);
        document.getElementById('stats-bet-range').textContent = `En düşük: ${amounts.length ? Math.min(...amounts).toFixed(2) : '0.00'}₺ | En yüksek: ${amounts.length ? Math.max(...amounts).toFixed(2) : '0.00'}₺`;
        const platformProfits = {};
        actualBets.forEach(bet => { if (!platformProfits[bet.platform]) platformProfits[bet.platform] = 0; platformProfits[bet.platform] += bet.profit_loss; });
        const bestPlatform = Object.entries(platformProfits).sort((a, b) => b[1] - a[1])[0];
        if(bestPlatform && bestPlatform[1] > 0) {
            document.getElementById('stats-best-platform').textContent = bestPlatform[0];
            document.getElementById('stats-platform-profit').textContent = `Kar: +${bestPlatform[1].toFixed(2)}₺`;
        } else {
            document.getElementById('stats-best-platform').textContent = '-';
            document.getElementById('stats-platform-profit').textContent = `Kar: 0.00₺`;
        }
    }

    function updateCharts() {
        const actualBets = bets.filter(b => b.bet_type !== 'Kasa İşlemi');
        const profitCtx = document.getElementById('profitChart')?.getContext('2d');
        if (!profitCtx) return;
        let cumulativeProfit = 0;
        const profitData = [...actualBets].reverse().map(bet => { cumulativeProfit += bet.profit_loss; return cumulativeProfit; });
        if (window.profitChart instanceof Chart) { window.profitChart.destroy(); }
        window.profitChart = new Chart(profitCtx, { type: 'line', data: { labels: actualBets.map((b, i) => `Bahis ${i + 1}`), datasets: [{ label: 'Kümülatif Kar/Zarar', data: profitData, borderColor: 'rgba(139, 179, 240, 0.8)', backgroundColor: 'rgba(139, 179, 240, 0.2)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: 'rgba(255,255,255,0.7)' } }, x: { ticks: { color: 'rgba(255,255,255,0.7)' } } } } });
        
        const platformCtx = document.getElementById('platformChart')?.getContext('2d');
        if (!platformCtx) return;
        const platformCounts = actualBets.reduce((acc, bet) => { acc[bet.platform] = (acc[bet.platform] || 0) + 1; return acc; }, {});
        if (window.platformChart instanceof Chart) { window.platformChart.destroy(); }
        window.platformChart = new Chart(platformCtx, { type: 'doughnut', data: { labels: Object.keys(platformCounts), datasets: [{ label: 'Platformlara Göre Bahis Sayısı', data: Object.values(platformCounts), backgroundColor: ['#8db3f0', '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#a855f7'], borderColor: 'rgba(0,0,0,0.2)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    
    function renderHistory() {
        const actualBets = bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
        const statusFilter = document.getElementById('status-filter').value;
        let filteredBets = actualBets.filter(bet => statusFilter === 'all' || bet.status === statusFilter);
        updateHistoryStats(filteredBets);
        const historyContainer = document.getElementById('bet-history');
        if (filteredBets.length === 0) {
            historyContainer.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">📝</div><p class="text-xl">Bu filtrede bahis bulunmuyor.</p></div>`;
            document.getElementById('pagination-container').innerHTML = '';
            return;
        }
        const totalPages = Math.ceil(filteredBets.length / itemsPerPage);
        const paginatedBets = filteredBets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        historyContainer.innerHTML = paginatedBets.map(bet => {
            const statusClass = { pending: 'pending', won: 'won', lost: 'lost' };
            const statusText = { pending: '⏳ Bekleyen', won: '✅ Kazandı', lost: '❌ Kaybetti' };
            const profitColor = bet.profit_loss > 0 ? 'text-green-400' : bet.profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
            const betTypeIcon = { 'Spor Bahis': '⚽', 'Canlı Bahis': '🔴' };
            let actionButtons = (bet.status === 'pending')
                ? `<button onclick="openEditModal(${bet.id})" class="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">✏️ Sonuçlandır</button>`
                : `<button onclick="openEditModal(${bet.id})" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">✏️ Düzenle</button>`;

            return `<div class="bet-card ${statusClass[bet.status]}"><div class="flex flex-col space-y-4"><div class="flex justify-between items-start"><div class="flex items-center space-x-3"><div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">${betTypeIcon[bet.bet_type] || '🎯'}</div><div><h3 class="font-bold text-white text-lg">${bet.platform}</h3><p class="text-gray-400 text-sm">${bet.bet_type}</p></div></div><span class="px-4 py-2 rounded-full text-sm font-medium ${statusClass[bet.status]}">${statusText[bet.status]}</span></div><div class="bg-gray-800 bg-opacity-30 rounded-lg p-3"><p>${bet.description}</p></div><div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Tarih</div><div class="font-semibold">${new Date(bet.date + 'T00:00:00').toLocaleDateString('tr-TR')}</div></div><div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Miktar</div><div class="font-semibold">${bet.bet_amount.toFixed(2)} ₺</div></div>${bet.bet_type !== 'Slot' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Oran</div><div class="font-semibold">${bet.odds}</div></div>` : ''}${bet.status !== 'pending' ? `<div class="bg-gray-700 bg-opacity-40 rounded-lg p-3 text-center"><div class="text-xs text-gray-400 mb-1">Kar/Zarar</div><div class="font-bold ${profitColor}">${bet.profit_loss >= 0 ? '+' : ''}${bet.profit_loss.toFixed(2)} ₺</div></div>` : ''}</div>${bet.image_url ? `<div class="flex justify-center"><img src="${bet.image_url}" class="max-w-48 max-h-32 rounded-xl cursor-pointer" onclick="showImageModal('${bet.image_url}')"></div>` : ''}<div class="flex gap-3 pt-4 border-t border-gray-600">${actionButtons}<button onclick="deleteBet(${bet.id})" class="px-4 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️ Sil</button></div></div></div>`;
        }).join('');
        renderPagination('bets', totalPages, currentPage, changePage);
    }
    
    function updateHistoryStats(filteredBets) {
        const els = {
            total: document.getElementById('history-total-bets'),
            won: document.getElementById('history-won-bets'),
            lost: document.getElementById('history-lost-bets'),
            pending: document.getElementById('history-pending-bets')
        };
        if(els.total) els.total.textContent = filteredBets.length;
        if(els.won) els.won.textContent = filteredBets.filter(b => b.status === 'won').length;
        if(els.lost) els.lost.textContent = filteredBets.filter(b => b.status === 'lost').length;
        if(els.pending) els.pending.textContent = filteredBets.filter(b => b.status === 'pending').length;
    }

    function renderCashHistory() {
        const cashTransactions = bets.filter(bet => bet.bet_type === 'Kasa İşlemi');
        updateCashHistoryStats(cashTransactions);
        const container = document.getElementById('cash-history-list');
        if (cashTransactions.length === 0) {
            container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">💸</div><p class="text-xl">Henüz kasa işlemi bulunmuyor.</p></div>`;
            document.getElementById('cash-pagination-container').innerHTML = '';
            return;
        }
        const totalPages = Math.ceil(cashTransactions.length / itemsPerPage);
        const paginatedTxs = cashTransactions.slice((cashCurrentPage - 1) * itemsPerPage, cashCurrentPage * itemsPerPage);
        container.innerHTML = paginatedTxs.map(tx => {
            const isDeposit = tx.profit_loss > 0;
            const amountColor = isDeposit ? 'text-green-400' : 'text-red-400';
            const icon = isDeposit ? '📥' : '📤';
            return `<div class="bet-card"><div class="flex items-center justify-between"><div class="flex items-center space-x-4"><div class="text-3xl">${icon}</div><div><h3 class="font-bold text-white">${tx.description}</h3><p class="text-sm text-gray-400">${new Date(tx.date + 'T00:00:00').toLocaleDateString('tr-TR')}</p></div></div><div class="flex items-center space-x-4"><p class="text-lg font-bold ${amountColor}">${tx.profit_loss > 0 ? '+' : ''}${tx.profit_loss.toFixed(2)} ₺</p><button onclick="deleteBet(${tx.id})" class="px-3 py-2 bg-red-800 text-white text-sm rounded-lg hover:bg-red-700">🗑️</button></div></div></div>`;
        }).join('');
        renderPagination('cash', totalPages, cashCurrentPage, changeCashPage);
    }
    
    function updateCashHistoryStats(transactions) {
        const totalDeposit = transactions.reduce((sum, tx) => sum + (tx.profit_loss > 0 ? tx.profit_loss : 0), 0);
        const totalWithdrawal = Math.abs(transactions.reduce((sum, tx) => sum + (tx.profit_loss < 0 ? tx.profit_loss : 0), 0));
        document.getElementById('cash-history-deposit').textContent = `+${totalDeposit.toFixed(2)} ₺`;
        document.getElementById('cash-history-withdrawal').textContent = `-${totalWithdrawal.toFixed(2)} ₺`;
        document.getElementById('cash-history-net').textContent = `${(totalDeposit - totalWithdrawal).toFixed(2)} ₺`;
        document.getElementById('cash-history-count').textContent = transactions.length;
    }

    function renderPagination(type, totalPages, current, changeFn) {
        const containerId = type === 'bets' ? 'pagination-container' : 'cash-pagination-container';
        const container = document.getElementById(containerId);
        if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
        let html = `<button class="pagination-btn" ${current === 1 ? 'disabled' : ''} onclick="${changeFn.name}(${current - 1})">←</button>`;
        for (let i = 1; i <= totalPages; i++) { html += `<button class="pagination-btn ${i === current ? 'active' : ''}" onclick="${changeFn.name}(${i})">${i}</button>`; }
        html += `<button class="pagination-btn" ${current === totalPages ? 'disabled' : ''} onclick="${changeFn.name}(${current + 1})">→</button>`;
        container.innerHTML = html;
    }

    function changePage(page) { currentPage = page; renderHistory(); document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' }); }
    function changeCashPage(page) { cashCurrentPage = page; renderCashHistory(); document.getElementById('cash-history')?.scrollIntoView({ behavior: 'smooth' }); }
    
    function renderRecentBets() {
        const container = document.getElementById('recent-bets');
        if (!container) return;
        const recentBets = bets.filter(b => b.bet_type !== 'Kasa İşlemi').slice(0, 5);
        if(recentBets.length === 0) { container.innerHTML = `<div class="text-center py-8 text-gray-400">📝 Henüz bahis yok.</div>`; return; }
        container.innerHTML = recentBets.map(bet => {
            const statusClass = { pending: 'status-pending', won: 'status-won', lost: 'status-lost' };
            const statusText = { pending: '⏳', won: '✅', lost: '❌' };
            const profitColor = bet.profit_loss > 0 ? 'text-green-400' : bet.profit_loss < 0 ? 'text-red-400' : 'text-gray-400';
            return `<div class="bet-item"><div class="flex justify-between items-center"><div class="flex-1 min-w-0"><div class="flex items-center space-x-2 mb-1"><span class="font-medium text-white text-sm">${bet.platform}</span><span class="px-2 py-1 rounded-full text-xs ${statusClass[bet.status]}">${statusText[bet.status]}</span></div><p class="text-gray-300 text-xs truncate">${bet.description}</p></div><div class="text-right ml-2"><div class="font-bold text-sm">${bet.bet_amount.toFixed(2)} ₺</div>${bet.status !== 'pending' ? `<div class="font-bold ${profitColor} text-sm">${bet.profit_loss >= 0 ? '+' : ''}${bet.profit_loss.toFixed(2)} ₺</div>` : ''}</div></div></div>`;
        }).join('');
    }

    // ============== GEMINI API ==============
    
    async function analyzeBetSlip() {
        if (!currentImageData) { showNotification('Lütfen önce bir kupon resmi yükleyin.', 'warning'); return; }
        const geminiButton = document.getElementById('gemini-analyze-btn');
        const buttonText = document.getElementById('gemini-button-text');
        const buttonIcon = document.getElementById('gemini-button-icon');
        geminiButton.disabled = true; buttonText.textContent = 'Okunuyor...'; buttonIcon.innerHTML = '🧠';
        try {
            const base64Data = currentImageData.split(',')[1];
            const result = await callGeminiApi(base64Data);
            if (result) {
                // YENİ GÖREV: Gelen yapısal veriyi işle ve description alanına yaz.
                if (result.matches && Array.isArray(result.matches)) {
                    const descriptionText = result.matches.map(match => {
                        const betsText = match.bets.join(', ');
                        return `${match.matchName}: ${betsText}`;
                    }).join('\n');
                    document.getElementById('description').value = descriptionText;
                }
                
                if (result.betAmount) document.getElementById('bet-amount').value = result.betAmount;
                if (result.odds) document.getElementById('odds').value = result.odds;
                showNotification('✨ Kupon bilgileri başarıyla okundu!', 'success');
            } else { throw new Error("API'den geçerli bir sonuç alınamadı."); }
        } catch (error) {
            console.error('Gemini API Error:', error);
            showNotification('Kupon okunurken bir hata oluştu.', 'error');
        } finally {
            geminiButton.disabled = false; buttonText.textContent = 'Kuponu Oku'; buttonIcon.innerHTML = '✨';
        }
    }

    async function callGeminiApi(base64ImageData) {
        const localApiUrl = '/api/analyze';
        const payload = { base64ImageData: base64ImageData };
        let response; let retries = 3; let delay = 1000;
        while (retries > 0) {
            try {
                response = await fetch(localApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (response.ok) return await response.json();
                else throw new Error(`API isteği başarısız oldu: ${response.status}`);
            } catch (error) {
                console.error(`Attempt failed: ${error.message}`); retries--; if (retries === 0) throw error; await new Promise(resolve => setTimeout(resolve, delay)); delay *= 2;
            }
        }
    }
    
    // ============== APP START ==============
    document.addEventListener('DOMContentLoaded', () => {
        setupAuthEventListeners();
    });
    
    // Make some functions globally accessible from inline HTML event handlers
    window.openEditModal = openEditModal;
    window.deleteBet = deleteBet;
    window.showImageModal = showImageModal;
    window.changePage = changePage;
    window.changeCashPage = changeCashPage;
    window.removeCustomPlatform = removeCustomPlatform;
    window.deleteSponsor = deleteSponsor;
    window.deleteAd = deleteAd;

})();

