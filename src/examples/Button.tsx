/**
 * @file Button.tsx
 * @description Button component example
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useState } from 'react';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/shared/components/Button';

// =================================================================================================
// Component
// =================================================================================================

const ButtonExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Button 组件示例</h2>
        <p className="text-lg text-gray-600">
          展示Button组件的所有功能和变体，包括新的icon模式
        </p>
      </div>
      
        {/* Icon Mode Buttons */}
        <section className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-semibold mb-6 text-gray-800">Icon 模式按钮</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-600">Small</h4>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" icon={<XMarkIcon className="w-4 h-4" />} />
                <Button variant="ghost" size="sm" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
                <Button variant="outline" size="sm" icon={<PlusIcon />} />
                <Button variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4" />} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-600">Medium</h4>
                          <div className="flex gap-3">
              <Button variant="primary" size="md" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="md" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="md" icon={<PlusIcon />} />
              <Button variant="danger" size="md" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-600">Large</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="lg" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="lg" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="lg" icon={<PlusIcon />} />
              <Button variant="danger" size="lg" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-600">Extra Large</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="xl" icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="xl" icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="xl" icon={<PlusIcon />} />
              <Button variant="danger" size="xl" icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
          </div>
          
          {/* Icon模式圆形验证 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-700 mb-3">Icon模式圆形验证</h4>
            <p className="text-sm text-gray-600 mb-3">
              以下按钮应该都是完美的圆形，无论尺寸大小：
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <Button variant="primary" size="sm" icon={<XMarkIcon className="w-4 h-4" />} />
                <span className="text-xs text-gray-500">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button variant="primary" size="md" icon={<XMarkIcon className="w-4 h-4" />} />
                <span className="text-xs text-gray-500">md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button variant="primary" size="lg" icon={<XMarkIcon className="w-4 h-4" />} />
                <span className="text-xs text-gray-500">lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button variant="primary" size="xl" icon={<XMarkIcon className="w-4 h-4" />} />
                <span className="text-xs text-gray-500">xl</span>
              </div>
            </div>
          </div>
        </section>

      {/* Regular Buttons with Icons */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">常规按钮（带图标）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-600">左侧图标</h4>
            <div className="flex flex-col gap-3">
              <Button variant="primary" leftIcon={<PlusIcon />}>
                新建项目
              </Button>
              <Button variant="outline" leftIcon={<PencilIcon className="w-4 h-4" />}>
                编辑
              </Button>
              <Button variant="ghost" leftIcon={<EllipsisHorizontalIcon className="w-4 h-4" />}>
                菜单
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-600">右侧图标</h4>
            <div className="flex flex-col gap-3">
              <Button variant="primary" rightIcon={<ChevronDownIcon className="w-4 h-4" />}>
                展开
              </Button>
              <Button variant="outline" rightIcon={<ChevronUpIcon className="w-4 h-4" />}>
                收起
              </Button>
              <Button variant="ghost" rightIcon={<EllipsisHorizontalIcon className="w-4 h-4" />}>
                更多
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Button Variants */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">按钮变体</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
        </div>
      </section>

      {/* Button Sizes */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">按钮尺寸</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" size="xl">Extra Large</Button>
        </div>
      </section>

      {/* Button Radius */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">按钮圆角</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="outline" radius="none">None</Button>
          <Button variant="outline" radius="default">Default</Button>
          <Button variant="outline" radius="rounded">Rounded</Button>
          <Button variant="outline" radius="pill">Pill</Button>
          <Button variant="outline" radius="full">Full</Button>
        </div>
      </section>

        {/* Loading States */}
        <section className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-semibold mb-6 text-gray-800">加载状态</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="primary" loading>加载中</Button>
            <Button variant="outline" loading loadingText="保存中...">保存</Button>
            <Button variant="primary" size="md" loading icon={<PlusIcon />} />
            <Button onClick={handleLoadingClick} loading={loading}>
              {loading ? '处理中...' : '点击加载'}
            </Button>
          </div>
          
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Icon模式加载状态</h4>
            <div className="flex items-center gap-4 flex-wrap">
              <Button variant="primary" size="sm" loading icon={<XMarkIcon className="w-4 h-4" />} />
              <Button variant="ghost" size="md" loading icon={<EllipsisHorizontalIcon className="w-4 h-4" />} />
              <Button variant="outline" size="lg" loading icon={<PlusIcon />} />
              <Button variant="danger" size="xl" loading icon={<TrashIcon className="w-4 h-4" />} />
            </div>
          </div>
        </section>

      {/* Full Width Buttons */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">全宽按钮</h3>
        <div className="space-y-3">
          <Button fullWidth>全宽按钮</Button>
          <Button variant="outline" fullWidth>
            全宽轮廓按钮
          </Button>
        </div>
      </section>

      {/* Disabled States */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">禁用状态</h3>
        <div className="flex flex-wrap gap-3">
          <Button disabled>禁用按钮</Button>
          <Button variant="outline" disabled>
            禁用轮廓按钮
          </Button>
          <Button variant="primary" disabled icon={<PlusIcon />} />
        </div>
      </section>

      {/* Focus Border Examples */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">焦点边框示例</h3>
        
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700">默认变体的焦点边框</h4>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary (蓝色焦点)</Button>
            <Button variant="secondary">Secondary (灰色焦点)</Button>
            <Button variant="outline">Outline (蓝色焦点)</Button>
            <Button variant="ghost">Ghost (灰色焦点)</Button>
            <Button variant="danger">Danger (红色焦点)</Button>
            <Button variant="success">Success (绿色焦点)</Button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700">自定义按钮的焦点边框</h4>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-black text-white hover:bg-gray-800 focus:ring-gray-400">
              黑色按钮
            </Button>
            <Button className="bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-400">
              紫色按钮
            </Button>
            <Button className="bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600 focus:ring-pink-400">
              渐变按钮
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700">覆盖默认焦点边框</h4>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" className="focus:ring-purple-500">
              Primary + 紫色焦点
            </Button>
            <Button variant="danger" className="focus:ring-blue-500">
              Danger + 蓝色焦点
            </Button>
            <Button variant="success" className="focus:ring-yellow-500">
              Success + 黄色焦点
            </Button>
          </div>
        </div>

        {/* 不同焦点边框宽度 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700">不同焦点边框宽度</h4>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-1 focus:ring-blue-400">
              细边框
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400">
              标准边框
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-400">
              粗边框
            </Button>
          </div>
        </div>

        {/* 无焦点边框 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700">无焦点边框</h4>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-gray-600 text-white hover:bg-gray-700 focus:ring-0">
              无焦点边框
            </Button>
            <Button variant="primary" className="focus:ring-0">
              Primary 无焦点边框
            </Button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">焦点边框使用说明：</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <code>focus:ring-2</code> - 设置焦点边框宽度</li>
            <li>• <code>focus:ring-offset-2</code> - 设置焦点边框偏移量</li>
            <li>• <code>focus:ring-[color]-400</code> - 设置焦点边框颜色</li>
            <li>• 颜色应与按钮主色调协调</li>
            <li>• 可以使用 <code>focus:ring-0</code> 移除焦点边框</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { ButtonExample };
