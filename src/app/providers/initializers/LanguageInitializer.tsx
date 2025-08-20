/**
 * @file LanguageInitializer.tsx
 * @description Language initializer component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useEffect } from 'react';

// --- Third-party Libraries ---
import { useTranslation } from 'react-i18next';

// --- Absolute Imports ---
import { useMemoizedLanguageState } from '@/app/providers/language';

// =================================================================================================
// Component
// =================================================================================================

const LanguageInitializer: React.FC = () => {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useMemoizedLanguageState();

  // 同步 i18n 语言状态到我们的 store
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // 监听 i18n 语言变化并同步到 store
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (lng !== language && (lng === 'zh' || lng === 'en')) {
        setLanguage(lng as 'zh' | 'en');
      }
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, language, setLanguage]);

  return null;
};

// =================================================================================================
// Export
// =================================================================================================

export { LanguageInitializer };
