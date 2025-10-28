// Bu dosya, PWA kurulumu ile ilgili tüm mantığı yönetir.

let deferredPrompt; // Tarayıcının kurulum istemini saklamak için global değişken.

/**
 * PWA kurulum istemini tetikleyen ana fonksiyon.
 */
async function showInstallPrompt() {
    if (!deferredPrompt) {
        console.log('Kurulum istemi mevcut değil veya tarayıcı desteklemiyor.');
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Kullanıcı kurulum seçimi: ${outcome}`);
    
    deferredPrompt = null;

    hideAllInstallPrompts();
}

/**
 * Tüm PWA kurulum tekliflerini (butonlar ve modal) gizler.
 */
function hideAllInstallPrompts() {
    const installButtons = document.querySelectorAll('.pwa-install-button');
    installButtons.forEach(button => button.classList.add('hidden'));
    
    const installModalApp = document.getElementById('pwa-install-modal');
    if (installModalApp) installModalApp.classList.add('hidden');
}


/**
 * PWA kurulum mantığını başlatan ana fonksiyon.
 * main.js tarafından çağrılır.
 */
export function initPwaInstaller() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA kurulum istemi yakalandı, ilgili butonlar gösterilecek.');

        // Destekleyen tarayıcılarda tüm kurulum butonlarını görünür yap.
        const installButtons = document.querySelectorAll('.pwa-install-button');
        installButtons.forEach(button => button.classList.remove('hidden'));
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA başarıyla yüklendi!');
        hideAllInstallPrompts();
    });

    // Kurulum butonlarına tıklama olaylarını dinle.
    document.getElementById('pwa-install-btn-login')?.addEventListener('click', showInstallPrompt);
    document.getElementById('pwa-install-btn-modal')?.addEventListener('click', showInstallPrompt);
    document.getElementById('pwa-install-btn-guide')?.addEventListener('click', showInstallPrompt);
    
    // Modal'ı kapatma butonunu dinle.
    document.getElementById('pwa-install-dismiss-btn')?.addEventListener('click', () => {
        const installModalApp = document.getElementById('pwa-install-modal');
        if (installModalApp) installModalApp.classList.add('hidden');
        localStorage.setItem('pwaInstallDismissed', 'true');
    });
}

/**
 * Uygulama içinde, "akıllı" koşullar sağlandığında kurulum modal'ını gösterir.
 * main.js'deki initializeApp fonksiyonundan çağrılır.
 */
export function checkAndShowSmartInstallPrompt() {
    if (!deferredPrompt || localStorage.getItem('pwaInstallDismissed') === 'true') {
        return;
    }

    let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
    visitCount++;
    localStorage.setItem('visitCount', visitCount);

    if (visitCount >= 3) {
        const installModalApp = document.getElementById('pwa-install-modal');
        if (installModalApp) installModalApp.classList.remove('hidden');
        localStorage.setItem('pwaInstallDismissed', 'true'); 
    }
}

