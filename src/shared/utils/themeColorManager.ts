/**
 * @file themeColorManager.ts
 * @description Theme color manager for mobile devices
 * @author fmw666@github
 */

// =================================================================================================
// Types
// =================================================================================================

interface ThemeColors {
  light: {
    themeColor: string;
    backgroundColor: string;
  };
  dark: {
    themeColor: string;
    backgroundColor: string;
  };
}

// =================================================================================================
// Constants
// =================================================================================================

const THEME_COLORS: ThemeColors = {
  light: {
    themeColor: '#fff', // 浅色主题色
    backgroundColor: '#ffffff', // 浅色背景色
  },
  dark: {
    themeColor: '#15151E', // 深色主题色
    backgroundColor: '#111827', // 深色背景色
  },
};

// =================================================================================================
// Functions
// =================================================================================================

/**
 * 更新主题色
 * @param isDarkMode 是否为深色模式
 */
function updateThemeColor(isDarkMode: boolean): void {
  const colors = isDarkMode ? THEME_COLORS.dark : THEME_COLORS.light;
  
  // 更新 meta theme-color
  updateMetaThemeColor(colors.themeColor);
  
  // 更新 webmanifest theme_color
  updateWebManifestThemeColor(colors.themeColor, colors.backgroundColor);
}

/**
 * 更新 meta theme-color
 * @param color 主题色
 */
function updateMetaThemeColor(color: string): void {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  metaThemeColor.setAttribute('content', color);
}

/**
 * 更新 webmanifest theme_color
 * @param themeColor 主题色
 * @param backgroundColor 背景色
 */
function updateWebManifestThemeColor(themeColor: string, backgroundColor: string): void {
  // 动态更新 webmanifest 文件
  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  
  if (manifestLink) {
    // 创建新的 manifest 内容
    const manifest = {
      name: "DesignChat AI",
      short_name: "DesignChat",
      description: "一站式 AI 图像生成服务，支持多种模型，快速生成高质量图片",
      icons: [
        {
          src: "/favicon.svg",
          sizes: "any",
          type: "image/svg+xml"
        }
      ],
      theme_color: themeColor,
      background_color: backgroundColor,
      display: "standalone",
      start_url: "/",
      orientation: "portrait"
    };
    
    // 创建 Blob URL
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json'
    });
    
    // 更新 manifest 链接
    const newUrl = URL.createObjectURL(blob);
    manifestLink.href = newUrl;
    
    // 清理旧的 Blob URL
    setTimeout(() => {
      URL.revokeObjectURL(newUrl);
    }, 1000);
  }
}

/**
 * 初始化主题色
 * @param isDarkMode 是否为深色模式
 */
function initializeThemeColor(isDarkMode: boolean): void {
  updateThemeColor(isDarkMode);
}

/**
 * 获取当前主题色配置
 * @param isDarkMode 是否为深色模式
 * @returns 主题色配置
 */
function getThemeColors(isDarkMode: boolean): { themeColor: string; backgroundColor: string } {
  return isDarkMode ? THEME_COLORS.dark : THEME_COLORS.light;
}

/**
 * 自定义主题色
 * @param lightThemeColor 浅色主题色
 * @param lightBackgroundColor 浅色背景色
 * @param darkThemeColor 深色主题色
 * @param darkBackgroundColor 深色背景色
 */
function setCustomThemeColors(
  lightThemeColor: string,
  lightBackgroundColor: string,
  darkThemeColor: string,
  darkBackgroundColor: string
): void {
  THEME_COLORS.light.themeColor = lightThemeColor;
  THEME_COLORS.light.backgroundColor = lightBackgroundColor;
  THEME_COLORS.dark.themeColor = darkThemeColor;
  THEME_COLORS.dark.backgroundColor = darkBackgroundColor;
}

// =================================================================================================
// Exports
// =================================================================================================

export { updateThemeColor, initializeThemeColor, setCustomThemeColors, getThemeColors };
