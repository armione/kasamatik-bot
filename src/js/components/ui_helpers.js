import { state } from '../state.js';
import { DEFAULT_PLATFORMS, DOM } from '../utils/constants.js';
import { renderStatistics } from './statistics.js';
import { getTodaysDate } from '../utils/helpers.js';

export function showSection(sectionName, clickedElement) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName)?.classList.add('active');
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => item.classList.remove('active'));
    clickedElement?.classList.add('active');
    state.currentSection = sectionName;
    DOM.sidebar.classList.remove('mobile-open');
    if (sectionName === 'statistics') {
        renderStatistics();
    }
}

export function toggleSidebar() {
    DOM.sidebar.classList.toggle('collapsed');
    DOM.mainContent.classList.toggle('expanded');
}

export function toggleMobileSidebar() {
    DOM.sidebar.classList.toggle('mobile-open');
}

export function populatePlatformOptions(selectsToUpdate) {
    const allPlatforms = [...DEFAULT_PLATFORMS, ...state.customPlatforms.map(p => p.name)].sort();
    
    // Eğer belirli select'ler verilmediyse, standart olanları kullan
    const platformSelects = selectsToUpdate || [
        document.getElementById('platform'), 
        document.getElementById('quick-platform'),
        document.getElementById('platform-filter'),
        document.getElementById('edit-platform'),
    ];

    platformSelects.forEach(select => {
        if (select) {
            const currentVal = select.value;
            let firstOption;

            if (select.id === 'platform-filter') {
                firstOption = '<option value="all">Tüm Platformlar</option>';
            } else {
                firstOption = '<option value="">Platform Seçin</option>';
            }
            
            select.innerHTML = firstOption;
           
            allPlatforms.forEach(platform => {
                const option = document.createElement('option');
                option.value = platform;
                option.textContent = platform;
                select.appendChild(option);
            });
            
            // Eğer mevcut bir değer varsa, onu korumaya çalış
            if (allPlatforms.includes(currentVal)) {
                select.value = currentVal;
            } else if (select.id === 'platform-filter') {
                select.value = 'all';
            }
        }
    });
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
    if (!DOM.sponsorsGridContainer) return;
    if (state.sponsors.length === 0) {
        DOM.sponsorsGridContainer.innerHTML = `<div class="text-center py-16 text-gray-400 col-span-full"><div class="text-6xl mb-4">🏆</div><p class="text-xl">Henüz sponsor bulunmuyor.</p></div>`;
        return;
    }
    DOM.sponsorsGridContainer.innerHTML = state.sponsors.map(s => `
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
}

function renderSponsorManagementList() {
    if (!DOM.sponsorsListContainer) return;
    if (state.sponsors.length === 0) {
        DOM.sponsorsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz sponsor eklenmemiş.</p>';
        return;
    }
    DOM.sponsorsListContainer.innerHTML = state.sponsors.map(s => `
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
    if (!DOM.adsListContainer) return;
    if (state.ads.length === 0) {
        DOM.adsListContainer.innerHTML = '<p class="text-gray-400 text-sm">Henüz reklam eklenmemiş.</p>';
        return;
    }
    DOM.adsListContainer.innerHTML = state.ads.map(ad => `
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

export function resetForm(formId = 'bet-form') {
    const form = document.getElementById(formId);
    if(form) {
        form.reset();
        const dateInput = form.querySelector('input[type="date"]');
        if(dateInput) {
            dateInput.value = getTodaysDate();
        }
    }
    removeImage('main');
}

export function handleImageFile(file, type) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        const imageData = e.target.result;
        const prefix = type === 'main' ? '' : 'quick-';
        if (type === 'main') {
            state.currentImageData = imageData;
            document.getElementById('gemini-analyze-btn').disabled = false;
        } else {
            state.quickImageData = imageData;
        }
        document.getElementById(`${prefix}preview-img`).src = imageData;
        document.getElementById(`${prefix}upload-area`).classList.add('hidden');
        document.getElementById(`${prefix}image-preview`).classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

export function removeImage(type) {
    const prefix = type === 'main' ? '' : 'quick-';
    if (type === 'main') {
        state.currentImageData = null;
        document.getElementById('gemini-analyze-btn').disabled = true;
    } else {
        state.quickImageData = null;
    }
    document.getElementById(`${prefix}upload-area`).classList.remove('hidden');
    document.getElementById(`${prefix}image-preview`).classList.add('hidden');
    document.getElementById(`${prefix}image-input`).value = '';
}
