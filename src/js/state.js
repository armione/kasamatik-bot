// Uygulamanın anlık durumunu (state) yöneten merkezi dosya
export const state = {
    currentUser: null,
    bets: [],
    customPlatforms: [],
    sponsors: [],
    ads: [],
    specialOdds: [],
    adminImageData: null,
    editingBetId: null,
    currentlyEditingBet: null,
    currentImageData: null,
    quickImageData: null,
    profitChart: null,
    platformChart: null,
    currentSection: 'dashboard',
    currentPage: 1,
    cashCurrentPage: 1,
    listenersAttached: false,
    
    // Fırsatı oynamak için seçilen özel oran
    playingSpecialOdd: null,
    
    // Filtreleme durumu
    filters: {
        status: 'all',
        platform: 'all',
        searchTerm: '',
        period: 'all', // '1', '7', '30', 'all'
    },
     statsFilters: {
        dateRange: {
            start: null,
            end: null
        }
    },

    // Dashboard performans özeti periyodu
    dashboardPeriod: 1 // 1: Bugün, 7: Son 7 gün, 30: Son 30 gün
};

// State'i güncellemek için yardımcı fonksiyonlar
export function setCurrentUser(user) {
    state.currentUser = user;
}

export function setBets(newBets) {
    state.bets = newBets;
}

export function setCustomPlatforms(platforms) {
    state.customPlatforms = platforms;
}

export function setSponsors(newSponsors) {
    state.sponsors = newSponsors;
}

export function setAds(newAds) {
    state.ads = newAds;
}

export function setSpecialOdds(newOdds) {
    state.specialOdds = newOdds;
}

export function updateState(newState) {
    Object.assign(state, newState);
}

