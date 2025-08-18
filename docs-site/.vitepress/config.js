import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI-DevKit',
  description: '现代化的AI项目开发框架，提供完整的开发工具链和最佳实践',
  
  // 主题配置
  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '开发指南', link: '/guide/getting-started' },
      { text: 'React 学习', link: '/react/learning' },
      { text: '提示词', link: '/prompts/' },
      { text: 'GitHub', link: 'https://github.com/your-repo' }
    ],

    // 侧边栏
    sidebar: {
      '/guide/': [
        {
          text: '开发指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '系统架构', link: '/guide/architecture' },
            { text: '集成方案', link: '/guide/integration' },
            { text: 'Mermaid 图表示例', link: '/guide/mermaid-examples' }
          ]
        }
      ],
      '/react/': [
        {
          text: 'React 学习中心',
          items: [
            { text: '学习指南', link: '/react/learning' },
            { text: '性能优化指南', link: '/react/performance' },
            {
              text: '实践项目',
              items: [
                { text: 'Todo 应用优化', link: '/react/projects/todo-optimization' }
              ]
            }
          ]
        }
      ],
      '/prompts/': [
        {
          text: 'AI 开发提示词',
          items: [
            { text: 'AI 提示词模板', link: '/prompts/ai-templates' },
            { text: '代码模板', link: '/prompts/code-templates' }
          ]
        }
      ]
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo' }
    ],

    // 页脚
    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2024 AI-DevKit'
    },

    // 搜索配置
    search: {
      provider: 'local'
    }
  },

  // 头部配置
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#667eea' }],
    ['meta', { name: 'msapplication-TileColor', content: '#667eea' }]
  ],

  // Markdown 配置
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true,
    // 配置 Mermaid 支持
    config: (md) => {
      // 添加 Mermaid 代码块支持
      const defaultRender = md.renderer.rules.fence
      md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx]
        const code = token.content.trim()
        const lang = token.info.trim()
        
        if (lang === 'mermaid') {
          // 使用简单的 HTML 转义
          const escapedCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
          return `<Mermaid chart="${escapedCode}" />`
        }
        
        return defaultRender(tokens, idx, options, env, slf)
      }
    }
  },

  // Vite 配置
  vite: {
    optimizeDeps: {
      include: ['mermaid']
    }
  },

  // 其他配置
  lang: 'zh-CN',
  lastUpdated: true,
  contributors: true
})
