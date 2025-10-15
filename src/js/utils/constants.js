// Supabase Bilgileri
export const SUPABASE_URL = 'https://huaelrdjrcoljkkprewz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWVscmRqcmNvbGpra3ByZXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDI4ODMsImV4cCI6MjA3MjQxODg4M30.kYcxJtT9qQ8rMcNUD2Dy7W8kgYBK9c9xRUVUthJV2Qg';

// Admin Kullanıcı ID'si
export const ADMIN_USER_ID = 'fbf57686-1ec6-4ef0-9ee1-b908d3fae274';

// Diğer Sabitler
export const ITEMS_PER_PAGE = 10;
export const DEFAULT_PLATFORMS = [ "Bilyoner", "Misli", "Nesine", "Tuttur" ];

// DOM Seçicileri (Selectors)
// NOT: Bu yapı, elementler henüz DOM'a yüklenmeden önce script'in çalışması sorununu çözer.
// Elementlere doğrudan referans vermek yerine, ihtiyaç duyulduğunda `document.querySelector` ile
// erişmek için seçicileri burada saklıyoruz.
export const SELECTORS = {
    authContainer: '#auth-container',
    appContainer: '#app-container',
    authForm: '#auth-form',
    loginBtn: '#login-btn',
    signupBtn: '#signup-btn',
    logoutBtn: '#logout-btn',
    userEmailDisplay: '#user-email-display',
    forgotPasswordLink: '#forgot-password-link',
    passwordResetModal: '#password-reset-modal',
    passwordResetForm: '#password-reset-form',
    cancelResetBtn: '#cancel-reset-btn',
    sendResetBtn: '#send-reset-btn',
    sponsorForm: '#sponsor-form',
    sponsorsListContainer: '#sponsors-list',
    sponsorsGridContainer: '#sponsors-grid',
    sponsorManagementPanel: '#sponsor-management-panel',
    adManagementPanel: '#ad-management-panel',
    adForm: '#ad-form',
    adsListContainer: '#ads-list',
    adPopupModal: '#ad-popup-modal',
    closeAdPopupBtn: '#close-ad-popup-btn',
    dashboardAdBanner: '#dashboard-ad-banner',
    accountSettingsForm: '#account-settings-form',
    sidebar: '#sidebar',
    mainContent: '#main-content'
};

// DOM Elementlerine Dinamik Erişim Sağlayan Obje
// Bu yapı, SELECTORS'daki seçicileri kullanarak DOM elementlerini dinamik olarak bulur.
// Örnek kullanım: DOM.authContainer yerine DOM.get('authContainer')
export const DOM = {
    get(key) {
        return document.querySelector(SELECTORS[key]);
    }
};
