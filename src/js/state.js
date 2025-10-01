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

