/**
 * @file selectors.ts
 * @description Language state selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';

// --- Relative Imports ---
import { languageStore } from './languageStore';

// =================================================================================================
// Types
// =================================================================================================

type Language = 'zh' | 'en';

// =================================================================================================
// Selectors
// =================================================================================================

function useLanguage() {
  return useStore(languageStore, state => state.language);
}

function useSetLanguage() {
  return useStore(languageStore, state => state.setLanguage);
}

// =================================================================================================
// Memoized Selectors
// =================================================================================================

function useMemoizedLanguageState() {
  return useStoreWithEqualityFn(
    languageStore,
    state => ({
      language: state.language,
      setLanguage: state.setLanguage,
    }),
    (prev, next) => {
      return prev.language === next.language && prev.setLanguage === next.setLanguage;
    }
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  useLanguage,
  useSetLanguage,
  useMemoizedLanguageState,
};
export type { Language };
