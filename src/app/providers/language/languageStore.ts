/**
 * @file languageStore.ts
 * @description Language state store using Zustand
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';

// =================================================================================================
// Types
// =================================================================================================

type Language = 'zh' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

// =================================================================================================
// Store
// =================================================================================================

const languageStore = createStore(
  subscribeWithSelector<LanguageState>((set) => ({
    language: 'zh',
    setLanguage: (language) => set({ language }),
  }))
);

// =================================================================================================
// Exports
// =================================================================================================

export { languageStore };
export type { Language, LanguageState };
