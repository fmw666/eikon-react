# 基础设施层 (Infrastructure)

## 概述

基础设施层包含所有与外部系统集成、工具库和基础服务的实现。

## 目录结构

```
src/shared/infrastructure/
├── external/           # 外部服务集成
│   ├── sentry.ts      # Sentry 错误监控
│   ├── supabase.ts    # Supabase 客户端
│   └── index.ts       # 统一导出
├── cache/             # 缓存相关
│   ├── cacheService.ts
│   └── index.ts
├── preload/           # 预加载相关
│   ├── preloadService.ts
│   └── index.ts
└── index.ts           # 基础设施层统一导出
```

## 设计原则

1. **单一职责**：每个模块只负责一个特定的基础设施功能
2. **低耦合**：基础设施层不依赖业务逻辑
3. **可配置**：通过环境变量控制功能开关
4. **可测试**：提供 Mock 实现用于测试

## 使用方式

```typescript
// 导入基础设施服务
import { sentry } from '@/shared/infrastructure/external';
import { cacheService } from '@/shared/infrastructure/cache';
import { preloadService } from '@/shared/infrastructure/preload';

// 使用服务
sentry.captureException(error);
const data = await cacheService.get('key', fetcher);
const promise = preloadService.preload('key', fetcher);
```
