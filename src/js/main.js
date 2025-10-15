import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds, setSpecialOdds } from './state.js';
import { DOM, ADMIN_USER_ID } from './utils/constants.js';
import { getSupabase, onAuthStateChange } from './api/auth.js';
import { loadInitialData } from './api/database.js';
import { setupEventListeners } from './event_listeners.js';
import { showNotification, getTodaysDate } from './utils/helpers.js';
import { updateDashboardStats, renderRecentBets, renderDashboardBannerAd, initializeVisitorCounter, updatePerformanceSummary } from './components/dashboard.js';
import { renderHistory, renderCashHistory } from './components/history.js';
import { updateStatisticsPage, updateCharts } from './components/statistics.js';
import { showSection, populatePlatformOptions, renderCustomPlatforms, renderSponsorsPage, renderAdminPanels, renderSpecialOddsPage, populateSpecialOddsPlatformFilter } from './components/ui_helpers.js';
import { showLoginAdPopup } from './components/modals.js';
import { initPwaInstaller, checkAndShowSmartInstallPrompt } from './pwa_installer.js';

// ---- REALTIME GÜNCELLEME İŞLEYİCİSİ ----
function handleRealtimeUpdate(payload) {
    console.log('Realtime update received:', payload);
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
        state.specialOdds.unshift(newRecord);
        showNotification(`Yeni Fırsat: ${newRecord.platform}'da yeni özel oran!`, 'info');
    } else if (eventType === 'UPDATE') {
        const index = state.specialOdds.findIndex(o => o.id === newRecord.id);
        if (index > -1) {
            state.specialOdds[index] = { ...state.specialOdds[index], ...newRecord };
             if (oldRecord.status === 'pending' && newRecord.status === 'won') {
               showNotification(`🏆 Sonuçlandı: ${newRecord.platform} fırsatı kazandı!`, 'success');
             }
        }
    }
    
    updateAllUI();
}


// ---- ANA UYGULAMA MANTIĞI ----

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker başarıyla kaydedildi: ', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker kaydı başarısız oldu: ', error);
                });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    registerServiceWorker(); 
    initPwaInstaller();
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

    if (user?.id === state.currentUser?.id && document.getElementById('app-container').style.display === 'block') {
        toggleLoading(false);
        return;
    }
    
    setCurrentUser(user);

    if (user) {
        await initializeApp();
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        updateState({
            bets: [], customPlatforms: [], sponsors: [], ads: [], specialOdds: []
        });
        toggleLoading(false);
    }
}


async function initializeApp() {
    if (!state.currentUser) return;

    try {
        const { bets, platforms, sponsors, ads, specialOdds } = await loadInitialData(state.currentUser.id);
        setBets(bets);
        setCustomPlatforms(platforms);
        setSponsors(sponsors);
        setAds(ads);
        setSpecialOdds(specialOdds);
        
        initializeUI();

        const supabase = getSupabase();
        supabase
          .channel('special_odds_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'special_odds' }, handleRealtimeUpdate)
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                  console.log('✅ Fırsatlar sayfasına anlık güncellemeler için başarıyla abone olundu!');
              }
          });

        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';

        showWelcomeNotification();
        showLoginAdPopup();
        checkAndShowSmartInstallPrompt();

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
    document.getElementById('user-email-display').textContent = state.currentUser.email;
    const isAdmin = state.currentUser.id === ADMIN_USER_ID;
    
    document.getElementById('admin-panels-container').style.display = isAdmin ? 'block' : 'none';
    
    const sponsorPanel = document.getElementById('sponsorManagementPanel');
    const adPanel = document.getElementById('adManagementPanel');
    if(sponsorPanel) sponsorPanel.style.display = 'block'; 
    if(adPanel) adPanel.style.display = 'block';
}

function initializeUI() {
    document.getElementById('bet-date').value = getTodaysDate();
    setupUserInterface();
    populatePlatformOptions();
    populateSpecialOddsPlatformFilter();
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
    renderSpecialOddsPage();
    if (state.currentSection === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
        updateCharts();
    }
}

function showWelcomeNotification() {
    setTimeout(() => {
        showNotification(`🚀 Hoş geldin ${state.currentUser.email}!`, 'success');
    }, 1000);
}

