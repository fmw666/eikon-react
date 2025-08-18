

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-d9d9d9?style=for-the-badge&color=0078D4"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-d9d9d9?style=for-the-badge&color=1AAD19"></a>
</p>

AI-DevKit 是一个专为AI辅助编程设计的全栈项目模板，集成了React、TypeScript、Tailwind CSS等现代化技术栈。通过提供清晰的项目架构、标准化的开发规范和丰富的AI提示词模板，让开发者能够快速与AI协作，高效构建高质量的前端应用。无论是初学者还是经验丰富的开发者，都能基于此模板快速搭建项目骨架，专注于业务逻辑开发。

AI-DevKit is a full-stack project template designed specifically for AI-assisted programming, integrating modern technologies like React, TypeScript, and Tailwind CSS. With its clear project architecture, standardized development practices, and comprehensive AI prompt templates, it enables developers to collaborate efficiently with AI and rapidly build high-quality frontend applications. Whether you're a beginner or an experienced developer, you can quickly scaffold your project foundation and focus on business logic development.

`DesignChat AI` 基于 Vibe Coding 最佳实践的一套代码模板

| Node.js | NPM |
| :-----  | :-- |
| v22.14.0 | v11.2.0 |

采用技术栈：

xxx

优势：xx

目的是 1. 让不会前端的人能通过 ai 快速完成前端项目搭建；2. 给开发者提供一套一站式 AI 开发全栈平台

## ✨ Features

- 项目结构清晰，feature 结构划分，便于模块管理。按功能模块划分 (Feature-based Structure)
- hook→store→service 高性能实践方案
- 文档丰富
- 代码规范整洁，利于阅读
- supabase 初始化
- 认证服务，原生集成 supabase 邮件服务
- 支持 mock，构造测试数据
- 基础框架 (Sidebar, Topbar, MainLayout)
- 基础组件 Modal、Button
- 多语言
- 采用 i18n 和 zustand 简单高效的前端组件
- tailwind 初始化
- Sonnar 初始化
- jest 初始化
- test 集成
- 简单配置即可启动
- 示例代码

## AI 管理

- 多语言生成




## 快速开始

安装 docker

启动命令 start.bat / start.sh

---

## 🛠️ Tech Stack

| Technology | Version | Description |
|------|------|------|
| ![React](https://img.shields.io/badge/React-18.2.0-20232a?logo=react&logoColor=61DAFB&labelColor=20232a) | 18.2.0 | UI library |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?logo=typescript&logoColor=white&labelColor=3178C6) | 5.2.2 | Type-safe JavaScript extension |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-0ea5e9?logo=tailwindcss&logoColor=white&labelColor=0ea5e9) | 3.4.1 | Utility-first CSS framework |
| ![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite&logoColor=FFD62E&labelColor=646CFF) | 6.3.5 | Next-gen frontend build tool |
| ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=3ECF8E&labelColor=222) | - | Open-source Firebase alternative |
| ![Vercel](https://img.shields.io/badge/Vercel-Deploy-222222?logo=vercel&logoColor=white&labelColor=111111) | - | Frontend deployment platform |

## 🚀 Quick Start

💡 This project uses `supabase` for the backend. You need to create a `supabase` project and configure environment variables.

### 🖥️ Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/fmw666/DesignChat.git
cd DesignChat
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Initialize Supabase project

- Log in to [Supabase](https://supabase.com/) and create a project.
- Refer to the following docs to obtain various keys:
  - **Database (db) key:** [See db key doc](./docs/supabase/db/README.md)
  - **Auth key:** [See auth key doc](./docs/supabase/auth/README.md)
  - **Storage key:** [See storage key doc](./docs/supabase/storage/README.md)
- It is recommended to use the script to initialize all Supabase tables, auth, storage, etc. in one click.
  - Run locally:
    ```bash
    npm install && npm run init
    ```
  - Run with Docker (no local Node required):
    ```bash
    docker run --rm -v %cd%:/app -w /app node:20 npm run init
    ```
- For script details and more usage, see [Init Script Guide](./scripts/README.md)

#### 4. Configure environment variables

> Obtain the required keys from your Supabase project

```bash
cp .env.example .env
# Edit the .env file and fill in the required environment variables
```

#### 5. Start the development server

```bash
npm run dev
```

#### 6. Jest test

```bash
npm run test
```

#### 7. Lint test

```bash
npm run lint
```

### ☁️ One-Click Deploy

| Method | Scenario & Description |
|------|------|
| [![Deploy with Vercel by clone](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffmw666%2FDesignChat) | Clone this repo directly to your `Vercel` account, suitable for first-time deployment or full project copy |
| [![Deploy with Vercel by import](https://vercel.com/button)](https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2Ffmw666%2FDesignChat&teamSlug=maovos-projects) | Import this repo into your `Vercel` project, suitable for existing Vercel projects or team collaboration |

Click the button above and follow these steps to deploy:

1. Log in or register a `Vercel` account
2. Import the GitHub repository
3. Configure environment variables
4. Click deploy

## 📝 TODO

> Items that are done but not yet removed are marked with ✅.

### 🧩 Feature Design

1. User agreement and privacy: Add user agreement and privacy content to the login dialog
1. Model config info: Complete model info documentation
1. Model config support: Support more model APIs
1. Image-to-image: Optimize image-to-image experience, support model config
1. Asset library refactor: Optimize asset library loading and interaction
1. Image API management: Error code and message i18n management
1. Model config linkage: Real-time effect on modelStore when config changes
1. System prompt: Add system prompt feature for models
1. Model testing: Support model testing feature
1. Doubao API management: Separate ark/apiKey management for 3.0 and base models
1. API proxy protocol: Use vite proxy in dev, direct API in prod

### ⚡ Performance Optimization

1. Merge API requests: Use Supabase Edge Functions to merge DB requests
1. Bundle splitting: Fine-grained chunking with rollupOptions
1. Image optimization: Thumbnails, lazy loading, progressive loading, preloading
1. Code cleanup: Remove redundant code, optimize structure
1. IndexedDB: Optimize query performance using the browser IndexedDB

### 🎬 Animation & Theme

1. Animation performance optimization
1. Theme management: Global dark theme config, reduce style duplication

### 🎈 Lint

1. Handle `npm run lint` errors and warnings

## 🤝 Contributing

For those who want to contribute, please refer to our [Contribution Guide](./CONTRIBUTING.md).

**Contributors**

<a href="https://github.com/fmw666/DesignChat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fmw666/DesignChat" />
</a>

## 📄 License

MIT License - see [LICENSE](LICENSE) for details
