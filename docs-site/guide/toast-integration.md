---
title: Toast集成指南
description: 如何在项目中使用Toast通知组件
---

## 🏆 推荐方案：Sonner

Sonner 是目前 React + Tailwind CSS 生态中最优秀的 Toast 解决方案。

## 📦 安装

```bash
npm install sonner
```

## 🔧 基础配置

### 1. 在应用根组件中添加 Toaster

```typescript
// src/App.tsx
import { Toaster } from 'sonner';

function App() {
  return (
    <div>
      {/* 您的应用内容 */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
        expand={true}
        toastOptions={{
          className: 'font-medium',
        }}
      />
    </div>
  );
}
```

### 2. 创建 Toast 工具函数

```typescript
// src/shared/utils/toast.ts
import { toast } from 'sonner';

export const showToast = {
  // 成功提示
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      className: 'bg-green-50 border-green-200',
    });
  },

  // 错误提示
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      className: 'bg-red-50 border-red-200',
    });
  },

  // 警告提示
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      className: 'bg-yellow-50 border-yellow-200',
    });
  },

  // 信息提示
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      className: 'bg-blue-50 border-blue-200',
    });
  },

  // 加载提示
  loading: (message: string) => {
    return toast.loading(message, {
      className: 'bg-gray-50 border-gray-200',
    });
  },

  // Promise 处理
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  // 自定义样式
  custom: (message: string, options?: any) => {
    toast(message, options);
  },
};
```

### 3. 创建 Toast Hook

```typescript
// src/shared/hooks/useToast.ts
import { useCallback } from 'react';
import { showToast } from '@/shared/utils/toast';

export const useToast = () => {
  const success = useCallback((message: string, description?: string) => {
    showToast.success(message, description);
  }, []);

  const error = useCallback((message: string, description?: string) => {
    showToast.error(message, description);
  }, []);

  const warning = useCallback((message: string, description?: string) => {
    showToast.warning(message, description);
  }, []);

  const info = useCallback((message: string, description?: string) => {
    showToast.info(message, description);
  }, []);

  const loading = useCallback((message: string) => {
    return showToast.loading(message);
  }, []);

  const promise = useCallback(<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return showToast.promise(promise, messages);
  }, []);

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
  };
};
```

## 🎨 自定义样式配置

### 1. 全局 Toaster 配置

```typescript
// src/App.tsx
import { Toaster } from 'sonner';

function App() {
  return (
    <div>
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
        expand={true}
        toastOptions={{
          className: 'font-medium',
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        }}
        // 自定义图标
        icons={{
          success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
          error: <XCircleIcon className="w-5 h-5 text-red-500" />,
          warning: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />,
          info: <InformationCircleIcon className="w-5 h-5 text-blue-500" />,
        }}
      />
    </div>
  );
}
```

### 2. 响应式配置

```typescript
// src/shared/components/ToastProvider.tsx
import { Toaster } from 'sonner';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

export const ToastProvider = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Toaster 
      position={isMobile ? "top-center" : "top-right"}
      duration={isMobile ? 3000 : 4000}
      toastOptions={{
        className: isMobile ? 'mx-4' : '',
      }}
    />
  );
};
```

## 📱 使用示例

### 1. 在组件中使用

```typescript
// src/features/todo/components/TodoForm.tsx
import React, { useState } from 'react';
import { useToast } from '@/shared/hooks/useToast';

export const TodoForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入待办事项标题');
      return;
    }

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('待办事项创建成功！', '新的任务已添加到您的列表中');
      setTitle('');
    } catch (error) {
      toast.error('创建失败', '请检查网络连接后重试');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加新的待办事项..."
        className="w-full px-4 py-2 border rounded-lg"
      />
      <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
        添加
      </button>
    </form>
  );
};
```

### 2. Promise 处理示例

```typescript
// src/features/auth/hooks/useAuth.ts
import { useToast } from '@/shared/hooks/useToast';

export const useAuth = () => {
  const toast = useToast();

  const login = async (credentials: { email: string; password: string }) => {
    return toast.promise(
      // 实际的登录API调用
      authService.login(credentials),
      {
        loading: '正在登录...',
        success: '登录成功！',
        error: '登录失败，请检查邮箱和密码',
      }
    );
  };

  return { login };
};
```

### 3. 自定义 Toast 组件

```typescript
// src/shared/components/CustomToast.tsx
import React from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface CustomToastProps {
  type: 'success' | 'error';
  title: string;
  message?: string;
}

export const showCustomToast = ({ type, title, message }: CustomToastProps) => {
  toast.custom(
    (t) => (
      <div className={`flex items-center space-x-3 p-4 rounded-lg border ${
        type === 'success' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        {type === 'success' ? (
          <CheckCircleIcon className="w-6 h-6 text-green-500" />
        ) : (
          <XCircleIcon className="w-6 h-6 text-red-500" />
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircleIcon className="w-5 h-5" />
        </button>
      </div>
    ),
    {
      duration: 5000,
    }
  );
};
```

## ⚡ 性能优化

### 1. 延迟加载

```typescript
// src/shared/components/LazyToaster.tsx
import { lazy, Suspense } from 'react';

const Toaster = lazy(() => import('sonner').then(module => ({ default: module.Toaster })));

export const LazyToaster = () => (
  <Suspense fallback={null}>
    <Toaster />
  </Suspense>
);
```

### 2. 批量处理

```typescript
// src/shared/utils/toast.ts
import { toast } from 'sonner';

export const batchToast = {
  success: (messages: string[]) => {
    messages.forEach((message, index) => {
      setTimeout(() => {
        toast.success(message);
      }, index * 100);
    });
  },
};
```

## 🎯 最佳实践

### 1. 消息设计原则

```typescript
// ✅ 好的消息设计
toast.success('文件上传成功', '3个文件已成功上传到云端');

// ❌ 不好的消息设计
toast.success('成功');
```

### 2. 错误处理

```typescript
// 统一的错误处理
export const handleError = (error: any) => {
  if (error.response?.status === 401) {
    toast.error('登录已过期', '请重新登录');
  } else if (error.response?.status === 403) {
    toast.error('权限不足', '您没有执行此操作的权限');
  } else if (error.response?.status >= 500) {
    toast.error('服务器错误', '请稍后重试');
  } else {
    toast.error('操作失败', error.message || '请检查网络连接');
  }
};
```

### 3. 国际化支持

```typescript
// src/shared/hooks/useToast.ts
import { useTranslation } from 'react-i18next';

export const useToast = () => {
  const { t } = useTranslation();

  const success = useCallback((key: string, description?: string) => {
    toast.success(t(key), description ? { description: t(description) } : undefined);
  }, [t]);

  // ... 其他方法
};
```

## 🔧 配置选项

### Toaster 配置

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `position` | string | `"top-right"` | Toast 位置 |
| `duration` | number | `4000` | 显示时长（毫秒） |
| `richColors` | boolean | `false` | 启用丰富颜色 |
| `closeButton` | boolean | `false` | 显示关闭按钮 |
| `expand` | boolean | `false` | 展开模式 |
| `toastOptions` | object | `{}` | 全局 Toast 选项 |

### Toast 选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `className` | string | 自定义 CSS 类名 |
| `style` | object | 内联样式 |
| `description` | string | 描述文本 |
| `action` | object | 操作按钮 |
| `cancel` | object | 取消按钮 |

## 📱 移动端适配

```typescript
// 响应式 Toast 配置
const ToastConfig = () => {
  const isMobile = window.innerWidth <= 768;

  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      duration={isMobile ? 3000 : 4000}
      toastOptions={{
        className: isMobile ? 'mx-4 max-w-sm' : 'max-w-md',
      }}
    />
  );
};
```

---

**总结**：Sonner 是目前 React + Tailwind CSS 生态中最优秀的 Toast 解决方案，具有体积小、性能好、API 简洁、高度可定制等优点，强烈推荐在您的项目中使用。