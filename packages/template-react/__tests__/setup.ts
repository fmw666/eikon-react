/**
 * @file setup.ts
 * @description Vitest setup file (registered via vitest.config).
 *
 * Adds jest-dom matchers, eagerly initialises i18next with both shipped
 * locale bundles loaded synchronously (so component tests that render
 * `useTranslation()` consumers don't have to wait on dynamic imports nor
 * emit the "no i18next instance" warning), and runs `cleanup()` after
 * every test so Testing Library doesn't leak DOM nodes between cases.
 *
 * Tests that need a different i18n state can call `i18n.changeLanguage()`
 * inside their own `beforeEach`. Tests that don't care about i18n are
 * unaffected — the init is a one-time, no-network setup.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { afterEach, beforeAll } from 'vitest';

// --- Absolute Imports ---
import en from '@/shared/i18n/locales/en.json';
import zh from '@/shared/i18n/locales/zh.json';

// =================================================================================================
// i18n bootstrap (sync)
// =================================================================================================

beforeAll(async () => {
  if (i18n.isInitialized) return;
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
  });
});

// =================================================================================================
// Hooks
// =================================================================================================

afterEach(() => {
  cleanup();
});
