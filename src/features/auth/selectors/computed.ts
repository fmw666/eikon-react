/**
 * @file computed.ts
 * @description Computed auth selectors
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

function useUserPermissions() {
  return useStore(authStore, state => state.user?.permissions || []);
}

function useHasPermission(permission: string) {
  return useStore(authStore, state => state.user?.permissions?.includes(permission) || false);
}

function useUserRole() {
  return useStore(authStore, state => state.user?.role);
}

function useIsAdmin() {
  return useStore(authStore, state => state.user?.role === 'admin');
}

// =================================================================================================
// Exports
// =================================================================================================

export { useUserPermissions, useHasPermission, useUserRole, useIsAdmin };
