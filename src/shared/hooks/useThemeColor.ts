/**
 * @file useThemeColor.ts
 * @description Theme color hook for managing theme colors in components
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect } from 'react';

// --- Third-party Libraries ---
import { useStore } from 'zustand';

// --- Absolute Imports ---
import { themeStore } from '@/app/providers/theme/themeStore';
import { updateThemeColor, setCustomThemeColors, getThemeColors } from '@/shared/utils/themeColorManager';

// =================================================================================================
// Hook
// =================================================================================================

/**
 * 主题色 Hook
 * @param customColors 可选的自定义主题色配置
 * @returns 主题色相关函数
 */
function useThemeColor(customColors?: {
  lightThemeColor?: string;
  lightBackgroundColor?: string;
  darkThemeColor?: string;
  darkBackgroundColor?: string;
}) {
  const isDarkMode = useStore(themeStore, state => state.isDarkMode);

  // 设置自定义主题色
  useEffect(() => {
    if (customColors) {
      setCustomThemeColors(
        customColors.lightThemeColor || '#4F46E5',
        customColors.lightBackgroundColor || '#ffffff',
        customColors.darkThemeColor || '#1f2937',
        customColors.darkBackgroundColor || '#111827'
      );
    }
  }, [customColors]);

  // 更新主题色
  useEffect(() => {
    updateThemeColor(isDarkMode);
  }, [isDarkMode]);

  return {
    isDarkMode,
    currentColors: getThemeColors(isDarkMode),
    updateThemeColor: () => updateThemeColor(isDarkMode),
  };
}

// =================================================================================================
// Exports
// =================================================================================================

export { useThemeColor };
