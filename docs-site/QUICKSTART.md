# 🚀 快速启动指南

## 📋 前置要求

- Node.js 18+ 
- npm 或 yarn

## ⚡ 5分钟快速开始

### 1. 安装依赖

```bash
cd docs-site
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问文档站点

打开浏览器访问：`http://localhost:5173`

## 🎯 React 学习板块快速导航

### 立即开始学习

1. **React 学习中心** - 完整的学习路径
   - 访问：`/guide/react-learning`
   - 内容：学习路径、目标、工具推荐

2. **性能优化指南** - 核心技能
   - 访问：`/guide/react-performance`
   - 内容：组件拆分、缓存优化、渲染优化

3. **Todo 应用实践** - 实战项目
   - 访问：`/guide/projects/todo-optimization`
   - 内容：完整的性能优化实践

### 学习重点

- ✅ **组件拆分策略**：静态 vs 动态组件
- ✅ **缓存优化**：useMemo 和 useCallback
- ✅ **渲染优化**：避免不必要的重渲染
- ✅ **性能监控**：调试和优化工具

## 🔧 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 查看帮助
npx vitepress --help
```

## 📁 文件结构说明

```
docs-site/
├── .vitepress/
│   └── config.js          # 站点配置
├── guide/
│   ├── react-learning.md  # React 学习中心 ⭐
│   ├── react-performance.md # 性能优化指南 ⭐
│   └── projects/
│       └── todo-optimization.md # 实践项目 ⭐
├── index.md               # 首页
└── README.md              # 详细文档
```

## 🎨 自定义配置

### 修改站点配置

编辑 `.vitepress/config.js`：

```javascript
export default defineConfig({
  title: '你的项目名称',
  description: '项目描述',
  // ... 其他配置
})
```

### 添加新文档

1. 在 `guide/` 目录创建 `.md` 文件
2. 在 `config.js` 的 sidebar 中添加链接
3. 重启开发服务器

## 🚨 常见问题

### Q: 端口被占用怎么办？

A: 使用其他端口启动：
```bash
npx vitepress dev --port 3000
```

### Q: 如何修改主题色？

A: 在 `config.js` 中添加：
```javascript
export default defineConfig({
  appearance: 'dark', // 或 'light'
  // ...
})
```

### Q: 如何添加搜索功能？

A: 搜索功能已默认启用，支持本地搜索。

## 📚 下一步

1. 阅读 [React 学习中心](/guide/react-learning)
2. 学习 [性能优化指南](/guide/react-performance)
3. 实践 [Todo 应用优化](/guide/projects/todo-optimization)
4. 查看 [完整文档](README.md)

---

> 💡 **提示**：React 学习板块是重点内容，建议优先学习性能优化指南！
