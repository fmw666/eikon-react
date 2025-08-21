/**
 * @file factory.tsx
 * @description LazyComponent factory
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { Suspense, lazy } from 'react';

// --- Relative Imports ---
import { ErrorBoundary } from './LazyComponent';

import type { LazyComponentConfig, LazyComponentProps } from './types';

// =================================================================================================
// Lazy Component Factory
// =================================================================================================

/**
 * 创建懒加载组件
 */
const createLazyComponent = (config: LazyComponentConfig): React.ComponentType<any> => {
  const { component, fallback, preload = false, errorBoundary = true } = config;

  // 创建懒加载组件
  const LazyComponent = lazy(component);

  // 预加载组件
  if (preload) {
    component();
  }

  // 返回包装后的组件
  const WrappedComponent = React.forwardRef<any, LazyComponentProps>((props, ref) => {
    const content = (
      <Suspense fallback={fallback || <div>加载中...</div>}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    );

    if (errorBoundary) {
      return <ErrorBoundary fallback={fallback}>{content}</ErrorBoundary>;
    }

    return content;
  });

  WrappedComponent.displayName = 'LazyComponent';

  return WrappedComponent;
};

// =================================================================================================
// Exports
// =================================================================================================

export { createLazyComponent };
