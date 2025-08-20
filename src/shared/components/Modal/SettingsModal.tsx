/**
 * @file SettingsModal.tsx
 * @description Settings modal component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

// --- Core Libraries ---
import React, { useMemo } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Absolute Imports ---
import { useMemoizedThemeState, useMemoizedLanguageState } from '@/app/providers';
import { Select } from '@/shared/components/Select';

// --- Relative Imports ---
import Modal from './Modal';
import type { ModalProps } from './Modal';

// =================================================================================================
// Types
// =================================================================================================

interface SettingsModalProps extends Pick<ModalProps, 'open' | 'onClose'> {}

// =================================================================================================
// Component
// =================================================================================================

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useMemoizedThemeState();
  const { language, setLanguage } = useMemoizedLanguageState();

  const languageOptions = useMemo(
    () => [
      { value: 'zh', label: t('settings.languages.zh') },
      { value: 'en', label: t('settings.languages.en') },
    ],
    [t]
  );

  const themeOptions = useMemo(
    () => [
      { value: 'system', label: t('settings.themes.system') },
      { value: 'light', label: t('settings.themes.light') },
      { value: 'dark', label: t('settings.themes.dark') },
    ],
    [t]
  );

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')} size="md">
      <div className="space-y-6">
        <section>
          <div className="text-sm font-medium mb-2">{t('settings.language')}</div>
          <Select
            value={language}
            options={languageOptions}
            onChange={(val) => setLanguage(val as 'zh' | 'en')}
          />
        </section>

        <section>
          <div className="text-sm font-medium mb-2">{t('settings.theme')}</div>
          <Select
            value={theme}
            options={themeOptions}
            onChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
          />
        </section>
      </div>
    </Modal>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default SettingsModal;
