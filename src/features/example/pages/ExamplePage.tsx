/**
 * @file ExamplePage.tsx
 * @description ExamplePage component with anime style design
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

// --- Core Libraries ---
import React, { useState, useEffect, useCallback } from 'react';

// --- Third-party Libraries ---
import { SunIcon, MoonIcon, LanguageIcon } from '@heroicons/react/24/outline';

// --- Absolute Imports ---
import { useMemoizedThemeState, useMemoizedLanguageState } from '@/app/providers';
import { Button } from '@/shared/components/Button';

import { getStaticExampleComponents, type ExampleComponent } from '../utils/componentDiscovery';

// =================================================================================================
// Component
// =================================================================================================

const ExamplePage: React.FC = () => {
  const { isDarkMode, setTheme } = useMemoizedThemeState();
  const { language, setLanguage } = useMemoizedLanguageState();
  const [exampleComponents, setExampleComponents] = useState<ExampleComponent[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const components = getStaticExampleComponents();
        setExampleComponents(components);
        if (components.length > 0) {
          setActiveTab(components[0].id);
        }
      } catch (error) {
        console.error('Failed to load example components:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComponents();
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsTransitioning(true);
    setTheme(isDarkMode ? 'light' : 'dark');
    
    // 重置过渡状态
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200);
  }, [isDarkMode, setTheme]);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  }, [language, setLanguage]);

  // 添加主题切换时的视觉反馈
  useEffect(() => {
    if (isTransitioning) {
      document.body.classList.add('theme-transition-active');
      
      setTimeout(() => {
        document.body.classList.remove('theme-transition-active');
      }, 1200);
    }
  }, [isTransitioning]);

  const ActiveComponent = exampleComponents.find(comp => comp.id === activeTab)?.component;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-700 ease-out-quart ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}>
        <div className={`text-center transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          <div className={`animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6 transition-all duration-500 ease-out ${
            isDarkMode ? 'border-blue-400' : 'border-blue-600'
          }`} style={{
            boxShadow: isDarkMode ? '4px 4px 0px #1f2937' : '4px 4px 0px #000'
          }}></div>
          <p className={`text-xl font-black transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-200' : 'text-gray-600'
          }`} style={{
            textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
            fontFamily: 'Impact, Arial Black, sans-serif'
          }}>
            正在加载组件示例...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full relative overflow-hidden transition-all duration-700 ease-out-quart ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`} style={{
      transitionDelay: isTransitioning ? '0ms' : '0ms'
    }}>
      {/* 漫画背景纹理 */}
      <div className={`absolute inset-0 opacity-20 transition-all duration-500 ease-out ${
        isDarkMode ? 'opacity-10' : 'opacity-20'
      }`} style={{
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 30px,
            ${isDarkMode ? 'rgba(147, 197, 253, 0.15)' : 'rgba(59, 130, 246, 0.08)'} 30px,
            ${isDarkMode ? 'rgba(147, 197, 253, 0.15)' : 'rgba(59, 130, 246, 0.08)'} 32px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 30px,
            ${isDarkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.08)'} 30px,
            ${isDarkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.08)'} 32px
          )
        `,
        transitionDelay: isTransitioning ? '0ms' : '0ms'
      }}></div>

      {/* 主题切换波纹效果 */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 w-0 h-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
            style={{
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 1.2s ease-out'
            }}>
          </div>
        </div>
      )}

      {/* 漫画装饰元素 */}
      <div className={`absolute top-10 left-10 w-20 h-20 rounded-full opacity-15 animate-pulse-slow transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-amber-400' : 'bg-amber-300'
      }`} style={{
        transitionDelay: isTransitioning ? '100ms' : '0ms'
      }}></div>
      <div className={`absolute top-20 right-20 w-16 h-16 rounded-full opacity-10 animate-bounce transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-blue-500' : 'bg-blue-400'
      }`} style={{
        transitionDelay: isTransitioning ? '150ms' : '0ms'
      }}></div>
      <div className={`absolute bottom-20 left-1/4 w-12 h-12 rounded-full opacity-15 animate-ping-slow transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-indigo-500' : 'bg-indigo-400'
      }`} style={{
        transitionDelay: isTransitioning ? '200ms' : '0ms'
      }}></div>
      <div className={`absolute top-1/3 right-1/4 w-8 h-8 rounded-full opacity-12 animate-pulse-slow transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-cyan-900' : 'bg-cyan-100'
      }`} style={{
        transitionDelay: isTransitioning ? '250ms' : '0ms'
      }}></div>

      {/* 主题切换按钮 */}
      <div className="absolute top-6 right-6 z-20 flex space-x-2">
        <Button
          onClick={toggleLanguage}
          className={`p-3 rounded-full transition-all duration-500 ease-out transform hover:scale-110 border-2 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-blue-400 hover:bg-gray-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          style={{
            boxShadow: isDarkMode ? '4px 4px 0px #1f2937' : '4px 4px 0px #000',
            transitionDelay: isTransitioning ? '300ms' : '0ms'
          }}
        >
          <LanguageIcon className="w-6 h-6" />
        </Button>
        <Button
          onClick={toggleDarkMode}
          className={`p-3 rounded-full transition-all duration-500 ease-out transform hover:scale-110 border-2 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-yellow-400 hover:bg-gray-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          style={{
            boxShadow: isDarkMode ? '4px 4px 0px #1f2937' : '4px 4px 0px #000',
            transitionDelay: isTransitioning ? '350ms' : '0ms'
          }}
        >
          {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </Button>
      </div>

      <div className="sm:w-[80vw] w-[90vw] mx-auto px-4 py-16 relative z-10 flex flex-col justify-center items-center min-h-screen">
        {/* 漫画标题 */}
        <div className={`text-center mb-12 ${isTransitioning ? 'animate-scale-in' : ''}`} style={{
          transitionDelay: isTransitioning ? '400ms' : '0ms'
        }}>
          <h1 className={`text-6xl font-black mb-4 relative transition-all duration-500 ease-out ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`} style={{
            textShadow: isDarkMode 
              ? '3px 3px 0px #374151, 6px 6px 0px #000' 
              : '3px 3px 0px #fff, 6px 6px 0px #000',
            fontFamily: 'Impact, Arial Black, sans-serif'
          }}>
            组件示例
          </h1>
          <div className={`w-32 h-2 mx-auto mb-4 transition-all duration-500 ease-out ${
            isDarkMode ? 'bg-white' : 'bg-black'
          }`}></div>
          <p className={`text-xl font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            浏览和测试项目中的所有组件
          </p>
        </div>

        {/* 动漫风格 Tab 导航 */}
        {exampleComponents.length > 0 && (
          <div className={`w-full mb-8 transition-all duration-500 ease-out ${
            isTransitioning ? 'animate-slide-in-down' : ''
          }`} style={{
            transitionDelay: isTransitioning ? '500ms' : '0ms'
          }}>
            <div className={`rounded-none p-4 border-4 border-black transition-all duration-500 ease-out ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`} style={{
              boxShadow: '8px 8px 0px #000',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              <nav className="pb-3 flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth snap-x snap-mandatory">
                {exampleComponents.map((component, index) => (
                  <button
                    key={component.id}
                    onClick={() => setActiveTab(component.id)}
                    className={`py-3 px-6 font-black text-sm transition-all duration-300 ease-out transform hover:scale-105 border-4 border-black flex-shrink-0 snap-start ${
                      activeTab === component.id
                        ? 'bg-blue-500 text-white shadow-4xl'
                        : isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 shadow-2xl'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-2xl'
                    }`}
                    style={{
                      boxShadow: activeTab === component.id 
                        ? '6px 6px 0px #000' 
                        : '4px 4px 0px #000',
                      textShadow: activeTab === component.id ? '2px 2px 0px #000' : 'none',
                      fontFamily: 'Impact, Arial Black, sans-serif',
                      transitionDelay: isTransitioning ? `${600 + index * 50}ms` : '0ms'
                    }}
                  >
                    {component.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* 组件显示区域 */}
        <div className={`w-full transition-all duration-500 ease-out ${
          isTransitioning ? 'animate-fade-in-stagger' : ''
        }`} style={{
          transitionDelay: isTransitioning ? '700ms' : '0ms'
        }}>
          {ActiveComponent ? (
            <div className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`} style={{
              boxShadow: '8px 8px 0px #000',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              <ActiveComponent />
            </div>
          ) : (
            <div className={`text-center py-12 transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              <div className={`text-6xl mb-4 transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-400'
              }`}>📦</div>
              <h3 className={`text-lg font-black mb-2 transition-all duration-500 ease-out ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`} style={{
                textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
                fontFamily: 'Impact, Arial Black, sans-serif'
              }}>
                暂无组件
              </h3>
              <p className={`font-bold transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`} style={{
                textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
              }}>
                请在 src/examples 目录中添加更多组件示例
              </p>
              <div className={`mt-4 text-sm transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-400'
              }`}>
                <p>当前发现的组件数量: {exampleComponents.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default ExamplePage;
