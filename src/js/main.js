import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds } from './state.js';
import { DOM, ADMIN_USER_ID } from './utils/constants.js';
import { onAuthStateChange } from './api/auth.js';
import { loadInitialData } from './api/database.js';
import { setupEventListeners } from './event_listeners.js';
import { showNotification, getTodaysDate } from './utils/helpers.js';
import { updateDashboardStats, renderRecentBets, renderDashboardBannerAd, initializeVisitorCounter, updatePerformanceSummary } from './components/dashboard.js';
import { renderHistory, renderCashHistory } from './components/history.js';
import { updateStatisticsPage, updateCharts } from './components/statistics.js';
import { showSection, populatePlatformOptions, renderCustomPlatforms, renderSponsorsPage, renderAdminPanels } from './components/ui_helpers.js';
import { showLoginAdPopup } from './components/modals.js';

// ---- ANA UYGULAMA MANTIĞI ----

document.addEventListener('DOMContentLoaded', () => {
    // DOM tamamen yüklendiğinde, olay dinleyicilerini ve kimlik doğrulama kontrolünü başlat.
    // Bu, `constants.js` dosyasındaki hatayı temelden çözer.
    setupEventListeners();
    onAuthStateChange(handleAuthStateChange);
});

const loadingOverlay = document.getElementById('loading-overlay');
function toggleLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

async function handleAuthStateChange(session) {
    toggleLoading(true);
    const user = session?.user || null;

    if (user?.id === state.currentUser?.id && DOM.get('appContainer').style.display === 'block') {
        toggleLoading(false);
        return;
    }
    
    setCurrentUser(user);

    if (user) {
        await initializeApp();
    } else {
        DOM.get('authContainer').style.display = 'flex';
        DOM.get('appContainer').style.display = 'none';
        updateState({
            bets: [], customPlatforms: [], sponsors: [], ads: [],
        });
        toggleLoading(false);
    }
}


async function initializeApp() {
    if (!state.currentUser) return;

    try {
        const { bets, platforms, sponsors, ads } = await loadInitialData(state.currentUser.id);
        setBets(bets);
        setCustomPlatforms(platforms);
        setSponsors(sponsors);
        setAds(ads);
        
        initializeUI();

        DOM.get('authContainer').style.display = 'none';
        DOM.get('appContainer').style.display = 'block';

        showWelcomeNotification();
        showLoginAdPopup();
    } catch (error) {
        console.error("Uygulama başlatılırken hata:", error);
        showNotification("Veriler yüklenirken bir hata oluştu.", "error");
    } finally {
        toggleLoading(false);
    }
}

function initializeDatePickers() {
    const statsDateRangeConfig = {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                state.statsFilters.dateRange.start = selectedDates[0];
                state.statsFilters.dateRange.end = selectedDates[1];
                updateStatisticsPage();
            }
        }
    };
    flatpickr("#stats-date-range-filter", statsDateRangeConfig);
}

function setupUserInterface() {
    DOM.get('userEmailDisplay').textContent = state.currentUser.email;
    const isAdmin = state.currentUser.id === ADMIN_USER_ID;
    DOM.get('sponsorManagementPanel').style.display = isAdmin ? 'block' : 'none';
    DOM.get('adManagementPanel').style.display = isAdmin ? 'block' : 'none';
}

function initializeUI() {
    document.getElementById('bet-date').value = getTodaysDate();
    setupUserInterface();
    populatePlatformOptions();
    renderCustomPlatforms();
    renderSponsorsPage();
    renderDashboardBannerAd();
    if (state.currentUser.id === ADMIN_USER_ID) {
        renderAdminPanels();
    }
    initializeVisitorCounter();
    initializeDatePickers();
    updateAllUI();
}

export function updateAllUI() {
    updateDashboardStats();
    updatePerformanceSummary();
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

