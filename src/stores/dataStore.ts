
import { create } from 'zustand';
import { Bet, Platform, Sponsor, Ad, SpecialOdd } from '../types';

interface DataState {
  bets: Bet[];
  platforms: Platform[];
  sponsors: Sponsor[];
  ads: Ad[];
  specialOdds: SpecialOdd[];
  loading: boolean;
  error: string | null;

  setInitialData: (data: {
    bets: Bet[];
    platforms: Platform[];
    sponsors: Sponsor[];
    ads: Ad[];
    specialOdds: SpecialOdd[];
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  addBet: (bet: Bet) => void;
  updateBet: (updatedBet: Bet) => void;
  deleteBet: (betId: number) => void;

  addPlatform: (platform: Platform) => void;
  deletePlatform: (platformId: number) => void;
  
  clearUserData: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  bets: [],
  platforms: [],
  sponsors: [],
  ads: [],
  specialOdds: [],
  loading: true,
  error: null,

  setInitialData: (data) => set({ ...data, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  addBet: (bet) => set((state) => ({ bets: [bet, ...state.bets] })),
  updateBet: (updatedBet) =>
    set((state) => ({
      bets: state.bets.map((bet) => (bet.id === updatedBet.id ? updatedBet : bet)),
    })),
  deleteBet: (betId) =>
    set((state) => ({ bets: state.bets.filter((bet) => bet.id !== betId) })),

  addPlatform: (platform) => set((state) => ({ platforms: [...state.platforms, platform] })),
  deletePlatform: (platformId) =>
    set((state) => ({ platforms: state.platforms.filter((p) => p.id !== platformId) })),

  clearUserData: () => set({ bets: [], platforms: [] }),
}));