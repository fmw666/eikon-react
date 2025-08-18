/**
 * @file authStore.ts
 * @description Zustand store for authentication state management
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { authService } from '../services/authService';
import { User } from '../types/authTypes';

// =================================================================================================
// Types
// =================================================================================================

interface AuthStoreState {
  // -- State --
  isInitialized: boolean;
  isLoading: boolean;
  user: User | null;

  // -- State Setters --
  setIsInitialized: (isInitialized: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setUser: (user: User | null) => void;

  // -- Operations --
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  pwdLogin: (email: string, password: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
}

// =================================================================================================
// Store
// =================================================================================================

const authStore = createStore<AuthStoreState>()(
  subscribeWithSelector((set, get) => ({
    // -- State --
    isInitialized: false,
    isLoading: false,
    user: null,

    // -- State Setters --
    setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
    setUser: (user: User | null) => set({ user }),

    // -- Operations --
    initialize: async () => {
      if (get().isInitialized || get().isLoading) return;
      
      try {
        set(state => ({
          ...state,
          isLoading: true
        }));

        const user: User | null = await authService.getSession();
        
        set(state => ({
          ...state,
          user,
          isLoading: false,
          isInitialized: true
        }));
      } catch (error) {
        console.error('[AuthStore] Error initializing auth:', error);
        set(state => ({
          ...state,
          user: null,
          isLoading: false,
          isInitialized: true
        }));
      }
    },

    logout: async () => {
      try {
        await authService.logout();
        set({ user: null });
      } catch (error) {
        console.error('[AuthStore] Error logging out:', error);
        throw error;
      }
    },

    pwdLogin: async (email: string, password: string) => {
      try {
        const user: User | null = await authService.pwdLogin(email, password);
        set({ user });
      } catch (error) {
        console.error('[AuthStore] Error logging in:', error);
        throw error;
      }
    },

    sendVerificationCode: async (email: string) => {
      try {
        await authService.sendEmailVerification(email);
      } catch (error) {
        console.error('[AuthStore] Error sending verification code:', error);
        throw error;
      }
    },

    verifyCode: async (email: string, code: string) => {
      try {
        await authService.verifyEmailCode(email, code);
      } catch (error) {
        console.error('[AuthStore] Error verifying code:', error);
        throw error;
      }
    },
  }))
);

// =================================================================================================
// Exports
// =================================================================================================

export { authStore };
