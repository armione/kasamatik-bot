// Bu dosya, PWA kurulumu ile ilgili tüm mantığı yönetir.

let deferredPrompt; // Tarayıcının kurulum istemini saklamak için global değişken.

/**
 * PWA kurulum istemini tetikleyen ana fonksiyon.
 */
async function showInstallPrompt() {
    if (!deferredPrompt) {
        console.log('Kurulum istemi mevcut değil.');
        return;
    }
    // Kurulum penceresini kullanıcıya göster.
    deferredPrompt.prompt();
    // Kullanıcının seçimini bekle.
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Kullanıcı kurulum seçimi: ${outcome}`);
    
    // İstem bir kez kullanıldığı için sıfırla.
    deferredPrompt = null;

    // Kurulumdan sonra butonları/modalları gizle.
    hideAllInstallPrompts();
}

/**
 * Tüm PWA kurulum tekliflerini (hem giriş ekranındaki buton hem de içerideki modal) gizler.
 */
function hideAllInstallPrompts() {
    const installButtonLogin = document.getElementById('pwa-install-btn-login');
    const installModalApp = document.getElementById('pwa-install-modal');
    if (installButtonLogin) installButtonLogin.classList.add('hidden');
    if (installModalApp) installModalApp.classList.add('hidden');
}


/**
 * PWA kurulum mantığını başlatan ana fonksiyon.
 * main.js tarafından çağrılır.
 */
export function initPwaInstaller() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Tarayıcının varsayılan istemini engelle.
        e.preventDefault();
        // İstem olayını daha sonra kullanmak üzere sakla.
        deferredPrompt = e;
        
        // Kullanıcı henüz giriş yapmadıysa, giriş ekranındaki butonu göster.
        const authContainer = document.getElementById('auth-container');
        if (authContainer && authContainer.style.display !== 'none') {
            const installButtonLogin = document.getElementById('pwa-install-btn-login');
            if (installButtonLogin) installButtonLogin.classList.remove('hidden');
        }
    });

    // Kullanıcı uygulamayı başarıyla yüklediğinde, tüm teklifleri gizle.
    window.addEventListener('appinstalled', () => {
        console.log('PWA başarıyla yüklendi!');
        hideAllInstallPrompts();
    });

    // Giriş ekranındaki butona tıklama olayını dinle.
    document.getElementById('pwa-install-btn-login')?.addEventListener('click', showInstallPrompt);
    // Modal içindeki butona tıklama olayını dinle.
    document.getElementById('pwa-install-btn-modal')?.addEventListener('click', showInstallPrompt);
    // Modal'ı kapatma butonunu dinle.
    document.getElementById('pwa-install-dismiss-btn')?.addEventListener('click', () => {
        const installModalApp = document.getElementById('pwa-install-modal');
        if (installModalApp) installModalApp.classList.add('hidden');
        // Kullanıcı reddettiği için bir süre tekrar gösterme.
        localStorage.setItem('pwaInstallDismissed', 'true');
    });
}

/**
 * Uygulama içinde, "akıllı" koşullar sağlandığında kurulum modal'ını gösterir.
 * main.js'deki initializeApp fonksiyonundan çağrılır.
 */
export function checkAndShowSmartInstallPrompt() {
    // Kurulum istemi yoksa, daha önce kurulmuşsa veya kullanıcı reddetmişse gösterme.
    if (!deferredPrompt || localStorage.getItem('pwaInstallDismissed') === 'true') {
        return;
    }

    let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
    visitCount++;
    localStorage.setItem('visitCount', visitCount);

    // Koşul: En az 3. ziyaret ise kurulum teklifini göster.
    if (visitCount >= 3) {
        const installModalApp = document.getElementById('pwa-install-modal');
        if (installModalApp) installModalApp.classList.remove('hidden');
        // Teklifi gösterdikten sonra tekrar göstermemek için sayacı sıfırla veya durumu kaydet.
        localStorage.setItem('pwaInstallDismissed', 'true'); 
    }
}
