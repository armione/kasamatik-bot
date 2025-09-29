import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds } from './state.js';
import { DOM, ADMIN_USER_ID } from './utils/constants.js';
import { onAuthStateChange } from './api/auth.js';
import { loadInitialData } from './api/database.js';
import { setupEventListeners } from './event_listeners.js';
import { showNotification, getTodaysDate } from './utils/helpers.js';
// GÜNCELLEME: initializeVisitorCounter içe aktarıldı
import { updateDashboardStats, renderRecentBets, renderDashboardBannerAd, initializeVisitorCounter } from './components/dashboard.js';
import { renderHistory, renderCashHistory } from './components/history.js';
import { updateStatisticsPage, updateCharts } from './components/statistics.js';
import { showSection, populatePlatformOptions, renderCustomPlatforms, renderSponsorsPage, renderAdminPanels } from './components/ui_helpers.js';
import { showLoginAdPopup } from './components/modals.js';

// ---- ANA UYGULAMA MANTIĞI ----

// Kullanıcı durumu değiştiğinde (giriş/çıkış) tetiklenir
onAuthStateChange(session => {
    const user = session?.user || null;
    setCurrentUser(user);

    if (user) {
        DOM.authContainer.style.display = 'none';
        DOM.appContainer.style.display = 'block';
        initializeApp();
    } else {
        DOM.authContainer.style.display = 'flex';
        DOM.appContainer.style.display = 'none';
        updateState({
            bets: [], customPlatforms: [], sponsors: [], ads: [],
            listenersAttached: false
        });
    }
});

// Uygulama başlatıldığında veya kullanıcı giriş yaptığında çalışır
async function initializeApp() {
    if (!state.currentUser) return;

    setupUserInterface();
    
    const { bets, platforms, sponsors, ads } = await loadInitialData(state.currentUser.id);
    setBets(bets);
    setCustomPlatforms(platforms);
    setSponsors(sponsors);
    setAds(ads);

    setupEventListeners();
    initializeUI();

    showWelcomeNotification();
    showLoginAdPopup();
}

function setupUserInterface() {
    DOM.userEmailDisplay.textContent = state.currentUser.email;
    const isAdmin = state.currentUser.id === ADMIN_USER_ID;
    DOM.sponsorManagementPanel.style.display = isAdmin ? 'block' : 'none';
    DOM.adManagementPanel.style.display = isAdmin ? 'block' : 'none';
}

function initializeUI() {
    document.getElementById('bet-date').value = getTodaysDate();
    populatePlatformOptions();
    renderCustomPlatforms();
    renderSponsorsPage();
    renderDashboardBannerAd();
    if (state.currentUser.id === ADMIN_USER_ID) {
        renderAdminPanels();
    }
    // GÜNCELLEME: Ziyaretçi sayacı burada başlatılıyor
    initializeVisitorCounter();
    updateAllUI();
}

export function updateAllUI() {
    updateDashboardStats();
    updateStatisticsPage();
    renderHistory();
    renderRecentBets();
    renderCashHistory();
    if (state.currentSection === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
        updateCharts();
    }
}

function showWelcomeNotification() {
    setTimeout(() => {
        showNotification(`🚀 Hoş geldin ${state.currentUser.email}!`, 'success');
    }, 1000);
}