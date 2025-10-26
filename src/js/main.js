import { state, updateState, setCurrentUser, setBets, setCustomPlatforms, setSponsors, setAds, setSpecialOdds } from './state.js';
// import { DOM, ADMIN_USER_ID } from './utils/constants.js'; // ADMIN_USER_ID import'u kaldırıldı
import { DOM } from './utils/constants.js'; // Sadece DOM import ediliyor
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
// calculateProfitLoss helper'ını import et (Realtime içinde kullanılıyor)
import { calculateProfitLoss } from './utils/helpers.js';


// ---- REALTIME GÜNCELLEME İŞLEYİCİSİ ----
function handleRealtimeUpdate(payload) {
    console.log('Realtime update received:', payload);
    const { eventType, new: newRecord, old: oldRecord, table } = payload;

    // Sadece 'special_odds' tablosundan gelen değişiklikleri işle
    if (table === 'special_odds') {
        if (eventType === 'INSERT') {
            // Yeni fırsatı state dizisinin başına ekle
            state.specialOdds.unshift(newRecord);
            // Yeni fırsatın platformu filtre listesinde yoksa listeyi güncelle
            const existingPlatforms = [...new Set(state.specialOdds.map(o => o.platform))];
            if (!existingPlatforms.includes(newRecord.platform)) {
                populateSpecialOddsPlatformFilter();
            }
            showNotification(`Yeni Fırsat: ${newRecord.platform}'da yeni özel oran!`, 'info');
        } else if (eventType === 'UPDATE') {
            // Güncellenen fırsatı state içinde bul
            const index = state.specialOdds.findIndex(o => o.id === newRecord.id);
            if (index > -1) {
                // State'deki eski objeyi tamamen yeni obje ile değiştir
                state.specialOdds[index] = newRecord;
                // Eğer durum değiştiyse bildirim göster ve ilişkili bahisleri güncelle
                if (oldRecord && oldRecord.status !== newRecord.status) {
                    if (newRecord.status === 'won') {
                       showNotification(`🏆 Sonuçlandı: ${newRecord.platform} fırsatı kazandı!`, 'success');
                    } else if (newRecord.status === 'lost') {
                       showNotification(`❌ Sonuçlandı: ${newRecord.platform} fırsatı kaybetti.`, 'error');
                    } else if (newRecord.status === 'refunded') {
                       showNotification(`↩️ Sonuçlandı: ${newRecord.platform} fırsatı iade edildi.`, 'warning');
                    }
                    // Sonuçlanan fırsatla ilişkili 'bekleyen' kullanıcı bahislerini güncelle
                    updateRelatedBets(newRecord);
                }
            }
        } else if (eventType === 'DELETE') {
            // Silinen fırsatı state'den çıkar
            updateState({ specialOdds: state.specialOdds.filter(o => o.id !== oldRecord.id) });
            // Eğer silinen fırsatın platformu başka hiçbir fırsatta kalmadıysa, filtre listesini güncelle
            const remainingPlatforms = [...new Set(state.specialOdds.map(o => o.platform))];
            const deletedPlatform = oldRecord.platform;
            if (!remainingPlatforms.includes(deletedPlatform)) {
                 populateSpecialOddsPlatformFilter();
            }
        }
        // Sadece special_odds değiştiğinde arayüzü güncellemek daha verimli olabilir
        // Şimdilik her Realtime olayında tüm arayüz güncelleniyor.
        // updateAllUI();
    }
    // Başka tablolar (örn: bets, platforms) için Realtime işlemleri buraya eklenebilir

    // Her Realtime olayından sonra tüm arayüzü güncelle (şimdilik)
    updateAllUI();
}

// Özel oran sonuçlandığında ilişkili 'bekleyen' kullanıcı bahislerini güncelle
async function updateRelatedBets(specialOdd) {
    // Sadece mevcut kullanıcı için güncelleme yap (başka kullanıcıların bahislerini etkileme)
    if (!state.currentUser) return;

    const supabase = getSupabase();
    // Bu özel oranı oynayan ve hala 'pending' olan SADECE MEVCUT KULLANICIYA ait bahisleri bul
    const { data: relatedBets, error: fetchError } = await supabase
        .from('bets')
        .select('id, bet_amount, odds') // Gerekli alanları seç
        .eq('user_id', state.currentUser.id) // Sadece mevcut kullanıcı
        .eq('special_odd_id', specialOdd.id)
        .eq('status', 'pending');

    if (fetchError || !relatedBets || relatedBets.length === 0) {
        if (fetchError) console.error("İlişkili bahisleri çekerken hata:", fetchError);
        return;
    }

    // Her bir ilişkili bahis için güncelleme objesini hazırla
    const updates = relatedBets.map(bet => {
        let win_amount = 0;
        let profit_loss = 0;

        if (specialOdd.status === 'won') {
            // Kazancı özel oranın kendi oranı üzerinden hesapla
            win_amount = bet.bet_amount * specialOdd.odds;
            profit_loss = win_amount - bet.bet_amount;
        } else if (specialOdd.status === 'lost') {
            profit_loss = -bet.bet_amount;
        } // refunded ise zaten 0

        // Güncelleme isteğini oluştur
        return supabase
            .from('bets')
            .update({
                status: specialOdd.status,
                win_amount: win_amount,
                profit_loss: profit_loss
             })
            .eq('id', bet.id)
            .select(); // Güncellenmiş veriyi geri al
    });

    // Tüm güncelleme isteklerini aynı anda gönder
    const results = await Promise.all(updates);

    let stateUpdated = false;
    // Sonuçları işle ve state'i güncelle
    results.forEach(result => {
        if (result.error) {
            console.error("Bahis güncellenirken hata:", result.error);
        } else if (result.data && result.data.length > 0) {
            const updatedBetData = result.data[0];
            const index = state.bets.findIndex(b => b.id === updatedBetData.id);
            if (index > -1) {
                // State'deki bahsi güncellenmiş veriyle değiştir
                state.bets[index] = updatedBetData;
                stateUpdated = true;
            }
        }
    });

    // Eğer state'de bir değişiklik olduysa arayüzü güncelle
    if (stateUpdated) {
        updateAllUI();
    }
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
    // setupEventListeners artık handleAuthStateChange içinde, UI yüklendikten sonra çağrılacak
    registerServiceWorker();
    initPwaInstaller();
    // Kimlik doğrulama durumunu dinlemeye başla
    onAuthStateChange(handleAuthStateChange);
});

// Yükleme ekranı yöneticisi
const loadingOverlay = document.getElementById('loading-overlay');
function toggleLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Kimlik doğrulama durumu değiştiğinde tetiklenir
async function handleAuthStateChange(session) {
    toggleLoading(true); // Yüklemeyi başlat
    const user = session?.user || null;

    // Eğer kullanıcı aynıysa ve uygulama zaten görünürse tekrar yükleme yapma (gereksiz render'ı önle)
    if (user?.id === state.currentUser?.id && document.getElementById('app-container')?.style.display === 'block') {
        toggleLoading(false);
        return;
    }

    // Mevcut kullanıcıyı state'e kaydet
    setCurrentUser(user);

    if (user) {
        // Kullanıcı giriş yaptıysa veya zaten giriş yapmışsa uygulamayı başlat
        await initializeApp();
    } else {
        // Kullanıcı çıkış yaptıysa veya yoksa Auth ekranını göster
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        // State'i tamamen temizle (önceki kullanıcı verileri kalmasın)
        updateState({
            currentUser: null, bets: [], customPlatforms: [], sponsors: [], ads: [], specialOdds: [],
            editingBetId: null, currentlyEditingBet: null, currentImageData: null, quickImageData: null, adminImageData: null,
            playingSpecialOdd: null, listenersAttached: false // Çıkış yapınca listener'ları tekrar bağlamak için
        });
        // Aktif Realtime aboneliklerini kaldır
        const supabase = getSupabase();
        supabase.removeAllChannels();
        toggleLoading(false); // Yüklemeyi bitir
    }
}


// Uygulamayı başlatan ana fonksiyon (kullanıcı giriş yaptıktan sonra çalışır)
async function initializeApp() {
    if (!state.currentUser) return; // Kullanıcı yoksa çık (güvenlik)

    try {
        // Gerekli verileri Supabase'den yükle
        const { bets, platforms, sponsors, ads, specialOdds } = await loadInitialData(state.currentUser.id);
        // Yüklenen verileri state'e kaydet
        setBets(bets);
        setCustomPlatforms(platforms);
        setSponsors(sponsors);
        setAds(ads);
        setSpecialOdds(specialOdds);

        // Arayüz elemanlarını ilk değerleriyle ayarla
        initializeUI();

        // Olay dinleyicilerini burada, UI elemanları yüklendikten sonra ve sadece bir kez ayarla
        if (!state.listenersAttached) {
             setupEventListeners();
        }

        // Supabase Realtime aboneliğini başlat
        const supabase = getSupabase();
        // Mevcut abonelikleri kaldırıp yenisini ekleyerek çift aboneliği önle
        supabase.removeAllChannels();
        supabase
          .channel('kasamatik-public-realtime') // Kanal adını daha belirgin yapalım
          // Sadece 'special_odds' tablosundaki değişiklikleri dinle
          .on('postgres_changes', { event: '*', schema: 'public', table: 'special_odds' }, handleRealtimeUpdate)
          // Başka tablolar için (örn: bets, platforms - eğer gerekirse) dinleyiciler buraya eklenebilir
          .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                  console.log('✅ Realtime güncellemeler için başarıyla abone olundu!');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                   console.error('❌ Realtime abonelik hatası/kapandı:', status, err);
                   // Hata durumunda bildirim gösterilebilir veya yeniden bağlanma denenebilir
                   showNotification('Anlık güncellemelerde sorun yaşanıyor.', 'warning');
              }
          });

        // Auth ekranını gizle, uygulama ekranını göster
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';

        // Uygulama yüklendikten sonra yapılacak ek işlemler
        showWelcomeNotification(); // Hoş geldin mesajı
        showLoginAdPopup(); // Giriş reklamı (varsa)
        checkAndShowSmartInstallPrompt(); // PWA kurulum teklifi

    } catch (error) {
        console.error("Uygulama başlatılırken hata:", error);
        showNotification("Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.", "error");
        // Hata durumunda belki kullanıcıyı Auth ekranına geri yönlendirmek daha iyi olabilir
        // document.getElementById('auth-container').style.display = 'flex';
        // document.getElementById('app-container').style.display = 'none';
    } finally {
        toggleLoading(false); // Yüklemeyi bitir (başarılı veya hatalı)
    }
}

// Tarih seçici (Flatpickr) ayarlarını yapar
function initializeDatePickers() {
    // İstatistik sayfası için tarih aralığı seçici
    const statsDateRangeConfig = {
        mode: "range",        // Aralık seçimi
        dateFormat: "Y-m-d",  // Tarih formatı
        onChange: function(selectedDates, dateStr, instance) { // Seçim değiştiğinde
            if (selectedDates.length === 2) {
                // Başlangıç tarihini günün başına, bitiş tarihini günün sonuna ayarla (saat farkı sorununu önler)
                const startOfDay = new Date(selectedDates[0].setUTCHours(0, 0, 0, 0));
                const endOfDay = new Date(selectedDates[1].setUTCHours(23, 59, 59, 999));
                // Seçilen aralığı state'e kaydet
                updateState({ statsFilters: { ...state.statsFilters, dateRange: { start: startOfDay, end: endOfDay } } });
                updateStatisticsPage(); // İstatistikleri güncelle
                updateCharts();       // Grafikleri güncelle
            } else if (selectedDates.length === 0) {
                 // Eğer tarih seçimi temizlenirse, filtreyi state'den kaldır
                 updateState({ statsFilters: { ...state.statsFilters, dateRange: { start: null, end: null } } });
                 updateStatisticsPage();
                 updateCharts();
            }
        },
        locale: { // Türkçe takvim ayarları
            firstDayOfWeek: 1, // Haftanın ilk günü Pazartesi
            weekdays: {
              shorthand: ["Paz", "Pts", "Sal", "Çar", "Per", "Cum", "Cts"],
              longhand: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
            },
            months: {
              shorthand: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
              longhand: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
            },
        }
    };
    // Flatpickr'ı ilgili input elementine uygula
    const datePickerInput = document.getElementById('stats-date-range-filter');
    if (datePickerInput) {
        flatpickr(datePickerInput, statsDateRangeConfig);
    } else {
        console.warn("İstatistik tarih seçici elementi (#stats-date-range-filter) bulunamadı.");
    }

     // Yeni bahis formundaki tarih alanını varsayılan olarak bugüne ayarla
    const betDateInput = document.getElementById('bet-date');
    if (betDateInput) {
        betDateInput.value = getTodaysDate();
    }
}

// Kullanıcı arayüzünü kullanıcı bilgilerine ve rolüne göre ayarlar
function setupUserInterface() {
    // Kullanıcının e-postasını göster
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay) {
        userEmailDisplay.textContent = state.currentUser.email || 'E-posta yok';
    }

    // --- GÜVENLİK DÜZELTMESİ ---
    // Kullanıcının admin olup olmadığını Supabase'den gelen role bilgisine göre kontrol et.
    // Varsayım: Supabase Auth -> Users -> User Management -> Edit User -> User App Metadata içine
    // şu JSON eklenmiş: { "role": "admin" }
    // Eğer bu yapı farklıysa (örn: public.profiles tablosu), bu kontrol güncellenmelidir.
    const isAdmin = state.currentUser.app_metadata?.role === 'admin';
    console.log(`Kullanıcı ${state.currentUser.email} admin mi? -> ${isAdmin}`); // Debug için log

    // Admin panellerinin genel konteynerını rol'e göre göster/gizle
    const adminPanelsContainer = document.getElementById('admin-panels-container');
    if (adminPanelsContainer) {
        adminPanelsContainer.style.display = isAdmin ? 'block' : 'none';
    } else {
        console.warn("Admin panelleri konteynerı (#admin-panels-container) bulunamadı.");
    }

    // Eğer kullanıcı admin ise, admin ile ilgili UI elemanlarını render et/güncelle
    if (isAdmin) {
         renderAdminPanels(); // Admin paneli içindeki listeleri (sponsor, reklam, özel oran) doldurur.
    }
    // --- GÜVENLİK DÜZELTMESİ SONU ---
}

// Uygulama başladığında arayüzü ilk kez kuran fonksiyon
function initializeUI() {
    setupUserInterface();          // Kullanıcı adı, admin paneli görünürlüğü vs.
    populatePlatformOptions();     // Bahis formu ve filtreler için platform seçeneklerini doldur
    populateSpecialOddsPlatformFilter(); // Fırsatlar sayfası için platform filtresini doldur
    renderCustomPlatforms();       // Ayarlar sayfasındaki özel platform listesini render et
    renderSponsorsPage();          // Sponsorlar sekmesini render et
    renderDashboardBannerAd();     // Ana paneldeki reklam bannerını göster (varsa)
    initializeVisitorCounter();    // Ziyaretçi sayacını başlat
    initializeDatePickers();       // Tarih seçicileri (Flatpickr) etkinleştir
    updateAllUI();                 // Tüm dinamik arayüz bileşenlerini (dashboard, geçmiş vb.) ilk verilerle güncelle
}

// State'deki verilere göre tüm arayüz bileşenlerini güncelleyen ana fonksiyon
export function updateAllUI() {
    console.log("Updating all UI components..."); // Güncelleme başlangıcını logla (Debug için)

    // Temel bileşenleri her zaman güncelle
    updateDashboardStats();        // Ana paneldeki temel istatistik kutuları
    updatePerformanceSummary();    // Ana paneldeki performans özeti (Bugün, 7 gün vb.)
    updateStatisticsPage();        // İstatistikler sayfasındaki detaylı metrikler
    renderHistory();               // Bahis geçmişi listesi ve filtre özeti
    renderRecentBets();            // Ana paneldeki son bahisler listesi
    renderCashHistory();           // Kasa geçmişi listesi ve özeti
    renderSpecialOddsPage();       // Fırsatlar sayfası kartları ve filtre durumu

    // Admin panellerini sadece admin ise ve görünürse güncelle (gereksiz render'ı önle)
    const isAdmin = state.currentUser?.app_metadata?.role === 'admin';
    if (isAdmin && document.getElementById('admin-panels-container')?.style.display === 'block') {
        renderAdminPanels();       // Admin paneli içindeki listeleri (sponsor, reklam, aktif fırsat) güncelle
    }

    // Grafikleri sadece İstatistikler sekmesi aktif ve görünür durumdaysa güncelle (performans için)
    const profitChartElement = document.getElementById('profitChart');
    if (state.currentSection === 'statistics' && profitChartElement?.offsetParent !== null) {
        console.log("Updating charts..."); // Grafik güncellemesini logla (Debug için)
        updateCharts();            // Kar/Zarar ve Platform dağılımı grafiklerini güncelle
    }
}

// Kullanıcıya hoş geldin mesajı gösterir
function showWelcomeNotification() {
    // Mesajı 1 saniye gecikmeyle göster (arayüzün oturması için)
    setTimeout(() => {
        showNotification(`🚀 Kasamatik'e Hoş Geldin!`, 'success');
    }, 1000);
}
