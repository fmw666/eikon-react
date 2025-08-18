---
title: 开发指南
description: AI DevKit 开发环境配置和最佳实践
---

# 开发指南

本指南将帮助你配置开发环境，并学习 AI DevKit 的最佳实践。

## 🛠️ 开发环境配置

### 1. 编辑器配置

我们推荐使用 **VS Code** 作为主要开发工具，并安装以下扩展：

#### 必需扩展

- **TypeScript Importer** - 自动导入TypeScript模块
- **Tailwind CSS IntelliSense** - Tailwind CSS智能提示
- **ES7+ React/Redux/React-Native snippets** - React代码片段
- **Prettier - Code formatter** - 代码格式化
- **ESLint** - 代码质量检查

#### 推荐扩展

- **GitLens** - Git增强功能
- **Auto Rename Tag** - 自动重命名HTML/JSX标签
- **Bracket Pair Colorizer** - 括号配对高亮
- **Path Intellisense** - 路径智能提示

### 2. VS Code设置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## 📁 项目结构详解

```
src/
├── app/                    # 应用核心
│   ├── pages/             # 页面组件
│   ├── providers/         # 全局提供者
│   ├── router/            # 路由配置
│   └── store/             # 状态管理
├── features/              # 功能模块
│   ├── auth/              # 认证功能
│   ├── home/              # 首页功能
│   └── task/              # 任务管理
├── shared/                # 共享资源
│   ├── components/        # 共享组件
│   ├── hooks/             # 自定义Hooks
│   ├── utils/             # 工具函数
│   └── types/             # 类型定义
└── main.tsx              # 应用入口
```

### 目录命名规范

- 使用 **kebab-case** 命名目录和文件
- 组件文件使用 **PascalCase**
- 工具函数使用 **camelCase**

## 🎨 样式指南

### Tailwind CSS最佳实践

1. **优先使用Tailwind类**：
```jsx
// ✅ 推荐
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// ❌ 避免
<div className="custom-card">
```

2. **提取常用样式**：
```jsx
// 在组件中提取常用样式
const cardClasses = "p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow";
```

3. **响应式设计**：
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 自定义样式

在 `src/styles/` 目录下添加自定义样式：

```css
/* src/styles/custom.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors;
  }
}
```

## 🔧 开发工具

### CLI工具使用

```bash
# 启动CLI工具
cd cli
npm run cli

# 查看文档
npm run docs 快速开始指南

# 列出所有文档
npm run list-docs
```

### 代码生成

使用CLI工具快速生成代码：

```bash
# 生成组件
npm run generate component Button

# 生成页面
npm run generate page HomePage

# 生成Hook
npm run generate hook useLocalStorage
```

## 🧪 测试策略

### 单元测试

使用Jest和React Testing Library：

```typescript
// src/tests/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/shared/components/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 集成测试

```typescript
// src/tests/integration/authFlow.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/app/providers/AuthProvider';

describe('Authentication Flow', () => {
  it('completes login flow', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
```

## 🚀 性能优化

### 代码分割

```typescript
// 使用React.lazy进行代码分割
const TaskPage = lazy(() => import('@/features/task/pages/TaskPage'));

// 在路由中使用
<Route path="/tasks" element={<Suspense fallback={<Loading />}><TaskPage /></Suspense>} />
```

### 图片优化

```jsx
// 使用WebP格式和懒加载
<img 
  src="/images/hero.webp" 
  alt="Hero image"
  loading="lazy"
  className="w-full h-auto"
/>
```

### 缓存策略

```typescript
// 使用React Query进行数据缓存
const { data, isLoading } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000 // 10分钟
});
```

## 🔒 安全最佳实践

### 输入验证

```typescript
// 使用Zod进行类型验证
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  priority: z.enum(['low', 'medium', 'high'])
});

type Task = z.infer<typeof TaskSchema>;
```

### XSS防护

```jsx
// 使用DOMPurify清理HTML内容
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput);
```

### 环境变量

```typescript
// 使用环境变量存储敏感信息
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
```

## 📦 部署配置

### 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  }
});
```

### 环境配置

```bash
# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_APP_ENV=production
```

## 🤝 贡献指南

### 代码提交规范

使用Conventional Commits：

```bash
# 功能开发
git commit -m "feat: add user authentication"

# Bug修复
git commit -m "fix: resolve login form validation issue"

# 文档更新
git commit -m "docs: update API documentation"

# 代码重构
git commit -m "refactor: simplify component structure"
```

### Pull Request流程

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request
5. 等待代码审查
6. 合并到主分支

## 📚 学习资源

- [React官方文档](https://react.dev/)
- [TypeScript手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Vite指南](https://vitejs.dev/guide/)

## 🆘 常见问题

### Q: 如何处理TypeScript类型错误？

A: 使用类型断言或类型守卫：

```typescript
// 类型断言
const element = document.getElementById('app') as HTMLElement;

// 类型守卫
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

### Q: 如何调试React组件？

A: 使用React Developer Tools和console.log：

```typescript
useEffect(() => {
  console.log('Component mounted:', props);
}, [props]);
```

### Q: 如何优化构建大小？

A: 使用代码分割和Tree Shaking：

```typescript
// 动态导入
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Tree Shaking友好的导入
import { Button } from '@headlessui/react';
```

祝你开发愉快！🎉 