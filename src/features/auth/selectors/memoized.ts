/**
 * @file memoized.ts
 * @description Memoized auth selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useStore } from 'zustand';

import { authStore } from '../store/authStore';

// =================================================================================================
// Selectors
// =================================================================================================

function useMemoizedUser() {
  return useStore(authStore, state => state.user);
}

function useMemoizedAuthState() {
  return useStore(authStore, state => state);
}

function useMemoizedUserBasicInfo() {
  return useStore(
    authStore,
    state => state.user ? {
      id: state.user.id,
      name: state.user.name,
      email: state.user.email,
      avatar: state.user.avatar,
    } : null,
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { useMemoizedUser, useMemoizedAuthState, useMemoizedUserBasicInfo };
