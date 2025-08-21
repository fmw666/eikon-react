/**
 * @file utils.ts
 * @description LazyComponent utility functions
 * @author fmw666@github
 */

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * 预加载组件
 */
const preloadComponent = (component: () => Promise<{ default: React.ComponentType<any> }>) => {
  return component();
};

/**
 * 预加载多个组件
 */
const preloadComponents = (components: Array<() => Promise<{ default: React.ComponentType<any> }>>) => {
  return Promise.all(components.map(component => component()));
};

// =================================================================================================
// Exports
// =================================================================================================

export { preloadComponent, preloadComponents };
