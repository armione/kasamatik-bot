import { create } from 'zustand';
import { Bet } from '../types';

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

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
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

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
}));
