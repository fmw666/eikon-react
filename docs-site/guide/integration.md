# 集成方案

> 🔗 **AI-DevKit 集成方案** - 与第三方服务和工具的完整集成指南

## 📋 目录

- [集成概览](#集成概览)
- [认证集成](#认证集成)
- [数据库集成](#数据库集成)
- [AI 服务集成](#ai-服务集成)
- [部署集成](#部署集成)
- [监控集成](#监控集成)

---

## 集成概览

### 🎯 集成架构

AI-DevKit 提供了完整的第三方服务集成方案，支持多种主流服务和工具。

```
┌─────────────────────────────────────────────────────────────┐
│                    AI-DevKit Application                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Integration     │
                    │     Layer         │
                    └─────────┬─────────┘
                              │
        ┌─────────────┬───────┼───────┬─────────────┐
        │             │       │       │             │
    ┌───▼───┐   ┌─────▼─────┐ │ ┌─────▼─────┐ ┌─────▼─────┐
    │ Auth  │   │ Database  │ │ │ AI APIs   │ │ Monitoring│
    │Services│   │ Services  │ │ │ Services  │ │ Services  │
    └───────┘   └───────────┘ │ └───────────┘ └───────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Deployment      │
                    │   Platforms       │
                    └───────────────────┘
```

### 🔧 集成配置

```typescript
// 集成配置接口
interface IntegrationConfig {
  // 认证服务配置
  auth: {
    provider: 'supabase' | 'firebase' | 'auth0' | 'custom';
    config: AuthConfig;
  };
  
  // 数据库配置
  database: {
    provider: 'supabase' | 'firebase' | 'mongodb' | 'postgresql';
    config: DatabaseConfig;
  };
  
  // AI 服务配置
  ai: {
    provider: 'openai' | 'anthropic' | 'google' | 'azure';
    config: AIConfig;
  };
  
  // 监控配置
  monitoring: {
    provider: 'sentry' | 'logrocket' | 'mixpanel' | 'google-analytics';
    config: MonitoringConfig;
  };
  
  // 部署配置
  deployment: {
    provider: 'vercel' | 'netlify' | 'aws' | 'docker';
    config: DeploymentConfig;
  };
}
```

---

## 认证集成

### 🔐 Supabase 认证

#### 配置设置

```typescript
// Supabase 认证配置
interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  authOptions?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
  };
}

// 认证服务实现
class SupabaseAuthService implements AuthService {
  private supabase: SupabaseClient;
  
  constructor(config: SupabaseAuthConfig) {
    this.supabase = createClient(config.url, config.anonKey, {
      auth: config.authOptions
    });
  }
  
  async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: credentials.userData
      }
    });
    
    if (error) throw new Error(error.message);
    return this.transformAuthResult(data);
  }
  
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (error) throw new Error(error.message);
    return this.transformAuthResult(data);
  }
  
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
  
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user ? this.transformUser(user) : null;
  }
  
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ? this.transformUser(session.user) : null);
    }).data.subscription.unsubscribe;
  }
  
  private transformUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name,
      avatar: supabaseUser.user_metadata?.avatar_url,
      role: supabaseUser.user_metadata?.role,
      permissions: supabaseUser.user_metadata?.permissions || []
    };
  }
  
  private transformAuthResult(data: any): AuthResult {
    return {
      user: this.transformUser(data.user),
      session: data.session
    };
  }
}
```

#### 使用示例

```tsx
// React Hook 使用
import { useAuth } from '@/features/auth/hooks/useAuth';

function LoginForm() {
  const { signIn, loading, error } = useAuth();
  
  const handleSubmit = async (credentials: SignInCredentials) => {
    try {
      await signIn(credentials);
      // 登录成功，跳转到首页
    } catch (error) {
      console.error('登录失败:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
    </form>
  );
}
```

### 🔥 Firebase 认证

```typescript
// Firebase 认证配置
interface FirebaseAuthConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class FirebaseAuthService implements AuthService {
  private auth: Auth;
  
  constructor(config: FirebaseAuthConfig) {
    const app = initializeApp(config);
    this.auth = getAuth(app);
  }
  
  async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      credentials.email,
      credentials.password
    );
    
    // 更新用户资料
    if (credentials.userData) {
      await updateProfile(userCredential.user, {
        displayName: credentials.userData.name,
        photoURL: credentials.userData.avatar
      });
    }
    
    return this.transformAuthResult(userCredential);
  }
  
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const userCredential = await signInWithEmailAndPassword(
      this.auth,
      credentials.email,
      credentials.password
    );
    
    return this.transformAuthResult(userCredential);
  }
  
  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
  
  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = this.auth.currentUser;
    return firebaseUser ? this.transformUser(firebaseUser) : null;
  }
  
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser) => {
      callback(firebaseUser ? this.transformUser(firebaseUser) : null);
    });
  }
  
  private transformUser(firebaseUser: any): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      avatar: firebaseUser.photoURL,
      role: firebaseUser.customClaims?.role,
      permissions: firebaseUser.customClaims?.permissions || []
    };
  }
  
  private transformAuthResult(userCredential: any): AuthResult {
    return {
      user: this.transformUser(userCredential.user),
      session: userCredential.user
    };
  }
}
```

---

## 数据库集成

### 🗄️ Supabase 数据库

#### 配置设置

```typescript
// Supabase 数据库配置
interface SupabaseDatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema?: string;
}

class SupabaseDatabaseService implements DatabaseService {
  private supabase: SupabaseClient;
  
  constructor(config: SupabaseDatabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey, {
      db: { schema: config.schema }
    });
  }
  
  // 任务相关操作
  async getTasks(userId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data.map(this.transformTask);
  }
  
  async createTask(task: CreateTaskRequest): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert([{
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        user_id: task.userId,
        due_date: task.dueDate,
        tags: task.tags
      }])
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return this.transformTask(data);
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return this.transformTask(data);
  }
  
  async deleteTask(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
  
  // 实时订阅
  subscribeToTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const subscription = this.supabase
      .channel('tasks')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // 重新获取最新数据
        this.getTasks(userId).then(callback);
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }
  
  private transformTask(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      userId: data.user_id,
      createdAt: data.created_at,
      dueDate: data.due_date,
      tags: data.tags || []
    };
  }
}
```

#### 数据库模式

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 安全策略
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
```

### 🍃 MongoDB 集成

```typescript
// MongoDB 配置
interface MongoDBConfig {
  uri: string;
  database: string;
  options?: {
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
  };
}

class MongoDBService implements DatabaseService {
  private client: MongoClient;
  private db: Db;
  
  constructor(config: MongoDBConfig) {
    this.client = new MongoClient(config.uri, config.options);
    this.db = this.client.db(config.database);
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
  }
  
  async getTasks(userId: string): Promise<Task[]> {
    const collection = this.db.collection('tasks');
    const tasks = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return tasks.map(this.transformTask);
  }
  
  async createTask(task: CreateTaskRequest): Promise<Task> {
    const collection = this.db.collection('tasks');
    const newTask = {
      ...task,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(newTask);
    return this.transformTask(newTask);
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const collection = this.db.collection('tasks');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result.value) throw new Error('Task not found');
    return this.transformTask(result.value);
  }
  
  async deleteTask(id: string): Promise<void> {
    const collection = this.db.collection('tasks');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new Error('Task not found');
    }
  }
  
  private transformTask(data: any): Task {
    return {
      id: data._id.toString(),
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      userId: data.userId,
      createdAt: data.createdAt.toISOString(),
      dueDate: data.dueDate?.toISOString(),
      tags: data.tags || []
    };
  }
}
```

---

## AI 服务集成

### 🤖 OpenAI 集成

```typescript
// OpenAI 配置
interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  timeout?: number;
}

class OpenAIService implements AIService {
  private client: OpenAI;
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
      timeout: config.timeout
    });
  }
  
  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    });
    
    return response.choices[0]?.message?.content || '';
  }
  
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<string> {
    const response = await this.client.images.generate({
      model: options.model || 'dall-e-3',
      prompt,
      n: options.count || 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: options.style || 'vivid'
    });
    
    return response.data[0]?.url || '';
  }
  
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const prompt = `分析以下文本的情感倾向，返回 JSON 格式：
    {
      "sentiment": "positive|negative|neutral",
      "confidence": 0.95,
      "emotions": ["joy", "sadness", "anger"]
    }
    
    文本：${text}`;
    
    const response = await this.generateText(prompt, {
      temperature: 0.1,
      maxTokens: 200
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('Failed to parse sentiment analysis response');
    }
  }
  
  async summarizeText(text: string, maxLength: number = 200): Promise<string> {
    const prompt = `请将以下文本总结为不超过 ${maxLength} 字的摘要：
    
    ${text}`;
    
    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: maxLength + 50
    });
  }
}
```

### 🧠 Anthropic Claude 集成

```typescript
// Anthropic 配置
interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

class AnthropicService implements AIService {
  private client: Anthropic;
  
  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout
    });
  }
  
  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model || 'claude-3-sonnet-20240229',
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.content[0]?.text || '';
  }
  
  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `请分析以下 ${language} 代码，并提供改进建议：
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    请从以下方面进行分析：
    1. 代码质量
    2. 性能优化
    3. 安全性
    4. 可维护性
    5. 最佳实践`;
    
    const analysis = await this.generateText(prompt, {
      temperature: 0.2,
      maxTokens: 1500
    });
    
    return {
      code,
      language,
      analysis,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## 部署集成

### 🚀 Vercel 部署

#### 配置文件

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_OPENAI_API_KEY": "@openai_api_key"
  }
}
```

#### GitHub Actions 部署

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_OPENAI_API_KEY: ${{ secrets.VITE_OPENAI_API_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 🐳 Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM nginx:alpine

# 复制构建结果
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API 代理
        location /api/ {
            proxy_pass http://backend:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # SPA 路由支持
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
      
  backend:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./backend:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    command: npm start
```

---

## 监控集成

### 📊 Sentry 错误监控

```typescript
// Sentry 配置
interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  integrations?: any[];
}

class SentryService implements MonitoringService {
  constructor(config: SentryConfig) {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || 'production',
      release: config.release,
      tracesSampleRate: config.tracesSampleRate || 0.1,
      integrations: config.integrations || [
        new Sentry.BrowserTracing(),
        new Sentry.Replay()
      ]
    });
  }
  
  captureException(error: Error, context?: any): void {
    Sentry.captureException(error, {
      extra: context
    });
  }
  
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }
  
  setUser(user: User): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name
    });
  }
  
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }
  
  setContext(name: string, context: any): void {
    Sentry.setContext(name, context);
  }
  
  startTransaction(name: string, operation: string): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op: operation
    });
  }
}
```

### 📈 Google Analytics 集成

```typescript
// Google Analytics 配置
interface GoogleAnalyticsConfig {
  measurementId: string;
  debug?: boolean;
}

class GoogleAnalyticsService implements AnalyticsService {
  private gtag: any;
  
  constructor(config: GoogleAnalyticsConfig) {
    // 加载 Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    this.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    this.gtag('js', new Date());
    this.gtag('config', config.measurementId, {
      debug_mode: config.debug || false
    });
  }
  
  trackPageView(page: string): void {
    this.gtag('config', this.config.measurementId, {
      page_path: page
    });
  }
  
  trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
    this.gtag('event', eventName, parameters);
  }
  
  trackUserAction(action: string, category: string, label?: string, value?: number): void {
    this.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
  
  setUserId(userId: string): void {
    this.gtag('config', this.config.measurementId, {
      user_id: userId
    });
  }
  
  setUserProperties(properties: Record<string, any>): void {
    this.gtag('config', this.config.measurementId, {
      custom_map: properties
    });
  }
}
```

---

## 📚 总结

### 🎯 集成优势

1. **灵活性**：支持多种第三方服务
2. **可扩展性**：易于添加新的集成
3. **标准化**：统一的接口设计
4. **类型安全**：完整的 TypeScript 支持

### 🚀 最佳实践

- ✅ 使用环境变量管理敏感配置
- ✅ 实施错误处理和重试机制
- ✅ 添加性能监控和日志记录
- ✅ 遵循安全最佳实践
- ✅ 定期更新依赖和配置

### 🔗 相关资源

- [Supabase 文档](https://supabase.com/docs)
- [Firebase 文档](https://firebase.google.com/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Sentry 文档](https://docs.sentry.io/)

---

> 💡 **提示**：选择合适的集成方案时，需要考虑项目需求、团队技术栈和成本因素。建议从核心功能开始，逐步添加其他集成！
