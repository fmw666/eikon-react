/**
 * @file LazyComponent.tsx
 * @description LazyComponent component - implements lazy loading and error boundary
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { Component } from 'react';
import type { ReactNode } from 'react';

// --- Relative Imports ---
import type { ErrorBoundaryState } from './types';

// =================================================================================================
// Error Boundary Component
// =================================================================================================

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
// Exports
// =================================================================================================

export { ErrorBoundary };
