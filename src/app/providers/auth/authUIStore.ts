/**
 * @file authUIStore.ts
 * @description Auth UI state store using Zustand
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

// =================================================================================================
// Types
// =================================================================================================

interface AuthUIState {
  showSignInModal: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

// =================================================================================================
// Store
// =================================================================================================

const authUIStore = createStore(
  subscribeWithSelector<AuthUIState>((set) => ({
    showSignInModal: false,
    openSignInModal: () => set({ showSignInModal: true }),
    closeSignInModal: () => set({ showSignInModal: false }),
  }))
);

// =================================================================================================
// Exports
// =================================================================================================

export { authUIStore };
export type { AuthUIState };
