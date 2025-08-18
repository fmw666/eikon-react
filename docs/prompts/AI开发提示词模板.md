# AI 开发提示词模板

本文档提供了基于 AI-DevKit 进行开发的标准化提示词模板，帮助开发者快速与AI协作完成项目开发。

## 📋 使用说明

1. 复制对应的提示词模板
2. 替换 `[占位符]` 为具体内容
3. 根据实际需求调整模板内容
4. 将完整的提示词发送给AI助手

## 🏗️ 项目架构理解模板

### 基础项目介绍

```
我正在使用一个名为 "AI-DevKit" 的前端项目模板进行开发。

项目技术栈：
- React 18.2.0 + TypeScript 5.2.2
- Vite 6.3.5 作为构建工具
- Tailwind CSS 3.4.1 用于样式设计
- Zustand 4.5.1 用于状态管理
- React Router 6.22.1 用于路由管理
- i18next 25.2.1 用于国际化
- Supabase 2.49.4 作为后端服务
- Jest 29.7.0 用于测试

项目架构特点：
- 采用 Feature-based Structure，按功能模块组织代码
- 使用 Hook → Store → Service 的数据流架构
- 完整的 TypeScript 类型支持
- 内置 ESLint、Prettier、Husky 等开发工具
- 支持 Heroicons 图标库

项目目录结构：
src/
├── app/                    # 应用级配置和路由
├── features/              # 功能模块 (按业务划分)
│   ├── auth/             # 认证模块
│   ├── home/             # 首页模块
│   └── task/             # 任务模块
├── shared/               # 共享资源
│   ├── components/       # 通用组件
│   ├── hooks/           # 自定义Hooks
│   ├── services/        # API服务
│   ├── stores/          # 状态管理
│   ├── types/           # TypeScript类型定义
│   ├── utils/           # 工具函数
│   ├── constants/       # 常量定义
│   └── i18n/            # 国际化配置
├── styles/              # 全局样式
├── mock/                # 模拟数据
└── examples/            # 示例代码

请基于这个架构帮我开发 [具体功能描述]。
```

## 🧩 组件开发模板

### 通用组件开发

```
请基于以下架构为我创建一个 [组件名称] 组件：

技术栈：React + TypeScript + Tailwind CSS + Heroicons
组件位置：src/shared/components/[ComponentName]/
组件类型：[Button/Modal/Card/Form/Table/其他]

要求：
- 使用 TypeScript 定义完整的 props 接口
- 使用 Tailwind CSS 进行响应式样式设计
- 使用 Heroicons 图标（如需要）
- 支持多种变体和尺寸
- 包含完整的 JSDoc 注释
- 遵循项目的组件命名规范
- 支持自定义 className 扩展样式

组件功能：[具体功能描述]
Props 接口：[需要的props列表]
样式要求：[UI设计要求]
```

### 页面组件开发

```
请基于以下架构为我创建一个页面组件：

页面名称：[PageName]
技术栈：React + TypeScript + Tailwind CSS
组件位置：src/features/[moduleName]/[PageName]Page.tsx

要求：
- 使用 TypeScript 定义完整的类型
- 使用 Tailwind CSS 进行响应式布局
- 集成状态管理（如需要）
- 包含错误处理和加载状态
- 支持国际化（如需要）
- 遵循项目的页面组件规范

页面功能：[具体功能描述]
布局要求：[页面布局要求]
数据需求：[需要的数据和API]
```

## 🔄 状态管理模板

### Zustand Store 开发

```
请基于 Zustand 为我创建状态管理：

Store名称：[StoreName]
技术栈：Zustand + TypeScript
Store位置：src/features/[moduleName]/stores/[storeName].ts

要求：
- 使用 Zustand create 函数创建 store
- 定义完整的 TypeScript 接口
- 包含状态、getters 和 actions
- 支持异步操作处理
- 包含错误状态管理
- 支持状态持久化（如需要）
- 遵循项目的状态管理规范

状态需求：
- 状态字段：[需要的状态字段]
- 异步操作：[需要的异步操作]
- 计算属性：[需要的计算属性]
- 持久化需求：[是否需要持久化]
```

### 自定义 Hook 开发

```
请基于以下架构为我创建一个自定义 Hook：

Hook名称：[useHookName]
技术栈：React + TypeScript
Hook位置：src/features/[moduleName]/hooks/use[HookName].ts

要求：
- 使用 TypeScript 定义完整的类型
- 遵循 React Hooks 规范
- 包含错误处理和加载状态
- 支持依赖项优化
- 包含完整的 JSDoc 注释
- 遵循项目的 Hook 命名规范

Hook功能：[具体功能描述]
参数：[需要的参数]
返回值：[返回的数据结构]
```

## 🌐 API 服务模板

### Supabase API 服务

```
请基于 Supabase 为我创建API服务：

服务名称：[ServiceName]
技术栈：Supabase + TypeScript
服务位置：src/shared/services/[serviceName].ts

要求：
- 使用 Supabase 客户端
- 包含完整的 CRUD 操作
- 使用 TypeScript 类型定义
- 包含错误处理和类型检查
- 支持查询参数和过滤
- 遵循项目的API命名规范

数据表结构：
[详细的表结构描述，包括字段名、类型、约束等]

API需求：
- 查询操作：[需要的查询功能]
- 创建操作：[需要的创建功能]
- 更新操作：[需要的更新功能]
- 删除操作：[需要的删除功能]
- 特殊查询：[其他特殊需求]
```

### 外部 API 服务

```
请基于以下架构为我创建外部API服务：

服务名称：[ServiceName]
技术栈：TypeScript + Fetch API
服务位置：src/shared/services/[serviceName].ts

要求：
- 使用 TypeScript 定义完整的类型
- 使用 Fetch API 进行HTTP请求
- 包含完整的错误处理
- 支持请求拦截和响应处理
- 包含请求超时处理
- 遵循项目的API命名规范

API需求：
- 基础URL：[API基础URL]
- 认证方式：[认证方式]
- 请求方法：[需要的HTTP方法]
- 数据格式：[请求/响应数据格式]
- 特殊需求：[其他特殊需求]
```

## 🧪 测试开发模板

### 组件测试

```
请为我的组件创建测试：

组件名称：[ComponentName]
技术栈：Jest + Testing Library + React
测试位置：src/shared/components/[ComponentName]/__tests__/[ComponentName].test.tsx

要求：
- 测试组件正常渲染
- 测试用户交互事件
- 测试 props 变化
- 测试错误状态
- 测试边界情况
- 达到良好的测试覆盖率
- 遵循项目的测试规范

测试目标：
- 渲染测试：[需要测试的渲染场景]
- 交互测试：[需要测试的用户交互]
- 状态测试：[需要测试的状态变化]
- 错误测试：[需要测试的错误情况]
```

### 功能模块测试

```
请为我的功能模块创建测试：

模块名称：[ModuleName]
技术栈：Jest + Testing Library
测试位置：src/features/[moduleName]/__tests__/

要求：
- 测试页面组件渲染
- 测试状态管理逻辑
- 测试API调用
- 测试用户交互流程
- 测试错误处理
- 测试国际化功能
- 达到良好的测试覆盖率

测试目标：
- 页面测试：[需要测试的页面功能]
- 状态测试：[需要测试的状态逻辑]
- API测试：[需要测试的API调用]
- 集成测试：[需要测试的完整流程]
```

## 🎨 UI/UX 开发模板

### 页面布局设计

```
请基于 Tailwind CSS 为我设计页面布局：

页面名称：[PageName]
技术栈：Tailwind CSS + Heroicons
设计要求：
- 响应式设计，支持移动端和桌面端
- 现代化UI设计风格
- 良好的用户体验
- 使用 Heroicons 图标
- 遵循 Tailwind CSS 最佳实践

布局需求：
- 页面结构：[页面主要区域]
- 导航要求：[导航设计需求]
- 内容区域：[主要内容布局]
- 交互元素：[按钮、表单等交互元素]
- 特殊需求：[其他特殊设计要求]
```

### 组件样式设计

```
请基于 Tailwind CSS 为我设计组件样式：

组件名称：[ComponentName]
技术栈：Tailwind CSS + Heroicons
设计要求：
- 现代化设计风格
- 支持多种变体
- 响应式设计
- 良好的可访问性
- 使用 Heroicons 图标（如需要）

样式需求：
- 组件类型：[按钮/卡片/表单/其他]
- 变体需求：[主要变体类型]
- 尺寸需求：[支持的尺寸]
- 颜色方案：[颜色设计]
- 交互效果：[悬停、点击等效果]
```

## 🌍 国际化模板

### 多语言配置

```
请为我的功能模块添加国际化支持：

模块名称：[ModuleName]
技术栈：i18next + react-i18next
配置位置：src/features/[moduleName]/i18n/

要求：
- 支持中文和英文
- 使用 i18next 进行翻译管理
- 包含完整的翻译键值对
- 支持动态翻译
- 遵循项目的国际化规范

翻译需求：
- 页面标题：[需要翻译的标题]
- 按钮文本：[需要翻译的按钮文本]
- 表单标签：[需要翻译的表单标签]
- 错误消息：[需要翻译的错误消息]
- 提示信息：[需要翻译的提示信息]
```

## 🔧 工具函数模板

### 工具函数开发

```
请基于以下架构为我创建工具函数：

函数名称：[functionName]
技术栈：TypeScript
函数位置：src/shared/utils/[functionName].ts

要求：
- 使用 TypeScript 定义完整的类型
- 包含完整的 JSDoc 注释
- 支持多种参数类型
- 包含错误处理
- 遵循项目的工具函数规范
- 包含单元测试

函数功能：[具体功能描述]
参数：[输入参数类型和说明]
返回值：[返回值类型和说明]
使用示例：[使用示例]
```

## 📱 响应式设计模板

### 移动端适配

```
请为我的组件/页面添加移动端适配：

组件/页面名称：[Name]
技术栈：Tailwind CSS
设计要求：
- 支持移动端、平板和桌面端
- 使用 Tailwind CSS 响应式类
- 保持良好的用户体验
- 优化触摸交互
- 适配不同屏幕尺寸

适配需求：
- 布局调整：[移动端布局变化]
- 字体大小：[响应式字体]
- 间距调整：[响应式间距]
- 交互优化：[触摸友好的交互]
- 特殊需求：[其他适配需求]
```

## 🚀 性能优化模板

### 组件性能优化

```
请为我的组件进行性能优化：

组件名称：[ComponentName]
技术栈：React + TypeScript
优化要求：
- 使用 React.memo 优化渲染
- 优化 props 传递
- 使用 useMemo 和 useCallback
- 减少不必要的重渲染
- 优化事件处理函数

优化目标：
- 渲染性能：[需要优化的渲染问题]
- 内存使用：[需要优化的内存问题]
- 交互响应：[需要优化的交互问题]
- 加载性能：[需要优化的加载问题]
```

## 🔍 代码审查模板

### 代码质量检查

```
请审查我的代码并提供改进建议：

代码位置：[文件路径]
技术栈：[使用的技术栈]
审查要求：
- 检查 TypeScript 类型定义
- 验证代码规范和最佳实践
- 检查性能问题
- 验证安全性问题
- 提供具体的改进建议

审查重点：
- 类型安全：[类型定义问题]
- 代码规范：[代码风格问题]
- 性能优化：[性能问题]
- 错误处理：[错误处理问题]
- 可维护性：[维护性问题]
```

## 📚 文档编写模板

### 组件文档

```
请为我的组件编写文档：

组件名称：[ComponentName]
文档位置：src/shared/components/[ComponentName]/README.md

要求：
- 包含组件功能说明
- 详细的 Props 接口文档
- 使用示例和代码片段
- 最佳实践建议
- 常见问题解答

文档内容：
- 功能描述：[组件功能]
- Props 说明：[所有 props 的详细说明]
- 使用示例：[具体的使用示例]
- 注意事项：[使用注意事项]
- 相关链接：[相关资源链接]
```

---

## 💡 使用技巧

1. **提供完整上下文**：始终包含项目架构、技术栈和具体需求
2. **分步骤开发**：将复杂功能拆分为多个小步骤
3. **明确要求**：具体说明代码规范、性能要求和质量标准
4. **迭代优化**：根据AI生成的代码进行反馈和优化
5. **保持一致性**：确保生成的代码符合项目整体风格

## 🔄 模板更新

这些模板会随着项目发展持续更新，建议定期查看最新版本以获得最佳开发体验。
