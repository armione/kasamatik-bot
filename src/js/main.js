import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds } from './state.js';
import { DOM, ADMIN_USER_ID } from './utils/constants.js';
import { onAuthStateChange } from './api/auth.js';
import { loadInitialData } from './api/database.js';
import { setupEventListeners, setupAuthEventListeners } from './event_listeners.js'; // GÜNCELLEME
import { showNotification, getTodaysDate } from './utils/helpers.js';
import { updateDashboardStats, renderRecentBets, renderDashboardBannerAd, initializeVisitorCounter } from './components/dashboard.js';
import { renderHistory, renderCashHistory } from './components/history.js';
import { updateStatisticsPage, updateCharts } from './components/statistics.js';
import { showSection, populatePlatformOptions, renderCustomPlatforms, renderSponsorsPage, renderAdminPanels } from './components/ui_helpers.js';
import { showLoginAdPopup } from './components/modals.js';

// ---- ANA UYGULAMA MANTIĞI ----

// GÜNCELLEME: Auth dinleyicileri sayfa yüklenir yüklenmez kuruluyor.
document.addEventListener('DOMContentLoaded', setupAuthEventListeners);

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
        // Giriş ekranına dönüldüğünde auth formunu tekrar göster
        DOM.authForm.classList.remove('hidden');
        document.getElementById('signup-success-message').classList.add('hidden');
        updateState({
            bets: [], customPlatforms: [], sponsors: [], ads: [],
            listenersAttached: false
        });
    }
});

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
