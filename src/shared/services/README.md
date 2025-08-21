# 业务服务层架构说明

## 概述

业务服务层采用**策略模式**和**工厂模式**来管理 Supabase 和 Mock 服务的切换，实现了业务逻辑与基础设施的解耦。

## 架构设计

```
src/shared/
├── infrastructure/     # 基础设施层
│   ├── external/       # 外部服务集成
│   ├── cache/         # 缓存服务
│   └── preload/       # 预加载服务
└── services/          # 业务服务层
    ├── interfaces/    # 服务接口定义
    ├── implementations/ # 具体实现
    ├── factory/       # 服务工厂
    ├── config/        # 配置管理
    └── index.ts       # 统一导出
```

## 分层架构

### 基础设施层 (Infrastructure)
- **外部服务**：Sentry、Supabase 客户端
- **工具服务**：缓存、预加载、性能监控
- **特点**：不依赖业务逻辑，可复用

### 业务服务层 (Services)
- **接口定义**：业务服务的契约
- **实现类**：Supabase 和 Mock 实现
- **工厂模式**：根据配置选择实现
- **特点**：依赖基础设施层，实现业务逻辑

## 配置方式

### 1. 环境变量配置

在 `.env` 文件中设置：

```bash
# 强制使用 Mock 服务
VITE_USE_MOCK=true

# 开发环境使用 Mock 服务
VITE_USE_MOCK=dev

# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 2. 自动判断逻辑

服务配置会自动判断使用哪种实现：

1. **明确指定使用 Mock**：`VITE_USE_MOCK=true`
2. **Supabase 配置不完整**：自动回退到 Mock
3. **开发环境可选 Mock**：`VITE_USE_MOCK=dev`

## 使用方式

### 在业务代码中使用

```typescript
// 直接使用服务实例（推荐）
import { authService, taskService } from '@/features/auth/services/authService';

// 认证相关
const user = await authService.getSession();
await authService.pwdLogin(email, password);

// 任务相关
const tasks = await taskService.getTasks();
const newTask = await taskService.addTask(taskData);
```

### 在测试中使用

```typescript
import { serviceFactory } from '@/shared/services';

// 重置服务实例
serviceFactory.reset();

// 获取服务实例
const authService = serviceFactory.getAuthService();
const taskService = serviceFactory.getTaskService();
```

## 优势

1. **解耦**：业务代码不直接依赖具体的服务实现
2. **可测试**：可以轻松切换 Mock 服务进行测试
3. **可扩展**：新增服务实现只需实现接口即可
4. **配置灵活**：通过环境变量控制服务选择
5. **类型安全**：TypeScript 接口确保类型一致性

## 添加新服务

1. 在 `interfaces/` 中定义服务接口
2. 在 `implementations/` 中创建具体实现
3. 在 `serviceFactory.ts` 中添加工厂方法
4. 在业务层创建服务 facade

## 注意事项

- 所有服务实现必须实现对应的接口
- Mock 服务应该模拟真实的网络延迟
- 服务工厂使用单例模式，避免重复创建实例
- 配置变更后需要调用 `serviceFactory.reset()` 重新初始化
