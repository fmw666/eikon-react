/**
 * @file SettingsModal.tsx
 * @description Settings modal component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

import React from 'react';

import { useTranslation } from 'react-i18next';

import { useMemoizedThemeState } from '@/app/providers/theme/selectors';

import type { ModalProps } from './Modal';
import Modal from './Modal';

// =================================================================================================
// Types
// =================================================================================================

interface SettingsModalProps extends Pick<ModalProps, 'open' | 'onClose'> {}

// =================================================================================================
// Component
// =================================================================================================

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useMemoizedThemeState();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'light' | 'dark' | 'system';
    setTheme(value);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')} size="md">
      <div className="space-y-6">
        <section>
          <div className="text-sm font-medium mb-2">{t('settings.language')}</div>
          <select
            className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition hover:border-blue-400"
            value={i18n.language}
            onChange={handleLanguageChange}
          >
            <option value="zh">{t('settings.languages.zh')}</option>
            <option value="en">{t('settings.languages.en')}</option>
          </select>
        </section>

        <section>
          <div className="text-sm font-medium mb-2">{t('settings.theme')}</div>
          <select
            className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition hover:border-blue-400"
            value={theme}
            onChange={handleThemeChange}
          >
            <option value="system">{t('settings.themes.system')}</option>
            <option value="light">{t('settings.themes.light')}</option>
            <option value="dark">{t('settings.themes.dark')}</option>
          </select>
        </section>
      </div>
    </Modal>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default SettingsModal;
