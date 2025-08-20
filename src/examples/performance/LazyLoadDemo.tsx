/**
 * @file LazyLoadDemo.tsx
 * @description Lazy-loaded heavy component demo example
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Absolute Imports ---
import { createLazyComponent } from '@/shared/components/LazyComponent';

// =================================================================================================
// Heavy Component via Lazy Loader
// =================================================================================================

const HeavyComponent = createLazyComponent({
  component: () => new Promise<{ default: React.ComponentType }>(resolve => {
    setTimeout(() => {
      resolve({
        default: () => (
          <div className="p-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg text-white">
            <h3 className="text-xl font-bold mb-4">重型组件已加载</h3>
            <p>这是一个使用懒加载技术的组件，只有在需要时才会加载。</p>
          </div>
        )
      });
    }, 100000);
  }),
  fallback: (
    <div className="p-6 bg-gray-100 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    </div>
  ),
  preload: false,
});

// =================================================================================================
// Component
// =================================================================================================

const LazyLoadDemo: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">懒加载组件演示</h3>
      <div className="space-y-4">
        <p className="text-gray-600">
          点击下面的按钮来加载一个重型组件，体验懒加载的效果。
        </p>
        <HeavyComponent />
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default LazyLoadDemo;
