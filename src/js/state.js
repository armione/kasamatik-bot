// Uygulamanın anlık durumunu (state) yöneten merkezi dosya
export const state = {
    currentUser: null,
    bets: [],
    customPlatforms: [],
    sponsors: [],
    ads: [],
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
    appInitialized: false,

    // Filtre durumları
    historyStartDate: '',
    historyEndDate: '',
    historyPlatform: 'all',
    historyStatus: 'all',
    historySearch: '',
    statsStartDate: '',
    statsEndDate: '',
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

export function updateState(newState) {
    Object.assign(state, newState);
}

// HATA DÜZELTMESİ: Silinen applyFilters fonksiyonu geri eklendi.
/**
 * Bahis geçmişi için filtrelenmiş bahisleri döndürür.
 * @returns {Array} Filtrelenmiş bahisler dizisi.
 */
export function applyFilters() {
    const actualBets = state.bets.filter(bet => bet.bet_type !== 'Kasa İşlemi');
    
    return actualBets.filter(bet => {
        const statusMatch = state.historyStatus === 'all' || bet.status === state.historyStatus;
        const platformMatch = state.historyPlatform === 'all' || bet.platform === state.historyPlatform;
        const searchMatch = !state.historySearch || bet.description.toLowerCase().includes(state.historySearch.toLowerCase());
        const dateMatch = (!state.historyStartDate || bet.date >= state.historyStartDate) && (!state.historyEndDate || bet.date <= state.historyEndDate);

        return statusMatch && platformMatch && searchMatch && dateMatch;
    });
}
