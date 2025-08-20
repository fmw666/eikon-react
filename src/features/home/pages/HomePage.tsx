/**
 * @file HomePage.tsx
 * @description HomePage component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

// --- Core Libraries ---
import React, { useCallback, useState, useEffect } from 'react';

// --- Core-related Libraries ---
import { useNavigate } from 'react-router-dom';

// --- Third-party Libraries ---
import { RocketLaunchIcon, SparklesIcon, BoltIcon, DevicePhoneMobileIcon, SunIcon, MoonIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { useTranslation, Trans } from 'react-i18next';

// --- Absolute Imports ---
import { ROUTES } from '@/app/router/constants';
import { useMemoizedThemeState, useMemoizedLanguageState } from '@/app/providers';
import { Button } from '@/shared/components/Button';

// =================================================================================================
// Component
// =================================================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDarkMode, setTheme } = useMemoizedThemeState();
  const { language, setLanguage } = useMemoizedLanguageState();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleDarkMode = useCallback(() => {
    setIsTransitioning(true);
    setTheme(isDarkMode ? 'light' : 'dark');
    
    // 重置过渡状态
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200); // 总过渡时间
  }, [isDarkMode, setTheme]);

  // 添加主题切换时的视觉反馈
  useEffect(() => {
    if (isTransitioning) {
      // 添加全局过渡类
      document.body.classList.add('theme-transition-active');
      
      // 移除过渡类
      setTimeout(() => {
        document.body.classList.remove('theme-transition-active');
      }, 1200);
    }
  }, [isTransitioning]);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  }, [language, setLanguage]);

  return (
    <div className={`min-h-screen w-full relative overflow-hidden transition-all duration-700 ease-out-quart ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`} style={{
      transitionDelay: isTransitioning ? '0ms' : '0ms'
    }}>
      {/* 漫画背景纹理 - 第一层过渡 */}
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

      {/* 漫画装饰元素 - 第二层过渡 */}
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

      {/* 主题切换按钮 - 第三层过渡 */}
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
        {/* 漫画标题 - 第四层过渡 */}
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
            {t('home.title')}
          </h1>
          <div className={`w-32 h-2 mx-auto mb-4 transition-all duration-500 ease-out ${
            isDarkMode ? 'bg-white' : 'bg-black'
          }`}></div>
          <p className={`text-xl font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            {t('home.subtitle')}
          </p>
        </div>

        {/* 漫画四宫格布局 - 第五层过渡 */}
        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 第一格：项目介绍 - 500ms延迟 */}
          <div className={`relative transform rotate-2 hover:rotate-0 transition-all duration-500 ease-out ${
            isTransitioning ? 'animate-scale-in' : ''
          }`} style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transitionDelay: isTransitioning ? '500ms' : '0ms'
          }}>
            <div className={`rounded-none p-6 relative overflow-hidden transition-all duration-500 ease-out ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-white'
            }`} style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' 
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-black"></div>
              <div className={`absolute -bottom-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] transition-all duration-500 ease-out ${
                isDarkMode ? 'border-t-gray-800' : 'border-t-white'
              }`}></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">💡</div>
              <div className="absolute bottom-2 left-2 text-2xl">⚡</div>
              
              <div className="relative z-10">
                <h2 className={`text-2xl font-black mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`} style={{
                  textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  {t('home.sections.introduction.title')}
                </h2>
                <p className={`font-bold leading-relaxed transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} style={{
                  textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
                }}>
                  {t('home.sections.introduction.description')}
                </p>

                {/* 关键卖点一排展示 */}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="flex items-center space-x-2">
                    <RocketLaunchIcon className={`w-5 h-5 transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-blue-400' : 'text-gray-800'
                    }`} />
                    <span className={`font-bold transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`} style={{ 
                      textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff' 
                    }}>{t('home.sections.introduction.features.rapidDevelopment')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className={`w-5 h-5 transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-purple-400' : 'text-gray-800'
                    }`} />
                    <span className={`font-bold transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`} style={{ 
                      textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff' 
                    }}>{t('home.sections.introduction.features.aiFriendly')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BoltIcon className={`w-5 h-5 transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-yellow-400' : 'text-gray-800'
                    }`} />
                    <span className={`font-bold transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`} style={{ 
                      textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff' 
                    }}>{t('home.sections.introduction.features.highPerformance')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DevicePhoneMobileIcon className={`w-5 h-5 transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-green-400' : 'text-gray-800'
                    }`} />
                    <span className={`font-bold transition-all duration-500 ease-out ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`} style={{ 
                      textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff' 
                    }}>{t('home.sections.introduction.features.responsive')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第二格：快速开始 - 600ms延迟 */}
          <div className={`relative transform -rotate-1 hover:rotate-0 transition-all duration-500 ease-out ${
            isTransitioning ? 'animate-slide-in-right' : ''
          }`} style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transitionDelay: isTransitioning ? '600ms' : '0ms'
          }}>
            <div className={`rounded-none p-6 relative overflow-hidden transition-all duration-500 ease-out ${
              isDarkMode 
                ? 'bg-amber-900 border-gray-600' 
                : 'bg-amber-50'
            }`} style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #92400e 0%, #78350f 100%)' 
                : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 right-8 w-0 h-0 border-r-[20px] border-r-transparent border-t-[20px] border-t-black"></div>
              <div className={`absolute -bottom-2 right-10 w-0 h-0 border-r-[16px] border-r-transparent border-t-[16px] transition-all duration-500 ease-out ${
                isDarkMode ? 'border-t-amber-900' : 'border-t-amber-50'
              }`}></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">🚀</div>
              <div className="absolute bottom-2 left-2 text-2xl">🎯</div>
              
              <div className="relative z-10">
                <h2 className={`text-2xl font-black mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-amber-100' : 'text-gray-800'
                }`} style={{
                  textShadow: isDarkMode ? '2px 2px 0px #92400e' : '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  {t('home.sections.quickStart.title')}
                </h2>
                <div className={`rounded-none p-3 mb-4 border-2 border-black transition-all duration-500 ease-out ${
                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                }`} style={{
                  boxShadow: '4px 4px 0px #000',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}>
                  <code className={`text-sm font-mono font-bold transition-all duration-500 ease-out ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {t('home.sections.quickStart.command')}
                  </code>
                </div>
                <p className={`font-bold transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-amber-200' : 'text-gray-700'
                }`} style={{
                  textShadow: isDarkMode ? '1px 1px 0px #92400e' : '1px 1px 0px #fff'
                }}>
                  <Trans
                    i18nKey="home.sections.quickStart.description"
                    components={{
                      url: <b className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    }}
                    values={{
                      url: t('home.sections.quickStart.url')
                    }}
                  />
                </p>
              </div>
            </div>
          </div>

          {/* 第三格：示例模块 - 700ms延迟 */}
          <div className={`relative transform rotate-1 hover:rotate-0 transition-all duration-500 ease-out ${
            isTransitioning ? 'animate-slide-in-left' : ''
          }`} style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transitionDelay: isTransitioning ? '700ms' : '0ms'
          }}>
            <div className={`rounded-none p-6 relative overflow-hidden transition-all duration-500 ease-out ${
              isDarkMode 
                ? 'bg-sky-900 border-gray-600' 
                : 'bg-sky-50'
            }`} style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)' 
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -top-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-b-[20px] border-b-black"></div>
              <div className={`absolute -top-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] transition-all duration-500 ease-out ${
                isDarkMode ? 'border-b-sky-900' : 'border-b-sky-50'
              }`}></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">📝</div>
              <div className="absolute bottom-2 left-2 text-2xl">✨</div>
              
              <div className="relative z-10">
                <h2 className={`text-2xl font-black mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-sky-100' : 'text-gray-800'
                }`} style={{
                  textShadow: isDarkMode ? '2px 2px 0px #0c4a6e' : '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  {t('home.sections.examples.title')}
                </h2>
                <p className={`font-bold mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-sky-200' : 'text-gray-700'
                }`} style={{
                  textShadow: isDarkMode ? '1px 1px 0px #0c4a6e' : '1px 1px 0px #fff'
                }}>
                  {t('home.sections.examples.description')}
                </p>
                <Button 
                  onClick={() => navigate(ROUTES.TASK.ROOT)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 font-black text-lg transition-all duration-500 ease-out transform hover:scale-105 border-4 border-black shadow-4xl hover:shadow-5xl"
                  style={{
                    boxShadow: '6px 6px 0px #000',
                    textShadow: '2px 2px 0px #000',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)'
                  }}
                >
                  {t('home.sections.examples.button')}
                </Button>
              </div>
            </div>
          </div>


          {/* 第四格：组件案例 - 800ms延迟 */}
          <div className={`relative transform rotate-0 hover:-rotate-1 transition-all duration-500 ease-out ${
            isTransitioning ? 'animate-fade-in-stagger' : ''
          }`} style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transitionDelay: isTransitioning ? '800ms' : '0ms'
          }}>
            <div className={`rounded-none p-6 relative overflow-hidden transition-all duration-500 ease-out ${
              isDarkMode 
                ? 'bg-violet-900 border-gray-600' 
                : 'bg-violet-50'
            }`} style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #581c87 0%, #4c1d95 100%)' 
                : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-black"></div>
              <div className={`absolute -bottom-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] transition-all duration-500 ease-out ${
                isDarkMode ? 'border-t-violet-900' : 'border-t-violet-50'
              }`}></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">🧩</div>
              <div className="absolute bottom-2 left-2 text-2xl">🔍</div>
              
              <div className="relative z-10">
                <h2 className={`text-2xl font-black mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-violet-100' : 'text-gray-800'
                }`} style={{
                  textShadow: isDarkMode ? '2px 2px 0px #581c87' : '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  {t('home.sections.components.title')}
                </h2>
                <p className={`font-bold mb-4 transition-all duration-500 ease-out ${
                  isDarkMode ? 'text-violet-200' : 'text-gray-700'
                }`} style={{
                  textShadow: isDarkMode ? '1px 1px 0px #581c87' : '1px 1px 0px #fff'
                }}>
                  {t('home.sections.components.description')}
                </p>
                <Button
                  onClick={() => navigate(ROUTES.EXAMPLE.ROOT)}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 font-black text-lg transition-all duration-500 ease-out transform hover:scale-105 border-4 border-black shadow-4xl hover:shadow-5xl"
                  style={{
                    boxShadow: '6px 6px 0px #000',
                    textShadow: '2px 2px 0px #000',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)'
                  }}
                >
                  {t('home.sections.components.button')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部装饰 - 900ms延迟 */}
        <div className={`text-center mt-12 ${isTransitioning ? 'animate-fade-in-stagger' : ''}`} style={{
          transitionDelay: isTransitioning ? '900ms' : '0ms'
        }}>
          <div className={`inline-block rounded-none p-4 border-4 border-black transition-all duration-500 ease-out ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`} style={{
            boxShadow: '6px 6px 0px #000',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}>
            <p className={`font-black text-lg transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff',
              fontFamily: 'Impact, Arial Black, sans-serif'
            }}>
              {t('home.footer.message')} 🎉
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default HomePage;
