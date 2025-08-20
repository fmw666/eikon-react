/**
 * @file actions.ts
 * @description Auth action selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';

// --- Relative Imports ---
import { authStore } from '../store/authStore';

// =================================================================================================
// Selectors
// =================================================================================================

function useAuthActions() {
  return useStoreWithEqualityFn(authStore, state => ({
    initialize: state.initialize,
    logout: state.logout,
    pwdLogin: state.pwdLogin,
    sendVerificationCode: state.sendVerificationCode,
    verifyCode: state.verifyCode,
  }), shallow);
}

function useInitializeAuth() {
  return useStore(authStore, state => state.initialize);
}

function useLogout() {
  return useStore(authStore, state => state.logout);
}

function usePwdLogin() {
  return useStore(authStore, state => state.pwdLogin);
}

// =================================================================================================
// Exports
// =================================================================================================

export { useAuthActions, useInitializeAuth, useLogout, usePwdLogin };
