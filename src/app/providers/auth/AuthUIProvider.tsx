/**
 * @file AuthUIProvider.tsx
 * @description AuthProvider component, provides authentication UI state using Zustand store
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';
import type { ReactNode } from 'react';

// --- Third-party Libraries ---
import { useStore } from 'zustand';

// --- Absolute Imports ---
import { LoginModal } from '@/features/auth';

// --- Relative Imports ---
import { authUIStore } from './authUIStore';

// =================================================================================================
// Types
// =================================================================================================

interface AuthUIProviderProps {
  children: ReactNode;
}

// =================================================================================================
// Components
// =================================================================================================

const AuthUIProvider: React.FC<AuthUIProviderProps> = ({ children }) => {
  const showSignInModal = useStore(authUIStore, state => state.showSignInModal);
  const closeSignInModal = useStore(authUIStore, state => state.closeSignInModal);

  return (
    <>
      {children}
      <LoginModal open={showSignInModal} onClose={closeSignInModal} />
    </>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { AuthUIProvider };
