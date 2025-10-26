import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds, setSpecialOdds } from './state.js';
import { DOM, ADMIN_USER_ID } from './utils/constants.js';
import { getSupabase, onAuthStateChange, updateUserPassword } from './api/auth.js'; // updateUserPassword eklendi
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

    if (payload.table === 'special_odds') {
        if (eventType === 'INSERT') {
            state.specialOdds.unshift(newRecord);
            showNotification(`Yeni Fırsat: ${newRecord.platform}'da yeni özel oran!`, 'info');
        } else if (eventType === 'UPDATE') {
            const index = state.specialOdds.findIndex(o => o.id === newRecord.id);
            if (index > -1) {
                state.specialOdds[index] = { ...state.specialOdds[index], ...newRecord };
                // Eğer durum değişikliği varsa ve admin değilse bildirim göster
                if (state.currentUser?.id !== ADMIN_USER_ID) {
                    if (oldRecord.status === 'pending' && newRecord.status === 'won') {
                        showNotification(`🏆 Sonuçlandı: ${newRecord.platform} fırsatı kazandı!`, 'success');
                    } else if (oldRecord.status === 'pending' && newRecord.status === 'lost') {
                         showNotification(`❌ Sonuçlandı: ${newRecord.platform} fırsatı kaybetti.`, 'warning');
                    }
                }
            }
        }
        // UI'ın sadece ilgili bölümünü güncelle
        renderSpecialOddsPage();
        updateAllUI(); // Dashboard vb. de etkilenebilir
    }
}


// ---- ANA UYGULAMA MANTIĞI ----

/**
 * Service Worker'ı kaydeder ve güncelleme olduğunda otomatik yenileme mekanizmasını kurar.
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker başarıyla kaydedildi: ', registration.scope);
                    
                    // Yeni bir SW'nin kurulup "waiting" durumuna geçip geçmediğini kontrol et
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Yeni bir SW yüklendi ancak henüz aktive edilmedi (eski sekme açık).
                                    // skipWaiting() kullandığımız için bu genelde hızlıca 'activated' olur.
                                    console.log('[SW] Yeni bir sürüm yüklendi ve aktive edilmeyi bekliyor.');
                                }
                            });
                        }
                    });
                })
                .catch(error => {
                    console.log('Service Worker kaydı başarısız oldu: ', error);
                });
        });

        // Bu kısım KRİTİK: Yeni bir SW'nin kontrolü devraldığını algılar
        // Bu, F5 sorununu yaşayan mevcut kullanıcıları otomatik olarak günceller.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            console.log('[SW] Kontrolcü değişti! Sayfa yeniden yükleniyor...');
            refreshing = true;
            window.location.reload();
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
    
    // YENİ EKLENDİ (Faz 1, Görev 3): Şifre sıfırlama (PASSWORD_RECOVERY) UI mantığı
    if (session && session.event === 'PASSWORD_RECOVERY') {
        console.log("Şifre sıfırlama event'i yakalandı.");
        // Kullanıcı şifre sıfırlama linkinden geldiyse, yeni şifre girmesi için bir UI göster
        const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 6 karakter):");
        if (newPassword && newPassword.length >= 6) {
            const { error } = await updateUserPassword(newPassword);
            if (error) {
                showNotification(`Şifre güncellenemedi: ${error.message}`, 'error');
            } else {
                showNotification('Şifreniz başarıyla güncellendi! Lütfen yeni şifrenizle giriş yapın.', 'success');
            }
        } else if (newPassword) {
            showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
        }
        // Bu event'ten sonra genellikle 'SIGNED_OUT' event'i tetiklenir, 
        // bu yüzden loading'i burada kapatıp auth-container'ı göstermeye zorlamaya gerek yok.
        // Ancak ne olur ne olmaz diye, auth ekranına yönlendirelim ve yüklemeyi durduralım.
        toggleLoading(false);
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        return; // Fonksiyonun geri kalanının çalışmasını engelle
    }

    // Mevcut kullanıcı ID'si ile yeni kullanıcı ID'si aynıysa ve uygulama zaten görünürse
    // (örn: token refresh olduysa) tekrar tam yükleme yapma.
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
        
        // Mevcut kanalları kontrol et ve gerekirse kapat
        supabase.getChannels().forEach(channel => {
            if(channel.topic === 'realtime:public:special_odds') {
                 console.log("Mevcut 'special_odds_changes' kanalı bulunamadı veya temizleniyor.");
                 supabase.removeChannel(channel);
            }
        });

        // Yeni kanala abone ol
        const channel = supabase
          .channel('special_odds_changes')
          .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'special_odds' }, 
              handleRealtimeUpdate
          );
          
        channel.subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                  console.log('✅ Fırsatlar sayfasına anlık güncellemeler için başarıyla abone olundu!');
              }
              if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                   console.error('❌ Realtime abonelik hatası:', err);
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
                // Saat dilimi sorunlarını önlemek için tarihleri ayarla
                const start = selectedDates[0];
                start.setHours(0, 0, 0, 0);
                const end = selectedDates[1];
                end.setHours(23, 59, 59, 999);
                
                state.statsFilters.dateRange.start = start;
                state.statsFilters.dateRange.end = end;
                updateStatisticsPage();
                updateCharts(); // Tarih değişiminde grafikleri de güncelle
            }
        }
    };
    flatpickr("#stats-date-range-filter", statsDateRangeConfig);
}

function setupUserInterface() {
    document.getElementById('user-email-display').textContent = state.currentUser.email;
    const isAdmin = state.currentUser.id === ADMIN_USER_ID;
    
    document.getElementById('admin-panels-container').style.display = isAdmin ? 'block' : 'none';
    
    // Bu elementlerin varlığını kontrol et
    const sponsorPanel = document.getElementById('sponsor-management-panel');
    const adPanel = document.getElementById('ad-management-panel');
    const specialOddsPanel = document.getElementById('special-odds-panel');

    if(isAdmin) {
        if(sponsorPanel) sponsorPanel.style.display = 'block'; 
        if(adPanel) adPanel.style.display = 'block';
        if(specialOddsPanel) specialOddsPanel.style.display = 'block';
    } else {
        if(sponsorPanel) sponsorPanel.style.display = 'none'; 
        if(adPanel) adPanel.style.display = 'none';
        if(specialOddsPanel) specialOddsPanel.style.display = 'none';
    }
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
    showSection('dashboard', document.querySelector('.sidebar-item[data-section="dashboard"]')); // Başlangıçta dashboard'u göster
}

export function updateAllUI() {
    updateDashboardStats();
    updatePerformanceSummary();
    updateStatisticsPage();
    renderHistory();
    renderRecentBets();
    renderCashHistory();
    renderSpecialOddsPage(); // Fırsatlar sayfası da güncellenmeli
    if (state.currentSection === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
        updateCharts();
    }
}

function showWelcomeNotification() {
    setTimeout(() => {
        showNotification(`🚀 Hoş geldin ${state.currentUser.email}!`, 'success');
    }, 1000);
}

