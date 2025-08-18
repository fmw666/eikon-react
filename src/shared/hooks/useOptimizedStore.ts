/**
 * @file useOptimizedStore.ts
 * @description 优化的状态管理 hooks - 实现细粒度状态订阅和性能优化
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useCallback, useMemo } from 'react';
import { subscribeWithSelector } from 'zustand/middleware';
import { create } from 'zustand';

// =================================================================================================
// Types
// =================================================================================================

interface OptimizedStoreConfig<T> {
  name?: string;
  initialState: T;
  selectors?: Record<string, (state: T) => any>;
}

// =================================================================================================
// Optimized Store Factory
// =================================================================================================

/**
 * 创建优化的状态存储
 */
function createOptimizedStore<T extends Record<string, any>>(
  config: OptimizedStoreConfig<T>
) {
  const { name, initialState, selectors = {} } = config;

  // 创建带有订阅选择器的 store
  const useStore = create<T>()(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      // 通用的 setState 方法
      setState: (updates: Partial<T>) => set(updates),
      // 重置状态
      reset: () => set(initialState),
    }))
  );

  // 创建细粒度的选择器 hooks
  const createSelectors = () => {
    const hooks: Record<string, () => any> = {};

    // 为每个状态字段创建选择器
    Object.keys(initialState).forEach(key => {
      hooks[`use${key.charAt(0).toUpperCase() + key.slice(1)}`] = () =>
        useStore(state => state[key as keyof T]);
    });

    // 为配置的选择器创建 hooks
    Object.entries(selectors).forEach(([name, selector]) => {
      hooks[`use${name.charAt(0).toUpperCase() + name.slice(1)}`] = () =>
        useStore(selector);
    });

    return hooks;
  };

  return {
    useStore,
    ...createSelectors(),
  };
}

// =================================================================================================
// Performance Hooks
// =================================================================================================

/**
 * 优化的状态选择器 hook
 */
export function useOptimizedSelector<T, R>(
  store: any,
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): R {
  return store(selector, equalityFn);
}

/**
 * 防抖的状态更新 hook
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initialValue);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const setDebouncedValue = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(newValue);
    }, delay);
  }, [delay]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setDebouncedValue];
}

/**
 * 记忆化的状态选择器
 */
export function useMemoizedSelector<T, R>(
  store: any,
  selector: (state: T) => R,
  deps: React.DependencyList = []
): R {
  const memoizedSelector = useMemo(() => selector, deps);
  return store(memoizedSelector);
}

// =================================================================================================
// Transition Hooks
// =================================================================================================

/**
 * 使用 startTransition 的状态更新 hook
 */
export function useTransitionState<T>(
  initialValue: T
): [T, (value: T, isUrgent?: boolean) => void] {
  const [value, setValue] = React.useState<T>(initialValue);
  const [isPending, startTransition] = React.useTransition();

  const setTransitionValue = useCallback((newValue: T, isUrgent: boolean = false) => {
    if (isUrgent) {
      setValue(newValue);
    } else {
      startTransition(() => {
        setValue(newValue);
      });
    }
  }, [startTransition]);

  return [value, setTransitionValue];
}

// =================================================================================================
// Exports
// =================================================================================================

export { createOptimizedStore };
export type { OptimizedStoreConfig };
