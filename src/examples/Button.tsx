/**
 * @file Button.tsx
 * @description Button component example with anime style design
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useState } from 'react';

import {
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/shared/components/Button';
import { useMemoizedThemeState } from '@/app/providers';

// =================================================================================================
// Component
// =================================================================================================

const ButtonExample: React.FC = () => {
  const { isDarkMode } = useMemoizedThemeState();
  const [loading, setLoading] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ease-out ${
      isDarkMode ? 'text-gray-200' : 'text-gray-800'
    }`}>
      {/* 动漫风格标题 */}
      <div className={`text-center mb-8 transition-all duration-500 ease-out ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        <h2 className={`text-4xl font-black mb-4 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode 
            ? '3px 3px 0px #374151, 6px 6px 0px #000' 
            : '3px 3px 0px #fff, 6px 6px 0px #000',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🎮 Button 组件示例
        </h2>
        <div className={`w-24 h-2 mx-auto mb-4 transition-all duration-500 ease-out ${
          isDarkMode ? 'bg-white' : 'bg-black'
        }`}></div>
        <p className={`text-lg font-bold transition-all duration-500 ease-out ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`} style={{
          textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
        }}>
          展示Button组件的所有功能和变体，包括新的icon模式
        </p>
      </div>
      
      {/* Icon Mode Buttons */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🎨 Icon 模式按钮
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className={`text-sm font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>Small</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="sm" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="sm" icon={<PlusIcon />} />
              <Button variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-sm font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>Medium</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="md" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="md" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="md" icon={<PlusIcon />} />
              <Button variant="danger" size="md" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-sm font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>Large</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="lg" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="lg" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="lg" icon={<PlusIcon />} />
              <Button variant="danger" size="lg" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-sm font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>Extra Large</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="xl" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="xl" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="xl" icon={<PlusIcon />} />
              <Button variant="danger" size="xl" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
        </div>
        
        {/* Icon模式圆形验证 */}
        <div className={`mt-8 p-4 rounded-none border-2 border-black transition-all duration-500 ease-out ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`} style={{
          boxShadow: '4px 4px 0px #000',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}>
          <h4 className={`text-md font-black transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            🔍 Icon模式圆形验证
          </h4>
          <p className={`text-sm font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            以下按钮应该都是完美的圆形，无论尺寸大小：
          </p>
          <div className="flex items-center gap-4 flex-wrap mt-3">
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary" size="sm" icon={<XMarkIcon className="w-4 h-4" />} />
              <span className={`text-xs font-black transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} style={{
                textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
              }}>sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary" size="md" icon={<XMarkIcon className="w-4 h-4" />} />
              <span className={`text-xs font-black transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} style={{
                textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
              }}>md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary" size="lg" icon={<XMarkIcon className="w-4 h-4" />} />
              <span className={`text-xs font-black transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} style={{
                textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
              }}>lg</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary" size="xl" icon={<XMarkIcon className="w-4 h-4" />} />
              <span className={`text-xs font-black transition-all duration-500 ease-out ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} style={{
                textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
              }}>xl</span>
            </div>
          </div>
        </div>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">🎯</div>
          <div className="text-2xl">⚡</div>
        </div>
      </section>

      {/* 常规按钮变体 */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🚀 按钮变体
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className={`text-lg font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>基础变体</h4>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-lg font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>按钮尺寸</h4>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" size="xl">Extra Large</Button>
            </div>
          </div>
        </div>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">🎨</div>
          <div className="text-2xl">✨</div>
        </div>
      </section>

      {/* 加载状态按钮 */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          ⏳ 加载状态按钮
        </h3>
        
        <div className="flex gap-4 flex-wrap">
          <Button 
            variant="primary" 
            loading={loading}
            onClick={handleLoadingClick}
          >
            点击加载
          </Button>
          <Button 
            variant="outline" 
            loading={loading}
          >
            轮廓加载
          </Button>
          <Button 
            variant="primary" 
            size="md" 
            loading 
            icon={<PlusIcon />} 
          />
        </div>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">⏳</div>
          <div className="text-2xl">🔄</div>
        </div>
      </section>

      {/* 特殊效果按钮 */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🌟 特殊效果按钮
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className={`text-lg font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>带图标按钮</h4>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" leftIcon={<PlusIcon />}>
                新建项目
              </Button>
              <Button variant="outline" leftIcon={<PencilIcon className="w-4 h-4" />}>
                编辑
              </Button>
              <Button variant="ghost" rightIcon={<ChevronDownIcon className="w-4 h-4" />}>
                展开
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className={`text-lg font-black transition-all duration-500 ease-out ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} style={{
              textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
            }}>禁用状态</h4>
            <div className="flex gap-3 flex-wrap">
              <Button disabled>禁用按钮</Button>
              <Button variant="outline" disabled>
                禁用轮廓按钮
              </Button>
              <Button variant="primary" disabled icon={<PlusIcon />} />
            </div>
          </div>
        </div>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">🌟</div>
          <div className="text-2xl">💫</div>
        </div>
      </section>
    </div>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export { ButtonExample };
