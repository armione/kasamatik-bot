import { state } from '../state.js';
import { DEFAULT_PLATFORMS, DOM } from '../utils/constants.js';
import { updateCharts } from './statistics.js';

export function showSection(sectionName, clickedElement) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName)?.classList.add('active');
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => item.classList.remove('active'));
    clickedElement?.classList.add('active');
    state.currentSection = sectionName;
    DOM.get('sidebar').classList.remove('mobile-open');
    if (sectionName === 'statistics' && document.getElementById('profitChart')?.offsetParent !== null) {
        updateCharts();
    }
     if (sectionName === 'special-odds-page') {
        populateSpecialOddsPlatformFilter();
        renderSpecialOddsPage();
    }
}

export function toggleSidebar() {
    DOM.get('sidebar').classList.toggle('collapsed');
    DOM.get('mainContent').classList.toggle('expanded');
}

export function toggleMobileSidebar() {
    DOM.get('sidebar').classList.toggle('mobile-open');
}

export function populatePlatformOptions() {
    const allPlatforms = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)].sort();
    const platformSelects = [
        document.getElementById('platform'),
        document.getElementById('quick-platform'),
        document.getElementById('platform-filter')
    ];
    platformSelects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            const defaultOptionText = select.id === 'platform-filter' ? 'Tüm Platformlar' : 'Platform Seçin';
            select.innerHTML = `<option value="all">${defaultOptionText}</option>`; // 'all' yerine "" olmalı mı? Hayır, filter için 'all' kalmalı.

            allPlatforms.forEach(platform => {
                const option = document.createElement('option');
                option.value = platform;
                option.textContent = platform;
                select.appendChild(option);
            });
             if (allPlatforms.includes(currentValue)) {
                select.value = currentValue;
             } else if (select.id !== 'platform-filter' && select.options.length > 1) {
                 // Eğer filtre değilse ve platformlar varsa, ilkini seç (genellikle boş seçenek sonrası ilk platform)
                 select.selectedIndex = 1; // Ya da select.value = 'all' kalsın? Kullanıcı seçsin. Şimdilik 'all' kalsın.
                 // select.value = allPlatforms[0]; // Bu belki daha iyi? Hayır, placeholder kalsın.
             } else if (select.id !== 'platform-filter') {
                 select.value = 'all'; // Eğer hiç platform yoksa 'all' (yani placeholder) kalsın.
             }
        }
    });
}

// YENİ: Fonksiyonun başına 'export' eklendi, böylece diğer dosyalar tarafından kullanılabilir.
export function populateSpecialOddsPlatformFilter() {
    const select = document.getElementById('special-odds-platform-filter');
    if (!select) return;

    // Sadece specialOdds içinde bulunan platformları al ve tekilleştir
    const platforms = [...new Set(state.specialOdds.map(odd => odd.platform))].sort();

    select.innerHTML = `<option value="all">Tüm Platformlar</option>`;
    platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform;
        select.appendChild(option);
    });
    // Mevcut filtre değerini koru
    select.value = state.specialOddsFilters.platform;
}

export function renderCustomPlatforms() {
    const container = document.getElementById('custom-platforms-list');
    if (!container) return;
    if (state.customPlatforms.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">Henüz özel platform eklenmemiş</p>';
        return;
    }
    container.innerHTML = state.customPlatforms.map(p => `
        <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
            <span class="text-white text-sm">${p.name}</span>
            <button data-action="remove-platform" data-id="${p.id}" data-name="${p.name}" class="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded">🗑️</button>
        </div>
    `).join('');
}

export function renderSponsorsPage() {
    const sponsorsGridContainer = DOM.get('sponsorsGridContainer');
    if (!sponsorsGridContainer) return;
    if (state.sponsors.length === 0) {
        sponsorsGridContainer.innerHTML = `<div class="text-center py-16 text-gray-400 col-span-full"><div class="text-6xl mb-4">🏆</div><p class="text-xl">Henüz sponsor bulunmuyor.</p></div>`;
        return;
    }
    sponsorsGridContainer.innerHTML = state.sponsors.map(s => `
        <a href="${s.target_url}" target="_blank" rel="noopener noreferrer" class="sponsor-card glass-card rounded-2xl block p-4">
            <div class="h-40 flex items-center justify-center rounded-xl overflow-hidden mb-4 bg-black bg-opacity-20">
                <img src="${s.logo_url}" alt="${s.name} Logosu" class="max-h-full max-w-full object-contain">
            </div>
            <h4 class="font-bold text-center text-lg text-white">${s.name}</h4>
        </a>
    `).join('');
}

export function renderAdminPanels() {
    renderSponsorManagementList();
    renderAdManagementList();
    renderActiveSpecialOdds();
}

function renderSponsorManagementList() {
    const sponsorsListContainer = DOM.get('sponsorsListContainer');
    if (!sponsorsListContainer) return;
    if (state.sponsors.length === 0) {
        sponsorsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz sponsor eklenmemiş.</p>';
        return;
    }
    sponsorsListContainer.innerHTML = state.sponsors.map(s => `
        <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
            <div class="flex items-center space-x-3">
                <img src="${s.logo_url}" class="w-10 h-10 object-contain rounded-md bg-white p-1">
                <div>
                    <p class="text-white font-semibold">${s.name}</p>
                    <a href="${s.target_url}" target="_blank" class="text-xs text-blue-400 hover:underline">${s.target_url}</a>
                </div>
            </div>
            <button data-action="delete-sponsor" data-id="${s.id}" data-name="${s.name.replace(/'/g, "\\'")}" class="text-red-400 hover:text-red-300 text-xl px-2 py-1 rounded">🗑️</button>
        </div>
    `).join('');
}

function renderAdManagementList() {
    const adsListContainer = DOM.get('adsListContainer');
    if (!adsListContainer) return;
    if (state.ads.length === 0) {
        adsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz reklam eklenmemiş.</p>';
        return;
    }
    adsListContainer.innerHTML = state.ads.map(ad => `
        <div class="flex justify-between items-center bg-gray-700 bg-opacity-50 p-3 rounded-lg">
            <div class="flex items-center space-x-3">
                <img src="${ad.image_url}" class="w-16 h-10 object-cover rounded-md">
                <div>
                    <p class="text-white font-semibold">${ad.location === 'login_popup' ? 'Giriş Pop-up' : 'Ana Panel Banner'}</p>
                    <a href="${ad.target_url}" target="_blank" class="text-xs text-blue-400 hover:underline">${ad.target_url}</a>
                </div>
            </div>
            <button data-action="delete-ad" data-id="${ad.id}" class="text-red-400 hover:text-red-300 text-xl px-2 py-1 rounded">🗑️</button>
        </div>
    `).join('');
}

export function renderActiveSpecialOdds() {
    const container = document.getElementById('active-special-odds-list');
    if (!container) return;
    const pendingOdds = state.specialOdds.filter(o => o.status === 'pending');
    if(pendingOdds.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center">Sonuçlandırılacak aktif fırsat yok.</p>';
        return;
    }
    container.innerHTML = pendingOdds.map(odd => `
        <div class="odd-item">
            <p class="font-semibold text-white">${odd.description}</p>
            <div class="flex items-center justify-between text-sm text-gray-300 mt-2">
                <span>Oran: <strong class="text-yellow-400">${odd.odds}</strong></span>
                <span>Platform: <strong class="text-blue-400">${odd.platform}</strong></span>
                <span>Oynanma: <strong class="text-white">${odd.play_count}</strong></span>
            </div>
            <div class="flex gap-2 mt-4">
                <button data-action="resolve-special-odd" data-id="${odd.id}" data-status="won" class="flex-1 py-2 px-3 text-sm bg-green-600 hover:bg-green-700 rounded-lg">Kazandı</button>
                <button data-action="resolve-special-odd" data-id="${odd.id}" data-status="lost" class="flex-1 py-2 px-3 text-sm bg-red-600 hover:bg-red-700 rounded-lg">Kaybetti</button>
                <button data-action="resolve-special-odd" data-id="${odd.id}" data-status="refunded" class="flex-1 py-2 px-3 text-sm bg-gray-600 hover:bg-gray-700 rounded-lg">İade Et</button>
            </div>
        </div>
    `).join('');
}

export function renderSpecialOddsPage() {
    const container = document.getElementById('special-odds-list-container');
    if (!container) return;

    const { status, platform, sort } = state.specialOddsFilters;

    // 1. Filtrele
    let filteredOdds = state.specialOdds.filter(odd => {
        const statusMatch = status === 'all' || odd.status === status;
        const platformMatch = platform === 'all' || odd.platform === platform;
        return statusMatch && platformMatch;
    });

    // 2. Sırala
    switch (sort) {
        case 'newest':
            filteredOdds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'highest_odd':
            filteredOdds.sort((a, b) => b.odds - a.odds);
            break;
        case 'lowest_odd':
            filteredOdds.sort((a, b) => a.odds - b.odds);
            break;
        case 'most_popular':
            filteredOdds.sort((a, b) => b.play_count - a.play_count);
            break;
    }


    if (filteredOdds.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-6xl mb-4">🧐</div><p class="text-xl">Bu kriterlere uygun fırsat bulunamadı.</p></div>`;
        return;
    }

    container.innerHTML = filteredOdds.map(odd => {
        const statusClasses = { pending: 'pending', won: 'won', lost: 'lost', refunded: 'refunded' };
        const statusTexts = { pending: 'Bekleniyor', won: 'Kazandı', lost: 'Kaybetti', refunded: 'İade Edildi' };

        let linkButtonsHTML = '';
        if (odd.primary_link_url && odd.primary_link_text) {
            linkButtonsHTML += `<a href="${odd.primary_link_url}" target="_blank" rel="noopener noreferrer" class="link-button link-button-primary">${odd.primary_link_text}</a>`;
        }
        if (odd.secondary_link_url && odd.secondary_link_text) {
            linkButtonsHTML += `<a href="${odd.secondary_link_url}" target="_blank" rel="noopener noreferrer" class="link-button link-button-secondary">${odd.secondary_link_text}</a>`;
        }

        return `
            <div class="special-odd-card glass-card rounded-2xl p-6 ${statusClasses[odd.status]}">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div class="flex-grow mb-4 md:mb-0">
                        <div class="flex items-center space-x-3 mb-3">
                            <span class="px-3 py-1 text-sm font-semibold rounded-full bg-black bg-opacity-20 text-blue-300">${odd.platform}</span>
                            <span class="text-sm text-gray-400">🔥 ${odd.play_count} kişi oynadı!</span>
                        </div>
                        <p class="text-lg font-bold text-white mb-4">${odd.description}</p>
                        <div class="flex flex-wrap gap-2">${linkButtonsHTML}</div>
                    </div>
                    <div class="flex-shrink-0 md:ml-6 text-center md:text-right">
                        <p class="text-gray-400 text-sm">Oran</p>
                        <p class="text-4xl font-bold gradient-text">${odd.odds}</p>
                        ${odd.max_bet_amount ? `<p class="text-xs text-yellow-400 mt-1">Maks. Bahis: ${odd.max_bet_amount} ₺</p>` : ''}
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-gray-700 flex flex-col md:flex-row items-center justify-between">
                    <div class="text-sm text-gray-400 mb-4 md:mb-0">
                        Durum: <span class="font-semibold status-${statusClasses[odd.status]} text-white px-2 py-1 rounded-md">${statusTexts[odd.status]}</span>
                    </div>
                    <button data-action="open-play-special-odd-modal" data-id="${odd.id}" class="gradient-button w-full md:w-auto px-8 py-3 rounded-lg font-semibold" ${odd.status !== 'pending' ? 'disabled' : ''}>
                        ${odd.status === 'pending' ? 'Fırsatı Oyna' : 'Sonuçlandı'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}



export function resetForm(formId = 'bet-form') {
    const form = document.getElementById(formId);
    if(form) {
        form.reset();
        const dateInput = form.querySelector('input[type="date"]');
        if(dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }
    removeImage('main'); // 'main' tipini burada sabit olarak kullanıyoruz, varsayılan form bu.
}

export function handleImageFile(file, type) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        const imageData = e.target.result;
        const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');

        // HATA DÜZELTME: 'main' tipi için state.currentImageData kullanılmalı.
        if (type === 'main') {
            state.currentImageData = imageData;
        } else {
            state[`${type}ImageData`] = imageData;
        }

        // Gemini butonu aktivasyonu sadece 'main' ve 'admin' için geçerli.
        if (type === 'main' || type === 'admin') {
            document.getElementById(`${prefix}gemini-analyze-btn`).disabled = false;
        }

        // Görüntü önizlemesini ayarla
        document.getElementById(`${prefix}preview-img`).src = imageData;
        document.getElementById(`${prefix}upload-area`).classList.add('hidden');
        document.getElementById(`${prefix}image-preview`).classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

export function removeImage(type) {
    const prefix = type === 'main' ? '' : (type === 'quick' ? 'quick-' : 'admin-');

    // HATA DÜZELTME: 'main' tipi için state.currentImageData null yapılmalı.
    if (type === 'main') {
        state.currentImageData = null;
    } else {
        state[`${type}ImageData`] = null;
    }

    // Gemini butonu deaktivasyonu sadece 'main' ve 'admin' için.
    if (type === 'main' || type === 'admin') {
        const geminiBtn = document.getElementById(`${prefix}gemini-analyze-btn`);
        if (geminiBtn) geminiBtn.disabled = true;
    }

    // Görüntü önizlemesini kaldır ve yükleme alanını göster
    const uploadArea = document.getElementById(`${prefix}upload-area`);
    const imagePreview = document.getElementById(`${prefix}image-preview`);
    if (uploadArea) uploadArea.classList.remove('hidden');
    if (imagePreview) imagePreview.classList.add('hidden');

    // Dosya input'unu temizle
    const imageInput = document.getElementById(`${prefix}image-input`);
    if (imageInput) imageInput.value = '';
}
