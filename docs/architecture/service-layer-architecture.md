# 服务层架构设计

## 概述

本项目采用**分层架构**和**策略模式**来管理服务层，实现了业务逻辑与基础设施的解耦，以及 Supabase 和 Mock 服务的灵活切换。

## 架构设计

### 目录结构

```
src/shared/
├── infrastructure/           # 基础设施层
│   ├── external/            # 外部服务集成
│   │   ├── sentry.ts        # Sentry 错误监控
│   │   ├── supabase.ts      # Supabase 客户端
│   │   └── index.ts         # 统一导出
│   ├── cache/              # 缓存服务
│   │   ├── cacheService.ts  # 智能缓存服务
│   │   └── index.ts
│   ├── preload/            # 预加载服务
│   │   ├── preloadService.ts # React 18 预加载
│   │   └── index.ts
│   └── index.ts            # 基础设施层统一导出
└── services/               # 业务服务层
    ├── interfaces/         # 服务接口定义
    │   ├── IAuthService.ts
    │   └── ITaskService.ts
    ├── implementations/    # 具体实现
    │   ├── SupabaseAuthService.ts
    │   ├── MockAuthService.ts
    │   ├── SupabaseTaskService.ts
    │   └── MockTaskService.ts
    ├── factory/           # 服务工厂
    │   └── serviceFactory.ts
    ├── config/            # 配置管理
    │   └── serviceConfig.ts
    └── index.ts          # 业务服务层统一导出
```

## 分层架构

### 1. 基础设施层 (Infrastructure)

**职责**：提供基础的技术能力和外部服务集成

#### 外部服务 (External)
- **Sentry**：错误监控和性能追踪
- **Supabase**：数据库和认证服务客户端
- **特点**：直接与第三方服务交互

#### 工具服务 (Utilities)
- **缓存服务**：智能缓存、请求合并、过期策略
- **预加载服务**：React 18 use() hook 支持
- **特点**：提供通用的技术能力

### 2. 业务服务层 (Services)

**职责**：实现具体的业务逻辑，管理数据访问策略

#### 接口层 (Interfaces)
- 定义业务服务的契约
- 确保实现的一致性
- 支持依赖注入和测试

#### 实现层 (Implementations)
- **Supabase 实现**：真实的数据访问
- **Mock 实现**：测试和开发环境
- **特点**：实现相同的接口，可互换

#### 工厂层 (Factory)
- 根据配置选择实现
- 管理服务实例的生命周期
- 提供统一的访问入口

## 设计原则

### 1. 单一职责原则
- 每个模块只负责一个特定的功能
- 基础设施层不包含业务逻辑
- 业务服务层专注于业务规则

### 2. 依赖倒置原则
- 业务服务层依赖接口而非具体实现
- 基础设施层不依赖业务逻辑
- 通过接口实现解耦

### 3. 开闭原则
- 新增服务实现无需修改现有代码
- 通过配置控制服务选择
- 支持扩展新的服务类型

### 4. 接口隔离原则
- 每个服务接口只包含必要的方法
- 避免大而全的接口设计
- 支持细粒度的服务组合

## 配置管理

### 环境变量配置

```bash
# 强制使用 Mock 服务
VITE_USE_MOCK=true

# 开发环境使用 Mock 服务
VITE_USE_MOCK=dev

# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 自动判断逻辑

1. **明确指定**：`VITE_USE_MOCK=true` 强制使用 Mock
2. **配置缺失**：Supabase 配置不完整时自动回退到 Mock
3. **开发模式**：`VITE_USE_MOCK=dev` 开发环境可选 Mock

## 使用方式

### 在业务代码中使用

```typescript
// 导入业务服务
import { authService, taskService } from '@/features/auth/services/authService';

// 使用服务（自动根据配置选择实现）
const user = await authService.getSession();
const tasks = await taskService.getTasks();
```

### 在基础设施中使用

```typescript
// 导入基础设施服务
import { sentry, cacheService, preloadService } from '@/shared/infrastructure';

// 使用基础设施服务
sentry.captureException(error);
const data = await cacheService.get('key', fetcher);
const promise = preloadService.preload('key', fetcher);
```

### 在测试中使用

```typescript
import { serviceFactory } from '@/shared/services';

// 重置服务实例
serviceFactory.reset();

// 获取服务实例进行测试
const authService = serviceFactory.getAuthService();
```

## 优势

### 1. 清晰的职责分离
- 基础设施层专注于技术能力
- 业务服务层专注于业务逻辑
- 避免职责混乱和依赖混乱

### 2. 灵活的配置管理
- 通过环境变量控制服务选择
- 支持不同环境的配置需求
- 自动回退机制确保可用性

### 3. 良好的可测试性
- 接口定义便于 Mock 测试
- 服务工厂支持测试时重置
- 基础设施层独立可测试

### 4. 易于扩展和维护
- 新增服务只需实现接口
- 修改实现不影响业务代码
- 清晰的依赖关系便于维护

## 最佳实践

### 1. 服务设计
- 保持接口简洁，只包含必要方法
- 实现类应该专注于单一职责
- 使用 TypeScript 确保类型安全

### 2. 错误处理
- 在实现层统一处理错误
- 提供有意义的错误信息
- 支持错误监控和日志记录

### 3. 性能优化
- 使用缓存减少重复请求
- 实现请求合并避免竞态条件
- 支持预加载提升用户体验

### 4. 配置管理
- 使用环境变量进行配置
- 提供合理的默认值
- 支持运行时配置切换

## 总结

这种分层架构设计实现了：

1. **职责清晰**：基础设施层和业务服务层各司其职
2. **依赖合理**：业务服务层依赖基础设施层，而不是相反
3. **配置灵活**：支持多种环境和服务选择策略
4. **易于维护**：清晰的架构便于团队协作和代码维护
5. **可扩展性强**：新增服务或修改实现都很容易

这种架构特别适合需要支持多种数据源、多环境部署的现代 Web 应用。 