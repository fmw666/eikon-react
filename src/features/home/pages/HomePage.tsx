/**
 * @file HomePage.tsx
 * @description HomePage component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Core-related Libraries ---
import { useNavigate } from 'react-router-dom';

// --- Third-party Libraries ---
import { RocketLaunchIcon, SparklesIcon, BoltIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

// --- Absolute Imports ---
import { ROUTES } from '@/app/router/constants';
import { Button } from '@/shared/components/Button';

// =================================================================================================
// Component
// =================================================================================================

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 漫画背景纹理 */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 30px,
            rgba(59, 130, 246, 0.08) 30px,
            rgba(59, 130, 246, 0.08) 32px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 30px,
            rgba(99, 102, 241, 0.08) 30px,
            rgba(99, 102, 241, 0.08) 32px
          )
        `
      }}></div>

      {/* 漫画装饰元素 */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-amber-300 rounded-full opacity-15 animate-pulse"></div>
      <div className="absolute top-20 right-20 w-16 h-16 bg-blue-400 rounded-full opacity-10 animate-bounce"></div>
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-indigo-400 rounded-full opacity-15 animate-ping-slow"></div>
      <div className="absolute top-1/3 right-1/4 w-8 h-8 bg-cyan-100 rounded-full opacity-12 animate-pulse"></div>

      <div className="sm:w-[80vw] w-[90vw] mx-auto px-4 py-16 relative z-10 flex flex-col justify-center items-center min-h-screen">
        {/* 漫画标题 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-gray-800 mb-4 relative" style={{
            textShadow: '3px 3px 0px #fff, 6px 6px 0px #000',
            fontFamily: 'Impact, Arial Black, sans-serif'
          }}>
            AI-DevKit
          </h1>
          <div className="w-32 h-2 bg-black mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-bold" style={{
            textShadow: '1px 1px 0px #fff'
          }}>
            AI 开发工具箱，快速搭建你的 AI 应用！
          </p>
        </div>

        {/* 漫画四宫格布局 */}
        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 第一格：项目介绍 */}
          <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-500" style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform'
          }}>
            <div className="bg-white rounded-none p-6 relative overflow-hidden" style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-black"></div>
              <div className="absolute -bottom-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-white"></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">💡</div>
              <div className="absolute bottom-2 left-2 text-2xl">⚡</div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-gray-800 mb-4" style={{
                  textShadow: '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  项目介绍
                </h2>
                <p className="text-gray-700 font-bold leading-relaxed" style={{
                  textShadow: '1px 1px 0px #fff'
                }}>
                  本项目旨在为 AI 阅读和二次开发提供清晰、易扩展的项目架构。你可以基于本模板快速搭建自己的 AI 应用或业务系统。
                </p>

                {/* 关键卖点一排展示 */}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="flex items-center space-x-2">
                    <RocketLaunchIcon className="w-5 h-5 text-gray-800" />
                    <span className="text-gray-800 font-bold" style={{ textShadow: '1px 1px 0px #fff' }}>快速开发</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-5 h-5 text-gray-800" />
                    <span className="text-gray-800 font-bold" style={{ textShadow: '1px 1px 0px #fff' }}>AI 友好</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BoltIcon className="w-5 h-5 text-gray-800" />
                    <span className="text-gray-800 font-bold" style={{ textShadow: '1px 1px 0px #fff' }}>高性能</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DevicePhoneMobileIcon className="w-5 h-5 text-gray-800" />
                    <span className="text-gray-800 font-bold" style={{ textShadow: '1px 1px 0px #fff' }}>响应式</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第二格：快速开始 */}
          <div className="relative transform -rotate-1 hover:rotate-0 transition-transform duration-500" style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform'
          }}>
            <div className="bg-amber-50 rounded-none p-6 relative overflow-hidden" style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 right-8 w-0 h-0 border-r-[20px] border-r-transparent border-t-[20px] border-t-black"></div>
              <div className="absolute -bottom-2 right-10 w-0 h-0 border-r-[16px] border-r-transparent border-t-[16px] border-t-amber-50"></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 left-2 text-4xl">🚀</div>
              <div className="absolute bottom-2 right-2 text-2xl">🎯</div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-gray-800 mb-4" style={{
                  textShadow: '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  快速开始
                </h2>
                <div className="bg-white rounded-none p-3 mb-4 border-2 border-black" style={{
                  boxShadow: '4px 4px 0px #000',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}>
                  <code className="text-sm text-gray-800 font-mono font-bold">
                    cd docs-site/ && npm install && npm run dev
                  </code>
                </div>
                <p className="text-gray-700 font-bold" style={{
                  textShadow: '1px 1px 0px #fff'
                }}>
                  然后打开 <b className="text-blue-600">localhost:5173</b> 查看文档
                </p>
              </div>
            </div>
          </div>

          {/* 第三格：示例模块 */}
          <div className="relative transform rotate-1 hover:rotate-0 transition-transform duration-500" style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform'
          }}>
            <div className="bg-sky-50 rounded-none p-6 relative overflow-hidden" style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -top-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-b-[20px] border-b-black"></div>
              <div className="absolute -top-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-sky-50"></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">📝</div>
              <div className="absolute bottom-2 left-2 text-2xl">✨</div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-gray-800 mb-4" style={{
                  textShadow: '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  示例模块
                </h2>
                <p className="text-gray-700 font-bold mb-4" style={{
                  textShadow: '1px 1px 0px #fff'
                }}>
                  我们为你提供了 <b className="text-blue-600">task</b> 模块作为示例：
                </p>
                <Button 
                  onClick={() => navigate(ROUTES.TASK.ROOT)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 font-black text-lg transition-all duration-300 transform hover:scale-105 border-4 border-black shadow-4xl hover:shadow-5xl"
                  style={{
                    boxShadow: '6px 6px 0px #000',
                    textShadow: '2px 2px 0px #000',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)'
                  }}
                >
                  进入 task 模块 🎮
                </Button>
              </div>
            </div>
          </div>


          {/* 第四格：组件案例 */}
          <div className="relative transform rotate-0 hover:-rotate-1 transition-transform duration-500" style={{
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform'
          }}>
            <div className="bg-violet-50 rounded-none p-6 relative overflow-hidden" style={{
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}>
              {/* 漫画对话框尾巴 */}
              <div className="absolute -bottom-4 left-8 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-black"></div>
              <div className="absolute -bottom-2 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-violet-50"></div>
              
              {/* 漫画装饰 */}
              <div className="absolute top-2 right-2 text-4xl">🧩</div>
              <div className="absolute bottom-2 left-2 text-2xl">🔍</div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-gray-800 mb-4" style={{
                  textShadow: '2px 2px 0px #fff',
                  fontFamily: 'Impact, Arial Black, sans-serif'
                }}>
                  组件案例
                </h2>
                <p className="text-gray-700 font-bold mb-4" style={{
                  textShadow: '1px 1px 0px #fff'
                }}>
                  查看项目内可复用的 UI 组件示例与演示：
                </p>
                <Button
                  onClick={() => navigate(ROUTES.EXAMPLE.ROOT)}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 font-black text-lg transition-all duration-300 transform hover:scale-105 border-4 border-black shadow-4xl hover:shadow-5xl"
                  style={{
                    boxShadow: '6px 6px 0px #000',
                    textShadow: '2px 2px 0px #000',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)'
                  }}
                >
                  进入示例模块 🔗
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="text-center mt-12">
          <div className="inline-block bg-white rounded-none p-4 border-4 border-black" style={{
            boxShadow: '6px 6px 0px #000',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}>
            <p className="text-gray-800 font-black text-lg" style={{
              textShadow: '1px 1px 0px #fff',
              fontFamily: 'Impact, Arial Black, sans-serif'
            }}>
              准备好开始你的 AI 开发之旅了吗？ 🎉
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
