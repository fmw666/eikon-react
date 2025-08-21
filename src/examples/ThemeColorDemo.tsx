/**
 * @file ThemeColorDemo.tsx
 * @description Theme color demo component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState } from 'react';

// --- Absolute Imports ---
import { useIsDarkMode, useSetTheme } from '@/app/providers/theme';
import { useThemeColor } from '@/shared/hooks/useThemeColor';

// =================================================================================================
// Component
// =================================================================================================

const ThemeColorDemo: React.FC = () => {
  const isDarkMode = useIsDarkMode();
  const setTheme = useSetTheme();
  const { currentColors } = useThemeColor();
  const [customColors, setCustomColors] = useState({
    lightThemeColor: '#4F46E5',
    lightBackgroundColor: '#ffffff',
    darkThemeColor: '#1f2937',
    darkBackgroundColor: '#111827',
  });

  const handleThemeToggle = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  const handleCustomColors = () => {
    setCustomColors({
      lightThemeColor: '#10B981', // 绿色
      lightBackgroundColor: '#f9fafb',
      darkThemeColor: '#059669',
      darkBackgroundColor: '#1f2937',
    });
  };

  const handleResetColors = () => {
    setCustomColors({
      lightThemeColor: '#4F46E5',
      lightBackgroundColor: '#ffffff',
      darkThemeColor: '#1f2937',
      darkBackgroundColor: '#111827',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          主题色演示
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 dark:text-gray-300">当前主题:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isDarkMode 
                ? 'bg-gray-800 text-white' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isDarkMode ? '深色' : '浅色'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                当前主题色
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: currentColors.themeColor }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentColors.themeColor}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: currentColors.backgroundColor }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentColors.backgroundColor}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                自定义主题色
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: customColors.lightThemeColor }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    浅色: {customColors.lightThemeColor}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: customColors.darkThemeColor }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    深色: {customColors.darkThemeColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={handleThemeToggle}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              切换主题
            </button>
            <button
              onClick={handleCustomColors}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              应用绿色主题
            </button>
            <button
              onClick={handleResetColors}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              重置主题色
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
              移动端效果说明
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 主题色会自动更新移动端浏览器的主题色</li>
              <li>• 在移动端上下滑动时，界面外的主题色会跟随切换</li>
              <li>• 支持 PWA 安装后的主题色显示</li>
              <li>• 自动适配系统主题偏好</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { ThemeColorDemo };
