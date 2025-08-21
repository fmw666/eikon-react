export default {
  common: {
    hello: 'Hello',
  },
  auth: {
    loggedIn: 'Logged in',
    logout: 'Logout',
    loggingOut: 'Logging out...',
    notLoggedIn: 'Not logged in',
    pleaseLogin: 'Please login first',
    login: 'Login',
    loading: 'Loading...',
    loginModal: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      invalidEmailOrPassword: 'Invalid email or password',
      login: 'Login',
      loggingIn: 'Logging in...',
    },
  },
  task: {
    layout: {
      simulatedDelayNotice: 'All network delays are simulated for demo purposes to showcase loading states and performance optimizations.',
      serviceMode: 'Current service:',
      modes: {
        mock: 'Mock (offline)',
        supabase: 'Supabase (online)',
      },
    },
    index: {
      title: 'Task List',
      new: 'New Task',
      noTasks: 'No tasks',
    },
    details: {
      title: 'Task Details',
      back: 'Back to List',
      loading: 'Loading...',
      notFound: 'Task not found',
    },
    new: {
      title: 'New Task',
      back: 'Back to List',
      notFound: 'Task not found',
      form: {
        title: 'Title',
        description: 'Description',
        submit: 'Submit',
      },
    },
  },
  settings: {
    title: 'Settings',
    open: 'Setting',
    language: 'Language',
    languages: {
      en: 'English',
      zh: 'Chinese',
    },
    theme: 'Theme',
    themes: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
  },
  home: {
    title: 'AI-DevKit',
    subtitle: 'AI Development Toolkit - Build Your AI Applications Fast!',
    sections: {
      introduction: {
        title: 'Project Introduction',
        description: 'A clear and extensible architecture for rapid AI application development.',
        features: {
          rapidDevelopment: 'Fast Dev',
          aiFriendly: 'For AI',
          highPerformance: 'H-PERF',
          responsive: 'RWD',
        },
      },
      quickStart: {
        title: 'Quick Start',
        command: 'cd docs-site/ && npm install && npm run dev',
        description: 'Then open <url>{{url}}</url> to view the documentation',
        url: 'localhost:5173',
      },
      examples: {
        title: 'Example Modules',
        description: 'We provide you with the task module as an example:',
        button: 'Enter Task Module 🎮',
      },
      components: {
        title: 'Component Examples',
        description: 'View reusable UI component examples and demonstrations in the project:',
        button: 'Enter Example Module 🔗',
      },
    },
    footer: {
      message: 'Ready to start your development journey?',
    },
  },
};
