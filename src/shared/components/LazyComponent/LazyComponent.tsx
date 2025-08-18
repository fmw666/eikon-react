/**
 * @file LazyComponent.tsx
 * @description 懒加载组件工具 - 实现组件按需加载和错误边界
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { Suspense, lazy, Component, ReactNode } from 'react';

// =================================================================================================
// Types
// =================================================================================================

interface LazyComponentConfig {
  component: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: ReactNode;
  preload?: boolean;
  errorBoundary?: boolean;
}

interface LazyComponentProps {
  [key: string]: any;
}

// =================================================================================================
// Error Boundary Component
// =================================================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyComponent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium mb-2">组件加载失败</div>
            <div className="text-red-600 text-sm">
              {this.state.error?.message || '未知错误'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              重试
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// =================================================================================================
// Lazy Component Factory
// =================================================================================================

/**
 * 创建懒加载组件
 */
export function createLazyComponent(config: LazyComponentConfig) {
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
}

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * 预加载组件
 */
export function preloadComponent(component: () => Promise<{ default: React.ComponentType<any> }>) {
  return component();
}

/**
 * 预加载多个组件
 */
export function preloadComponents(components: Array<() => Promise<{ default: React.ComponentType<any> }>>) {
  return Promise.all(components.map(component => component()));
}

// =================================================================================================
// Exports
// =================================================================================================

export { ErrorBoundary };
export type { LazyComponentConfig, LazyComponentProps };
