import { create } from 'zustand';
import { Bet, SpecialOdd } from '../types';

interface PrefilledBetData {
  status: 'won' | 'lost' | 'refunded';
  win_amount: number;
}

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  isPlatformManagerModalOpen: boolean;
  openPlatformManagerModal: () => void;
  closePlatformManagerModal: () => void;

  isEditBetModalOpen: boolean;
  editingBet: Bet | null;
  prefilledBetData: PrefilledBetData | null;
  openEditBetModal: (bet: Bet, prefilledData?: PrefilledBetData) => void;
  closeEditBetModal: () => void;
  
  isCashTransactionModalOpen: boolean;
  openCashTransactionModal: () => void;
  closeCashTransactionModal: () => void;

  isPlaySpecialOddModalOpen: boolean;
  playingSpecialOdd: SpecialOdd | null;
  openPlaySpecialOddModal: (odd: SpecialOdd) => void;
  closePlaySpecialOddModal: () => void;

  isFullEditBetModalOpen: boolean;
  fullEditingBet: Bet | null;
  openFullEditBetModal: (bet: Bet) => void;
  closeFullEditBetModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  isPlatformManagerModalOpen: false,
  openPlatformManagerModal: () => set({ isPlatformManagerModalOpen: true }),
  closePlatformManagerModal: () => set({ isPlatformManagerModalOpen: false }),

  isEditBetModalOpen: false,
  editingBet: null,
  prefilledBetData: null,
  openEditBetModal: (bet, prefilledData) => set({ isEditBetModalOpen: true, editingBet: bet, prefilledBetData: prefilledData || null }),
  closeEditBetModal: () => set({ isEditBetModalOpen: false, editingBet: null, prefilledBetData: null }),
  
  isCashTransactionModalOpen: false,
  openCashTransactionModal: () => set({ isCashTransactionModalOpen: true }),
  closeCashTransactionModal: () => set({ isCashTransactionModalOpen: false }),

  isPlaySpecialOddModalOpen: false,
  playingSpecialOdd: null,
  openPlaySpecialOddModal: (odd) => set({ isPlaySpecialOddModalOpen: true, playingSpecialOdd: odd }),
  closePlaySpecialOddModal: () => set({ isPlaySpecialOddModalOpen: false, playingSpecialOdd: null }),

  isFullEditBetModalOpen: false,
  fullEditingBet: null,
  openFullEditBetModal: (bet) => set({ isFullEditBetModalOpen: true, fullEditingBet: bet }),
  closeFullEditBetModal: () => set({ isFullEditBetModalOpen: false, fullEditingBet: null }),
}));