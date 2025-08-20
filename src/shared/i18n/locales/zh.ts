export default {
  common: {
    hello: '你好',
  },
  auth: {
    loggedIn: '已登录',
    logout: '退出登录',
    loggingOut: '退出中...',
    notLoggedIn: '未登录',
    pleaseLogin: '请先登录',
    login: '登录',
    loading: '加载中...',
    loginModal: {
      title: '登录',
      email: '邮箱',
      password: '密码',
      invalidEmailOrPassword: '邮箱或密码错误',
      login: '登录',
      loggingIn: '登录中...',
    },
  },
  task: {
    layout: {
      simulatedDelayNotice: '此处所有网络延迟均为模拟实现，仅用于演示加载与性能优化效果。',
    },
    index: {
      title: '任务列表',
      new: '新建任务',
      noTasks: '暂无任务',
    },
    details: {
      title: '任务详情',
      back: '返回列表',
      loading: '加载中...',
      notFound: '未找到任务',
    },
    new: {
      title: '新建任务',
      back: '返回列表',
      notFound: '未找到任务',
      form: {
        title: '标题',
        description: '描述',
        submit: '提交',
      },
    },
  },
  settings: {
    title: '设置',
    open: '设置',
    language: '语言',
    languages: {
      en: '英文',
      zh: '中文',
    },
    theme: '主题',
    themes: {
      system: '跟随系统',
      light: '浅色',
      dark: '深色',
    },
  },
  home: {
    title: 'AI-DevKit',
    subtitle: 'AI 开发工具箱，快速搭建你的 AI 应用！',
    sections: {
      introduction: {
        title: '项目介绍',
        description: '本项目旨在为 AI 阅读和二次开发提供清晰、易扩展的项目架构。你可以基于本模板快速搭建自己的 AI 应用或业务系统。',
        features: {
          rapidDevelopment: '快速开发',
          aiFriendly: 'AI 友好',
          highPerformance: '高性能',
          responsive: '响应式',
        },
      },
      quickStart: {
        title: '快速开始',
        command: 'cd docs-site/ && npm install && npm run dev',
        description: '然后打开 <url>{{url}}</url> 查看文档',
        url: 'localhost:5173',
      },
      examples: {
        title: '示例模块',
        description: '我们为你提供了 task 模块作为示例：',
        button: '进入 task 模块 🎮',
      },
      components: {
        title: '组件案例',
        description: '查看项目内可复用的 UI 组件示例与演示：',
        button: '进入示例模块 🔗',
      },
    },
    footer: {
      message: '准备好开始你的开发之旅了吗？',
    },
  },
};
