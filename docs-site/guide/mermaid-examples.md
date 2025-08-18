# Mermaid 图表示例

本页面展示了 VitePress 中 Mermaid 图表的各种类型和功能。

## 流程图 (Flowchart)

### 基础流程图

```mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
```

### 复杂流程图

```mermaid
graph LR
    A[用户输入] --> B[数据验证]
    B --> C{验证通过?}
    C -->|是| D[处理数据]
    C -->|否| E[显示错误]
    D --> F[保存结果]
    F --> G[返回成功]
    E --> H[重新输入]
    H --> B
    
    style A fill:#e1f5fe
    style G fill:#e8f5e8
    style E fill:#ffebee
```

## 时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant A as API
    participant D as 数据库
    
    U->>F: 点击按钮
    F->>A: 发送请求
    A->>D: 查询数据
    D-->>A: 返回结果
    A-->>F: 响应数据
    F-->>U: 更新界面
```

## 类图 (Class Diagram)

```mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    
    class Post {
        +String title
        +String content
        +Date createdAt
        +publish()
        +delete()
    }
    
    class Comment {
        +String content
        +Date createdAt
        +addComment()
        +removeComment()
    }
    
    User "1" *-- "0..*" Post : creates
    Post "1" *-- "0..*" Comment : has
    User "1" *-- "0..*" Comment : writes
```

## 甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析    :done, des1, 2024-01-01, 2024-01-07
    原型设计    :done, des2, 2024-01-08, 2024-01-14
    技术选型    :done, des3, 2024-01-15, 2024-01-21
    section 开发阶段
    前端开发    :active, dev1, 2024-01-22, 2024-02-11
    后端开发    :active, dev2, 2024-01-22, 2024-02-11
    数据库设计  :dev3, 2024-01-22, 2024-01-28
    section 测试阶段
    单元测试    :test1, 2024-02-12, 2024-02-18
    集成测试    :test2, 2024-02-19, 2024-02-25
    用户测试    :test3, 2024-02-26, 2024-03-04
```

## 饼图 (Pie Chart)

```mermaid
pie title 技术栈使用比例
    "React" : 35
    "TypeScript" : 25
    "Tailwind CSS" : 20
    "Vite" : 15
    "其他" : 5
```

## 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 进行中 : 开始处理
    进行中 --> 已完成 : 处理完成
    进行中 --> 已暂停 : 暂停处理
    已暂停 --> 进行中 : 恢复处理
    已完成 --> [*]
    已暂停 --> 已取消 : 取消处理
    已取消 --> [*]
```

## 实体关系图 (ER Diagram)

```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER {
        int id PK
        string username
        string email
        datetime created_at
    }
    POST ||--o{ COMMENT : has
    POST {
        int id PK
        int user_id FK
        string title
        string content
        datetime created_at
    }
    COMMENT {
        int id PK
        int post_id FK
        int user_id FK
        string content
        datetime created_at
    }
```

## 思维导图 (Mind Map)

```mermaid
mindmap
  root((AI-DevKit))
    前端技术
      React
        Hooks
        组件
        状态管理
      TypeScript
        类型定义
        接口
      Tailwind CSS
        样式系统
        响应式设计
    后端技术
      Node.js
        Express
        Koa
      Python
        FastAPI
        Django
    数据库
      PostgreSQL
      MongoDB
      Redis
    部署
      Docker
      CI/CD
      云服务
```

## 交互功能

所有图表都支持以下交互功能：

- **缩放**：使用鼠标滚轮或控制按钮进行缩放
- **拖拽**：点击并拖拽图表进行移动
- **全屏**：点击全屏按钮查看大图
- **代码查看**：点击代码按钮查看 Mermaid 源码
- **复制代码**：一键复制图表代码

## 使用说明

在 Markdown 文件中，使用以下语法创建 Mermaid 图表：

```markdown
```mermaid
graph TD
    A[开始] --> B[结束]
```
```

支持的主题：
- 默认主题
- 暗色主题（自动适配）
- 自定义样式

## 最佳实践

1. **简洁明了**：图表应该简洁易懂，避免过于复杂
2. **颜色搭配**：使用合适的颜色来区分不同的元素
3. **标签清晰**：为节点和连接线添加清晰的标签
4. **响应式设计**：图表会自动适配不同屏幕尺寸
5. **性能优化**：大型图表建议使用懒加载 
