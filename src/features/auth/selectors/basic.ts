/**
 * @file basic.ts
 * @description Basic auth selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';

// --- Relative Imports ---
import { authStore } from '../store/authStore';

// =================================================================================================
// Selectors
// =================================================================================================

function useUser() {
  return useStore(authStore, state => state.user);
}

function useIsAuthenticated() {
  return useStore(authStore, state => !!state.user);
}

function useAuthInitialized() {
  return useStore(authStore, state => state.isInitialized);
}

function useAuthLoading() {
  return useStore(authStore, state => state.isLoading);
}

function useUserId() {
  return useStore(authStore, state => state.user?.id);
}

function useUserName() {
  return useStore(authStore, state => state.user?.name);
}

function useUserEmail() {
  return useStore(authStore, state => state.user?.email);
}

function useUserAvatar() {
  return useStore(authStore, state => state.user?.avatar);
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  useUser,
  useIsAuthenticated,
  useAuthInitialized,
  useAuthLoading,
  useUserId,
  useUserName,
  useUserEmail,
  useUserAvatar
};
