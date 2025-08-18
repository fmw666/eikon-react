/**
 * @file selectors.ts
 * @description Auth UI state selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useStore } from 'zustand';

import { authUIStore } from './authUIStore';

// =================================================================================================
// Basic Selectors
// =================================================================================================

function useShowSignInModal() {
  return useStore(authUIStore, state => state.showSignInModal);
}

function useOpenSignInModal() {
  return useStore(authUIStore, state => state.openSignInModal);
}

function useCloseSignInModal() {
  return useStore(authUIStore, state => state.closeSignInModal);
}

// =================================================================================================
// Computed Selectors
// =================================================================================================

function useModalActions() {
  return useStore(authUIStore, state => ({
    openSignInModal: state.openSignInModal,
    closeSignInModal: state.closeSignInModal,
  }));
}

// =================================================================================================
// Memoized Selectors
// =================================================================================================

function useMemoizedModalState() {
  return useStore(
    authUIStore,
    state => ({
      showSignInModal: state.showSignInModal,
      openSignInModal: state.openSignInModal,
      closeSignInModal: state.closeSignInModal,
    })
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  useShowSignInModal,
  useOpenSignInModal,
  useCloseSignInModal,
  useModalActions,
  useMemoizedModalState,
};
