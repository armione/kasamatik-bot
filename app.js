// Bu dosyanın adı: app.js
// Bu kod, tarayıcıda çalışır ve uygulamanın tüm mantığını içerir.

(function() {
    // ============== SUPABASE SETUP ==============
    const SUPABASE_URL = 'https://huaelrdjrcoljkkprewz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWVscmRqcmNvbGpra3ByZXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDI4ODMsImV4cCI6MjA3MjQxODg4M30.kYcxJtT9qQ8rMcNUD2Dy7W8kgYBK9c9xRUVUthJV2Qg';
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const ADMIN_USER_ID = 'fbf57686-1ec6-4ef0-9ee1-b908d3fae274';

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
    function setupAuthEventListeners() {
        const authForm = document.getElementById('auth-form');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const passwordResetModal = document.getElementById('password-reset-modal');
        const passwordResetForm = document.getElementById('password-reset-form');
        const cancelResetBtn = document.getElementById('cancel-reset-btn');
        const sendResetBtn = document.getElementById('send-reset-btn');

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
            document.getElementById('password-reset-modal').classList.add('hidden');
            document.getElementById('password-reset-modal').classList.remove('flex');
        }
    };

    const handlePasswordUpdate = async (newPassword) => {
        const { data, error } = await _supabase.auth.updateUser({ password: newPassword });
        if (error) {
            showNotification(`Şifre güncellenemedi: ${error.message}`, 'error');
        } else {
            showNotification('Şifreniz başarıyla güncellendi!', 'success');
            document.getElementById('update-password-form').reset();
        }
    };
    
    // ============== APP INITIALIZATION ==============
    
    _supabase.auth.onAuthStateChange(async (event, session) => {
        const authEl = document.getElementById('auth-container');
        const appEl = document.getElementById('app-container');

        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 6 karakter):");
            if (newPassword && newPassword.length >= 6) {
                await handlePasswordUpdate(newPassword);
            } else if (newPassword) {
                 showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
            }
        }

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
        
        document.getElementById('user-email-display').textContent = currentUser.email;
        const sponsorManagementPanel = document.getElementById('sponsor-management-panel');
        const adManagementPanel = document.getElementById('ad-management-panel');

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
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
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
        document.getElementById('sponsor-form').addEventListener('submit', handleSponsorFormSubmit);
        document.getElementById('ad-form').addEventListener('submit', handleAdFormSubmit);
        document.getElementById('close-ad-popup-btn').addEventListener('click', () => document.getElementById('ad-popup-modal').classList.add('hidden'));
        
        document.getElementById('update-password-form').addEventListener('submit', (e) => {
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
            document.getElementById('ad-form').reset();
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
            document.getElementById('sponsor-form').reset();
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
                customPlatforms = customPlatforms.filter(

