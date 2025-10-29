// src/stores/dataStore.ts
import { create } from 'zustand';
import { Bet, Platform, Sponsor, Ad, SpecialOdd } from '../types';

interface DataState {
  bets: Bet[];
  platforms: Platform[];
  sponsors: Sponsor[];
  ads: Ad[];
  specialOdds: SpecialOdd[];
  loading: boolean;
  setInitialData: (data: { bets: Bet[]; platforms: Platform[]; sponsors: Sponsor[]; ads: Ad[]; specialOdds: SpecialOdd[] }) => void;
  addBet: (bet: Bet) => void;
  updateBet: (updatedBet: Bet) => void;
  deleteBet: (betId: number) => void;
  addPlatform: (platform: Platform) => void;
  deletePlatform: (platformId: number) => void;
  updateSpecialOdd: (updatedOdd: SpecialOdd) => void;
  clearUserData: () => void;
  setLoading: (loading: boolean) => void;
}

export const useDataStore = create<DataState>((set) => ({
  bets: [],
  platforms: [],
  sponsors: [],
  ads: [],
  specialOdds: [],
  loading: true,
  setInitialData: (data) => set({ ...data, loading: false }),
  addBet: (bet) => set((state) => ({ bets: [bet, ...state.bets] })),
  updateBet: (updatedBet) =>
    set((state) => ({
      bets: state.bets.map((bet) => (bet.id === updatedBet.id ? updatedBet : bet)),
    })),
  deleteBet: (betId) =>
    set((state) => ({
      bets: state.bets.filter((bet) => bet.id !== betId),
    })),
  addPlatform: (platform) => set((state) => ({ platforms: [...state.platforms, platform] })),
  deletePlatform: (platformId) =>
    set((state) => ({
      platforms: state.platforms.filter((platform) => platform.id !== platformId),
    })),
  updateSpecialOdd: (updatedOdd) =>
    set((state) => ({
      specialOdds: state.specialOdds.map((odd) => (odd.id === updatedOdd.id ? updatedOdd : odd)),
    })),
  clearUserData: () => set({ bets: [], platforms: [] }),
  setLoading: (loading) => set({ loading }),
}));
