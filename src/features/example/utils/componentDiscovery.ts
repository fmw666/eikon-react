/**
 * @file features/example/utils/componentDiscovery.ts
 * @description 自动发现和导入示例组件的工具函数
 */

import type { FC } from 'react';

import { ButtonExample } from '@/examples/Button';
import { ModalExample } from '@/examples/Modal';

export interface ExampleComponent {
  id: string;
  name: string;
  component: FC;
  description: string;
}

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
  }))
};

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
    }
  ];
};
