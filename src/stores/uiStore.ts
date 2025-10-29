import { create } from 'zustand';
import { Bet, SpecialOdd } from '../types';

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
  openEditBetModal: (bet: Bet) => void;
  closeEditBetModal: () => void;
  
  isCashTransactionModalOpen: boolean;
  openCashTransactionModal: () => void;
  closeCashTransactionModal: () => void;

  isPlaySpecialOddModalOpen: boolean;
  playingSpecialOdd: SpecialOdd | null;
  openPlaySpecialOddModal: (odd: SpecialOdd) => void;
  closePlaySpecialOddModal: () => void;
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
  openEditBetModal: (bet) => set({ isEditBetModalOpen: true, editingBet: bet }),
  closeEditBetModal: () => set({ isEditBetModalOpen: false, editingBet: null }),
  
  isCashTransactionModalOpen: false,
  openCashTransactionModal: () => set({ isCashTransactionModalOpen: true }),
  closeCashTransactionModal: () => set({ isCashTransactionModalOpen: false }),

  isPlaySpecialOddModalOpen: false,
  playingSpecialOdd: null,
  openPlaySpecialOddModal: (odd) => set({ isPlaySpecialOddModalOpen: true, playingSpecialOdd: odd }),
  closePlaySpecialOddModal: () => set({ isPlaySpecialOddModalOpen: false, playingSpecialOdd: null }),
}));
