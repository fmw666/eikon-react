# React 性能优化指南

> 🚀 **学习目标**：掌握 React 性能优化的核心概念和实践技巧，让你的应用飞起来！

## 📋 目录

- [性能优化的核心原则](#性能优化的核心原则)
- [动态组件与静态组件拆分](#动态组件与静态组件拆分)
- [useMemo 和 useCallback 的使用](#usememo-和-usecallback-的使用)
- [避免子组件不必要的重渲染](#避免子组件不必要的重渲染)
- [性能监控与调试](#性能监控与调试)
- [实战案例](#实战案例)

---

## 性能优化的核心原则

### 🎯 什么是高性能组件？

高性能组件应该具备以下特征：

1. **渲染次数最少**：只在必要时重新渲染
2. **渲染速度快**：渲染过程耗时短
3. **内存占用合理**：不会造成内存泄漏
4. **用户体验流畅**：交互响应及时

### 🔍 性能问题的常见原因

```tsx
// ❌ 问题代码示例
function BadComponent({ data }) {
  // 每次渲染都会创建新对象
  const processedData = data.map(item => ({
    ...item,
    processed: true
  }));

  // 每次渲染都会创建新函数
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <div>
      {processedData.map(item => (
        <ChildComponent 
          key={item.id} 
          data={item} 
          onClick={handleClick} 
        />
      ))}
    </div>
  );
}
```

**问题分析**：
- `processedData` 每次渲染都会重新计算
- `handleClick` 每次渲染都会创建新函数
- `ChildComponent` 每次都会重新渲染

---

## 动态组件与静态组件拆分

### 🧩 组件拆分原则

将组件按照**变化频率**进行拆分：

- **静态组件**：很少变化，可以缓存
- **动态组件**：经常变化，需要及时更新

### 📝 实践示例

#### 1. 基础拆分

```tsx
// ✅ 好的拆分方式
import { memo } from 'react';

// 静态组件 - 使用 memo 缓存
const StaticHeader = memo(({ title }) => (
  <header className="bg-blue-500 text-white p-4">
    <h1>{title}</h1>
  </header>
));

// 动态组件 - 需要实时更新
const DynamicContent = ({ data }) => (
  <div className="p-4">
    {data.map(item => (
      <div key={item.id}>{item.content}</div>
    ))}
  </div>
);

// 主组件
function App({ title, data }) {
  return (
    <div>
      <StaticHeader title={title} />
      <DynamicContent data={data} />
    </div>
  );
}
```

#### 2. 复杂场景拆分

```tsx
// ✅ 更复杂的拆分示例
import { memo, useState, useCallback } from 'react';

// 完全静态的组件
const Logo = memo(() => (
  <div className="logo">
    <img src="/logo.png" alt="Logo" />
  </div>
));

// 半静态组件 - 依赖 props 但不经常变化
const Navigation = memo(({ items }) => (
  <nav>
    {items.map(item => (
      <a key={item.id} href={item.href}>
        {item.label}
      </a>
    ))}
  </nav>
));

// 动态组件 - 包含状态和交互
const SearchBar = memo(({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSearch(query);
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索..."
      />
    </form>
  );
});

// 主组件
function Dashboard({ navItems, onSearch }) {
  return (
    <div className="dashboard">
      <Logo />
      <Navigation items={navItems} />
      <SearchBar onSearch={onSearch} />
    </div>
  );
}
```

### 🎯 拆分策略

| 组件类型 | 特征 | 优化策略 |
|---------|------|----------|
| **完全静态** | 不依赖任何 props 或 state | 使用 `memo` 包装 |
| **半静态** | 依赖 props 但不经常变化 | 使用 `memo` + 浅比较 |
| **动态** | 包含状态或频繁变化 | 内部优化 + 状态管理 |

---

## useMemo 和 useCallback 的使用

### 💡 useMemo - 缓存计算结果

#### 使用场景

```tsx
// ✅ 正确使用 useMemo
import { useMemo } from 'react';

function ExpensiveComponent({ items, filter }) {
  // 缓存计算结果
  const filteredItems = useMemo(() => {
    console.log('重新计算过滤结果');
    return items.filter(item => item.name.includes(filter));
  }, [items, filter]); // 依赖项

  // 缓存复杂对象
  const itemStats = useMemo(() => {
    return {
      total: items.length,
      filtered: filteredItems.length,
      average: items.reduce((sum, item) => sum + item.value, 0) / items.length
    };
  }, [items, filteredItems]);

  return (
    <div>
      <p>总数: {itemStats.total}</p>
      <p>过滤后: {itemStats.filtered}</p>
      <p>平均值: {itemStats.average}</p>
    </div>
  );
}
```

#### 何时使用 useMemo

```tsx
// ✅ 应该使用 useMemo 的情况
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// ❌ 不应该使用 useMemo 的情况
const simpleValue = useMemo(() => {
  return data.length; // 简单计算，不值得缓存
}, [data]);
```

### 🎣 useCallback - 缓存函数

#### 使用场景

```tsx
// ✅ 正确使用 useCallback
import { useCallback } from 'react';

function ParentComponent({ data }) {
  // 缓存事件处理函数
  const handleItemClick = useCallback((itemId) => {
    console.log('点击了项目:', itemId);
    // 处理点击逻辑
  }, []); // 空依赖数组，函数永远不会改变

  // 缓存带依赖的函数
  const handleItemUpdate = useCallback((itemId, newData) => {
    console.log('更新项目:', itemId, newData);
    // 更新逻辑
  }, [data]); // 依赖 data

  return (
    <div>
      {data.map(item => (
        <ChildComponent
          key={item.id}
          item={item}
          onClick={handleItemClick}
          onUpdate={handleItemUpdate}
        />
      ))}
    </div>
  );
}
```

#### 函数缓存策略

```tsx
// ✅ 不同场景的缓存策略
function Component({ data, onSave }) {
  // 1. 无依赖的函数 - 永远缓存
  const handleClick = useCallback(() => {
    console.log('点击');
  }, []);

  // 2. 有依赖的函数 - 依赖变化时重新创建
  const handleDataChange = useCallback((newData) => {
    onSave(newData);
  }, [onSave]);

  // 3. 复杂依赖的函数
  const handleFilter = useCallback((filter) => {
    return data.filter(item => item.type === filter);
  }, [data]);

  return (
    <div>
      <button onClick={handleClick}>点击</button>
      <input onChange={(e) => handleDataChange(e.target.value)} />
    </div>
  );
}
```

---

## 避免子组件不必要的重渲染

### 🔍 重渲染的原因分析

```tsx
// ❌ 导致重渲染的常见问题
function Parent({ data }) {
  const [count, setCount] = useState(0);

  // 问题1: 每次渲染都创建新对象
  const config = { theme: 'dark', size: 'large' };

  // 问题2: 每次渲染都创建新函数
  const handleClick = () => setCount(count + 1);

  // 问题3: 内联 JSX
  return (
    <div>
      <button onClick={handleClick}>计数: {count}</button>
      <ChildComponent 
        data={data} 
        config={config}  // 每次都传递新对象
        onClick={handleClick}  // 每次都传递新函数
      />
    </div>
  );
}
```

### ✅ 优化解决方案

```tsx
// ✅ 优化后的代码
import { memo, useMemo, useCallback } from 'react';

function Parent({ data }) {
  const [count, setCount] = useState(0);

  // 解决方案1: 使用 useMemo 缓存对象
  const config = useMemo(() => ({
    theme: 'dark',
    size: 'large'
  }), []); // 空依赖，对象永远不会改变

  // 解决方案2: 使用 useCallback 缓存函数
  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []); // 空依赖，函数永远不会改变

  return (
    <div>
      <button onClick={handleClick}>计数: {count}</button>
      <ChildComponent 
        data={data} 
        config={config}
        onClick={handleClick}
      />
    </div>
  );
}

// 解决方案3: 使用 memo 包装子组件
const ChildComponent = memo(({ data, config, onClick }) => {
  console.log('ChildComponent 渲染');
  
  return (
    <div>
      <p>配置: {config.theme}</p>
      <button onClick={onClick}>子组件按钮</button>
    </div>
  );
});
```

### 🎯 性能优化检查清单

```tsx
// ✅ 完整的优化示例
import { memo, useMemo, useCallback, useState } from 'react';

// 1. 使用 memo 包装组件
const OptimizedChild = memo(({ 
  data, 
  config, 
  onAction, 
  renderItem 
}) => {
  console.log('OptimizedChild 渲染');

  // 2. 组件内部使用 useMemo
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: true
    }));
  }, [data]);

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id}>
          {renderItem(item)}
        </div>
      ))}
      <button onClick={onAction}>执行操作</button>
    </div>
  );
});

// 3. 主组件优化
function OptimizedParent({ items }) {
  const [count, setCount] = useState(0);

  // 4. 缓存配置对象
  const config = useMemo(() => ({
    theme: 'dark',
    size: 'large',
    features: ['feature1', 'feature2']
  }), []);

  // 5. 缓存事件处理函数
  const handleAction = useCallback(() => {
    console.log('执行操作');
    setCount(prev => prev + 1);
  }, []);

  // 6. 缓存渲染函数
  const renderItem = useCallback((item) => (
    <div className="item">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  ), []);

  return (
    <div>
      <h2>计数: {count}</h2>
      <OptimizedChild
        data={items}
        config={config}
        onAction={handleAction}
        renderItem={renderItem}
      />
    </div>
  );
}
```

---

## 性能监控与调试

### 🛠️ React DevTools 使用

1. **Profiler 工具**
   - 记录组件渲染时间
   - 识别渲染瓶颈
   - 分析渲染原因

2. **Components 工具**
   - 查看组件树结构
   - 检查 props 变化
   - 分析重渲染原因

### 📊 性能指标监控

```tsx
// 性能监控工具
import { useEffect, useRef } from 'react';

function usePerformanceMonitor(componentName) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTime.current;
    
    console.log(`${componentName} 渲染次数: ${renderCount.current}`);
    console.log(`${componentName} 渲染耗时: ${renderTime.toFixed(2)}ms`);
    
    lastRenderTime.current = currentTime;
  });
}

// 使用示例
function MonitoredComponent() {
  usePerformanceMonitor('MonitoredComponent');
  
  return <div>监控的组件</div>;
}
```

### 🔍 调试技巧

```tsx
// 调试重渲染的工具函数
function useRenderLogger(componentName, props) {
  useEffect(() => {
    console.log(`${componentName} 重新渲染`, {
      props,
      timestamp: new Date().toISOString()
    });
  });
}

// 使用示例
function DebugComponent({ data, config }) {
  useRenderLogger('DebugComponent', { data, config });
  
  return <div>调试组件</div>;
}
```

---

## 实战案例

### 🎯 案例1: 列表组件优化

```tsx
// 优化前的列表组件
function BadList({ items, onItemClick }) {
  return (
    <div>
      {items.map(item => (
        <ListItem 
          key={item.id} 
          item={item} 
          onClick={() => onItemClick(item.id)} // ❌ 每次都创建新函数
        />
      ))}
    </div>
  );
}

// 优化后的列表组件
import { memo, useCallback, useMemo } from 'react';

const OptimizedListItem = memo(({ item, onClick }) => {
  console.log(`ListItem ${item.id} 渲染`);
  
  return (
    <div onClick={() => onClick(item.id)}>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  );
});

function OptimizedList({ items, onItemClick }) {
  // 缓存点击处理函数
  const handleItemClick = useCallback((itemId) => {
    onItemClick(itemId);
  }, [onItemClick]);

  // 缓存处理后的数据
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      displayTitle: item.title.toUpperCase()
    }));
  }, [items]);

  return (
    <div>
      {processedItems.map(item => (
        <OptimizedListItem
          key={item.id}
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
}
```

### 🎯 案例2: 表单组件优化

```tsx
// 优化表单组件
import { memo, useCallback, useMemo, useState } from 'react';

const FormField = memo(({ label, value, onChange, type = 'text' }) => {
  console.log(`FormField ${label} 渲染`);
  
  return (
    <div>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  );
});

function OptimizedForm({ initialData, onSubmit }) {
  const [formData, setFormData] = useState(initialData);

  // 缓存表单配置
  const formConfig = useMemo(() => [
    { key: 'name', label: '姓名', type: 'text' },
    { key: 'email', label: '邮箱', type: 'email' },
    { key: 'age', label: '年龄', type: 'number' }
  ], []);

  // 缓存字段变化处理函数
  const handleFieldChange = useCallback((fieldKey) => (e) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: e.target.value
    }));
  }, []);

  // 缓存提交处理函数
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      {formConfig.map(field => (
        <FormField
          key={field.key}
          label={field.label}
          value={formData[field.key] || ''}
          onChange={handleFieldChange(field.key)}
          type={field.type}
        />
      ))}
      <button type="submit">提交</button>
    </form>
  );
}
```

---

## 📚 总结

### 🎯 关键要点

1. **组件拆分**：按变化频率拆分静态和动态组件
2. **缓存策略**：合理使用 `useMemo` 和 `useCallback`
3. **避免重渲染**：使用 `memo` 包装组件
4. **性能监控**：使用工具监控和分析性能

### 🚀 最佳实践

- ✅ 优先考虑组件拆分，再考虑缓存优化
- ✅ 只在必要时使用 `useMemo` 和 `useCallback`
- ✅ 定期使用 React DevTools 分析性能
- ✅ 编写性能测试和监控代码

### 🔗 相关资源

- [React 官方性能优化指南](https://react.dev/learn/render-and-commit)
- [React DevTools 使用指南](https://react.dev/learn/react-developer-tools)
- [性能优化实战案例](https://react.dev/learn/you-might-not-need-an-effect)

---

> 💡 **提示**：性能优化是一个持续的过程，需要在实际项目中不断实践和优化。记住，过早优化是万恶之源，先确保功能正确，再进行性能优化！
