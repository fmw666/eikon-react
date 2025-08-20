/**
 * @file index.ts
 * @description i18n configuration
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { initReactI18next } from 'react-i18next';

// --- Third-party Libraries ---
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// --- Relative Imports ---
import en from './locales/en';
import zh from './locales/zh';

// =================================================================================================
// Initialization
// =================================================================================================

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      zh: {
        translation: zh,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// =================================================================================================
// Exports
// =================================================================================================

export default i18n;
