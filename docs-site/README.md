# AI-DevKit 文档站点

这是 AI-DevKit 项目的文档站点，基于 VitePress 构建。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📁 目录结构

```
docs-site/
├── .vitepress/
│   └── config.js          # VitePress 配置文件
├── guide/                 # 开发指南
│   ├── getting-started.md # 快速开始指南
│   ├── architecture.md    # 系统架构
│   └── integration.md     # 集成方案
├── react/                 # React 学习中心
│   ├── learning.md        # 学习指南
│   ├── performance.md     # 性能优化指南
│   └── projects/
│       └── todo-optimization.md # Todo 应用优化实践
├── prompts/               # AI 开发提示词
│   ├── ai-templates.md    # AI 提示词模板
│   └── code-templates.md  # 代码模板
├── index.md               # 首页
└── README.md              # 本文档
```

## 🎯 React 学习板块

### 学习路径

1. **React 学习中心** (`/guide/react-learning.md`)
   - 完整的学习路径规划
   - 学习目标和建议
   - 相关资源链接

2. **性能优化指南** (`/guide/react-performance.md`)
   - 动态组件与静态组件拆分
   - useMemo 和 useCallback 的使用
   - 避免子组件不必要的重渲染
   - 性能监控与调试

3. **实践项目** (`/guide/projects/todo-optimization.md`)
   - Todo 应用性能优化实践
   - 从问题代码到优化代码的完整对比
   - 性能指标对比和优化效果

### 特色内容

- **组件拆分策略**：按变化频率拆分静态和动态组件
- **缓存优化**：合理使用 `useMemo` 和 `useCallback`
- **渲染优化**：使用 `memo` 避免不必要的重渲染
- **性能监控**：提供性能监控工具和调试技巧
- **实战案例**：完整的项目优化实践

## 🔧 配置说明

### VitePress 配置

主要配置在 `.vitepress/config.js` 中：

- **导航栏**：包含首页、指南、React 学习、提示词等链接
- **侧边栏**：按文档类型组织，React 学习板块有独立的侧边栏
- **搜索**：支持本地搜索
- **主题**：使用现代化的主题配置

### 导航结构

```
首页
├── 开发指南
│   ├── 快速开始
│   ├── 系统架构
│   └── 集成方案
├── React 学习中心 ⭐
│   ├── 学习指南
│   ├── 性能优化指南
│   └── 实践项目
│       └── Todo 应用优化
└── 提示词
    ├── AI 提示词模板
    └── 代码模板
```

## 📝 添加新内容

### 添加新的 React 学习文档

1. 在 `guide/` 目录下创建新的 Markdown 文件
2. 在 `.vitepress/config.js` 的 sidebar 中添加链接
3. 确保文档包含适当的标题和目录结构

### 添加新的实践项目

1. 在 `guide/projects/` 目录下创建项目文档
2. 在 React 学习中心的侧边栏中添加链接
3. 包含完整的代码示例和性能对比

## 🎨 样式和主题

- 使用 VitePress 默认主题
- 支持深色模式
- 响应式设计
- 代码高亮支持 TypeScript/TSX

## 📚 相关资源

- [VitePress 官方文档](https://vitepress.dev/)
- [React 官方文档](https://react.dev/)
- [React 性能优化指南](https://react.dev/learn/render-and-commit)

## 🤝 贡献

欢迎提交 Pull Request 来改进文档内容！

---

> 💡 **提示**：React 学习板块是文档站点的重点内容，旨在帮助开发者掌握 React 性能优化的核心技能。 