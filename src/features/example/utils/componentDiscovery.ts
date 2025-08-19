/**
 * @file componentDiscovery.ts
 * @description Auto discovery of components for examples
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

import React from 'react';

import { ButtonExample } from '@/examples/Button';
import { ModalExample } from '@/examples/Modal';
import { AnimationDemo } from '@/examples/AnimationDemo';

// =================================================================================================
// Types
// =================================================================================================

export interface ExampleComponent {
  id: string;
  name: string;
  component: React.FC;
  description: string;
}

// =================================================================================================
// Component
// =================================================================================================

// 手动导入所有示例组件
// 注意：由于 Vite 的动态导入限制，我们需要手动导入
const componentImports = {
  button: () => import('@/examples/Button').then(module => ({ 
    default: module.ButtonExample,
    name: 'Button 组件',
    description: '展示 Button 组件的所有功能和变体，包括不同尺寸、变体和状态'
  })),
  modal: () => import('@/examples/Modal').then(module => ({ 
    default: module.ModalExample,
    name: 'Modal 组件',
    description: '展示 Modal 组件的各种使用场景和功能，包括基础 Modal、确认 Modal、表单 Modal 等'
  })),
  animation: () => import('@/examples/AnimationDemo').then(module => ({ 
    default: module.AnimationDemo,
    name: 'Animation 组件',
    description: '展示 Animation 组件的各种使用场景和功能，包括基础 Animation、确认 Animation、表单 Animation 等'
  }))
};

// =================================================================================================
// Export
// =================================================================================================

export const discoverExampleComponents = async (): Promise<ExampleComponent[]> => {
  const components: ExampleComponent[] = [];
  
  for (const [id, importFn] of Object.entries(componentImports)) {
    try {
      const module = await importFn();
      components.push({
        id,
        name: module.name,
        component: module.default,
        description: module.description
      });
    } catch (error) {
      console.warn(`Failed to load component ${id}:`, error);
    }
  }
  
  return components;
};

// 同步版本，用于静态导入
export const getStaticExampleComponents = (): ExampleComponent[] => {
  return [
    {
      id: 'button',
      name: 'Button 组件',
      component: ButtonExample,
      description: '展示 Button 组件的所有功能和变体，包括不同尺寸、变体和状态'
    },
    {
      id: 'modal',
      name: 'Modal 组件',
      component: ModalExample,
      description: '展示 Modal 组件的各种使用场景和功能，包括基础 Modal、确认 Modal、表单 Modal 等'
    },
    {
      id: 'animation',
      name: 'Animation 组件',
      component: AnimationDemo,
      description: '展示 Animation 组件的各种使用场景和功能，包括基础 Animation、确认 Animation、表单 Animation 等'
    }
  ];
};
