/**
 * @file i18n.ts
 * @description Minimal in-repo i18n for the landing page. Two locales,
 * one strongly-typed dictionary, one hook.
 *
 * We deliberately don't pull in i18next here — the landing only has ~30
 * strings, no plurals, no nested namespaces, and no need for lazy
 * loading. A typed dictionary + a memoised lookup hook beats a full
 * runtime for this surface.
 *
 * The previewed template (`template-react`) has its own i18next setup
 * which is unrelated to and unaffected by this module (decision A in
 * the design plan: no iframe coupling).
 */

import { useCallback } from 'react';

import { DEFAULT_LANG, type Lang, SUPPORTED_LANGS, isLang } from './lang';
import { useThemeStore } from './theme-store';

// Re-exported for backward compatibility — most consumers import
// these directly from `theme/i18n`. The actual definitions live in
// `./lang` (a leaf module with no React/zustand imports) so the
// `theme-store` ↔ `i18n` import cycle never sees them mid-init.
// See `theme/lang.ts` for the full rationale.
export { DEFAULT_LANG, SUPPORTED_LANGS, isLang };
export type { Lang };

/**
 * Native (self-)labels for the language dropdown. Each language is
 * displayed in its own script so users don't need to read the current
 * language to find their own — a "中文" / "English" pair is universally
 * recognisable.
 */
export const LANG_LABELS: Record<Lang, string> = {
  zh: '简体中文',
  en: 'English',
};

/**
 * String dictionary. Adding a new key here is enforced by the literal
 * type below — every locale must provide it. Keys are dotted only for
 * readability; we do NOT use them as paths (no runtime split).
 */
const DICT = {
  zh: {
    'nav.home': '首页',
    'nav.changelog': '更新日志',
    'nav.playground': 'Playground',
    'nav.toggleTheme': '切换主题',
    'nav.language': '语言',
    'nav.github': 'GitHub',

    'hero.badge': 'v1.0.0 · React 19 · Vite 6',
    'hero.title.line1': '每一个伟大的产品，',
    'hero.title.line2Prefix': '都从',
    'hero.title.highlight': '同一段 Prompt',
    'hero.title.line2Suffix': ' 开始',
    'hero.subtitle':
      '一套预制好的项目骨架 + 技术栈 + AI 配置 + 质量标准 + 通用模块，让 AI 从「配环境」直接进入「写需求」。',
    'hero.cta.primary': '去找找',
    'hero.findIt': 'GitHub',

    'platform.eyebrow': '交付形态',
    'platform.title': '一份代码，三种交付形态',
    'platform.subtitle': '选一个目标，自动给你对应的部署链路与脚本',
    'platform.keyboardHint': '方向键切换目标',
    'platform.selectedBadge': '当前选中',
    'platform.web.title': 'Web',
    'platform.web.desc': 'Browser · 浏览器原生体验',
    'platform.desktop.title': 'Desktop',
    'platform.desktop.desc': 'Tauri 2 · 跨平台桌面应用',
    'platform.mobile.title': 'Mobile',
    'platform.mobile.desc': 'Capacitor · iOS & Android',

    'playground.eyebrow': '在线试玩',
    'params.title': '配置你的技术栈',
    'params.subtitle': '所有选项都会即时反映到下方预览与命令中',
    'params.section.product': '产品形态',
    'params.section.feature': '功能开关',
    'params.section.tooling': '工具链',
    'params.sentence.prefix': '一个',
    'params.sentence.layoutSuffix': '布局的应用，',
    'params.sentence.designPrefix': '采用',
    'params.sentence.designSuffix': '风格，',
    'params.sentence.uiPrefix': '搭配',
    'params.sentence.uiSuffix': '组件',
    'params.sentence.toastPrefix': '和',
    'params.sentence.toastSuffix': '通知，',
    'params.sentence.pmPrefix': '使用',
    'params.sentence.pmSuffix': '安装',

    'playgroundPage.targetTitle': '目标平台',
    'playgroundPage.paramsTitle': '我想要…',
    'playgroundPage.promptTitle': '复制 Prompt / CLI',

    'sidebar.controlsLabel': '控制台',
    'sidebar.expand': '展开参数面板',
    'sidebar.collapse': '收起面板',
    'sidebar.openAndPin': '展开并固定',
    'sidebar.pin': '固定面板',
    'sidebar.unpin': '取消固定',
    'sidebar.close': '关闭',
    'sidebar.jumpTo': '跳转到',
    'sidebar.sectionsNav': '面板分区导航',

    'prompt.title': '复制以下内容，立即开始',
    'prompt.subtitle': '把它喂给 Cursor / Claude / Codex，剩下交给 AI',
    'prompt.tab.prompt': 'Prompt',
    'prompt.tab.cli': 'CLI',
    'prompt.copy': '复制',
    'prompt.copied': '已复制',
    'prompt.copyFailed': '复制失败',

    'stack.eyebrow': '技术栈',
    'stack.title': '内置的完整技术栈',
    'stack.subtitle': '主流、稳定、AI 友好 —— 拿来就能用',
    'stack.tier.core': '核心运行时',
    'stack.tier.state': '状态与数据',
    'stack.tier.quality': '质量与测试',
    'stack.tier.platform': '跨端与基础设施',

    'pain.eyebrow': '痛点',
    'pain.title': '为什么需要它',
    'pain.subtitle': '把 AI 协作中每次都要重复折腾的问题，一次解决',
    'pain.1.title': '每次配项目都从零开始',
    'pain.1.desc':
      '别再让 AI 从 vite init 开始问你要不要 TypeScript —— 脚手架已经把项目结构、依赖、scripts 全部预设好。',
    'pain.2.title': '技术栈选型反复纠结',
    'pain.2.desc':
      '6 套 design preset × 多种布局 × UI 库 / Toast 风格，所有取舍都做过验证，可以直接选定。',
    'pain.3.title': '通用模块容易漏配',
    'pain.3.desc':
      'i18n、主题、弹窗、响应式、Toast、表单、状态管理、错误边界 —— 全部内置，再不用半夜调 i18next。',
    'pain.4.title': 'AI 不知道你的项目标准',
    'pain.4.desc':
      '.agent/rules 与 .agent/skills 已写好架构约束、命名规范、测试要求，AI 一加载即对齐你的口味。',

    'toil.eyebrow': '真实痛点',
    'toil.title': '别再为糟糕的架构，一句句「请继续」',
    'toil.lead':
      '你有没有过这样的深夜：让 agent 跑了一个多小时，你却只能一遍遍地敲下「请继续」。不是它不够努力——而是项目从一开始就缺少架构约束与工程规范，它只能边打地基边盖楼，反复返工。',
    'toil.plea.label': '作者的良苦用心',
    'toil.plea.body':
      '每一次「请继续」，烧掉的都是你的 token 和时间。下载这个项目，让你的工程底座本身足够优秀——把 agent 的专注力还给真正的业务需求，而不是从零维护项目质量。',
    'toil.plea.kicker': '省点 token，省点时间。这，很重要。',
    'toil.caption':
      '搭好了、又发现设计缺陷、于是再一次「请继续」——这一个多小时，本可以花在你的业务上。',

    'toil.demo.aria': 'AI 编码 agent 已运行一个多小时、用户反复输入「请继续」的演示动画',
    'toil.demo.agent': 'Coding Agent',
    'toil.demo.elapsed': '{h}h {m}m',
    'toil.demo.tokens': '{n}M tokens',
    'toil.demo.user': '帮我从零做一个跨端应用，注意代码质量',
    'toil.demo.done1': '已搭建项目骨架与目录结构',
    'toil.demo.done2': '已接入 ESLint / Prettier / Vitest',
    'toil.demo.done3': '已补齐错误边界、类型与状态管理',
    'toil.demo.done4': '质量保证：测试覆盖率 87%，构建通过',
    'toil.demo.quality': 'build ✓  ·  tests 87%  ·  lint clean',
    'toil.demo.question':
      '不过我发现当前的设计模式仍存在一个架构缺陷，需要重构数据层才能彻底修复。是否继续落地？',
    'toil.demo.placeholder': '要求后续变更…',
    'toil.demo.reply': '请继续',

    'philosophy.title': '一些技术取舍',
    'philosophy.subtitle': '工程化偏好 —— 为什么是这套，而不是别的',
    'philosophy.intro':
      '这套模板代表了我做产品的偏好：先快速能跑起来，再保留可扩展的边界。它故意没有选「最潮」的方案，而是选「踩坑最少、可维护性最高、AI 最容易理解」的组合。',
    'philosophy.points.1.title': 'Vite 而不是 Next.js',
    'philosophy.points.1.desc':
      '前期不需要 SSR/SSG，Vite 启动更快、配置更透明、跨端打包友好。需要全栈再升级。',
    'philosophy.points.2.title': 'Zustand 而不是 Redux',
    'philosophy.points.2.desc':
      '心智负担低，API 直观，hook 和 vanilla 双形态满足组件内 + 跨边界场景。',
    'philosophy.points.3.title': 'Tailwind v4 CSS-first',
    'philosophy.points.3.desc':
      '无需 tailwind.config，token 写在 @theme 块里，AI 读得懂，重构更轻。',
    'philosophy.points.4.title': '特性优先架构',
    'philosophy.points.4.desc':
      'src/features/<name>/ 一切自治，跨 feature 只能从 barrel 进入 —— 团队和 AI 都不容易越界。',

    'outputs.title': '一份源码，三种交付',
    'outputs.subtitle': '同一套 React + TS 代码，按需打包为 Web 站点、桌面应用或移动 App',
    'outputs.web.title': 'Web 应用',
    'outputs.web.desc':
      '部署到 Vercel / Cloudflare Pages / 自建静态托管。SEO 友好、PWA 可选、CDN 即享。',
    'outputs.web.bullet1': 'Vite + React 19 + TypeScript',
    'outputs.web.bullet2': '静态部署，秒级冷启动',
    'outputs.web.bullet3': '可选 SSR（升级为 Next.js 路径已留好）',
    'outputs.desktop.title': '桌面应用',
    'outputs.desktop.desc': 'Tauri 2 框架，Rust 内核，体积比 Electron 小 90%，原生窗口与系统集成。',
    'outputs.desktop.bullet1': 'macOS / Windows / Linux',
    'outputs.desktop.bullet2': '5MB 量级安装包',
    'outputs.desktop.bullet3': '原生菜单 / 托盘 / 自动更新',
    'outputs.mobile.title': '移动应用',
    'outputs.mobile.desc':
      'Capacitor 框架封装为 iOS / Android，Web 代码原样复用，原生能力按需开放。',
    'outputs.mobile.bullet1': 'iOS / Android',
    'outputs.mobile.bullet2': 'Web 视图 + 原生桥',
    'outputs.mobile.bullet3': '原生相机 / 推送 / 文件系统',
    'outputs.tryNow': '试试这个平台 →',

    'qa.eyebrow': '支持',
    'qa.title': '常见问题',
    'qa.subtitle': '上手前你可能会问的事',
    'qa.contact.text':
      '没找到你想要的答案？直接给作者发邮件，平均 24 小时内回复。……或者……为什么不直接问问你的 AI？',
    'qa.contact.cta': '联系作者',
    'qa.1.q': '和 create-next-app / create-t3-app 有什么区别？',
    'qa.1.a':
      'Next/T3 更偏全栈框架；Eikon-React 偏「跨端 + AI 工程化」 —— 同一份源码可打包到 Web / Desktop (Tauri) / Mobile (Capacitor)，并自带 .agent/ 规则给 AI 加载。如果你只做 Web 全栈，T3 是更合适的选择；如果你想跨端发布或重度用 AI 协作，这套更顺手。',
    'qa.2.q': '为什么选 Vite 不选 Next.js / Remix？',
    'qa.2.a':
      'Vite 的启动速度、配置透明度、跨端打包友好度对独立开发更友好。Eikon-React 默认是纯 CSR，没有 SSR/SSG 的复杂度。如果将来需要 SSR，可以升级到 Next.js 或 Astro，目前的 feature 结构和 store 都已为此预留迁移空间。',
    'qa.3.q': 'Tauri 2 和 Electron 我该用哪个？',
    'qa.3.a':
      '默认推荐 Tauri 2：体积小、冷启动快、内存占用低，Rust 安全模型也更适合现代产品。Electron 的优势是生态更成熟、调试更熟悉 —— 如果你需要大量已有 Node 生态包，再考虑切换。',
    'qa.4.q': '.agent/ 目录具体做了什么？',
    'qa.4.a':
      '它是一份「AI 协作协议」：rules/ 是不可越界的工程约束（架构、测试、i18n、命名），skills/ 是可调用的任务手册（add-feature、add-page、enable-supabase 等）。任何能读文件的 AI 工具加载它后，给你写代码就会自动遵守这些约定。',
    'qa.5.q': '可以商用 / 闭源使用吗？',
    'qa.5.a':
      '可以。模板基于 MIT 协议，scaffolded 出去的项目归你所有，无须保留来源说明（虽然 star 一下会让我开心）。',
    'qa.6.q': '如何升级到新版本？',
    'qa.6.a':
      '推荐使用 git diff 对比 changelog 里的版本变动，把你需要的改动 cherry-pick 进现有项目。模板本身不强求版本一致 —— 它是一份起点，不是依赖。',
    'qa.7.q': '为什么组件示例里没有代码用法？',
    'qa.7.a':
      '刻意没放。组件的 API、props、组合方式都写在 .agent/ 里 —— 你的 Coding Agent 加载之后自己就看得懂、自己会用。你只需要描述「我想要一个什么样的页面」，剩下「调哪个组件、怎么 import、传什么参数」交给它。把脑容量留给真正属于你的需求。',

    'footer.author': 'fmw · 独立开发者',
    'footer.tagline': '偏 AI · 前端 · 跨端工程化',
    'footer.contactHint': '有任何问题，欢迎直接联系作者',
    'footer.huntTitle': '找一找那朵藏起来的花',
    'footer.copyright': '© 2026 Eikon-React',
    'footer.explore': '探索',
    'footer.connect': '联系',
    'footer.madeWith': '用 React 19 · Vite 6 · Tailwind v4 精心打磨',
    'footer.live': '在线运转中',
    'footer.backToTop': '回到顶部',

    'changelog.comingSoon': '更新日志即将上线',
    'changelog.back': '← 返回首页',

    'changelog.eyebrow': '版本对比',
    'changelog.title': '更新日志',
    'changelog.subtitle': '从 GitHub 实时拉取每个 Tag 的发行包，并以左右双侧版本可视化代码差异。',
    'changelog.picker.base': '基线',
    'changelog.picker.head': '目标',
    'changelog.picker.refresh': '刷新',
    'changelog.compare.loading': '正在加载差异…',
    'changelog.compare.identical': '所选两个版本完全一致。',
    'changelog.compare.pick': '请选择左右两侧的版本。',
    'changelog.compare.files': '个文件变更',
    'changelog.compare.commits': '次提交',
    'changelog.compare.viewOnGithub': '在 GitHub 上查看',
    'changelog.notes.title': '发行说明 ·',
    'changelog.notes.openOnGithub': '在 GitHub 上打开',
    'changelog.error.title': '无法加载版本数据',
    'changelog.error.retry': '重试',
    'changelog.error.rateLimitUntil': '请求被限流，预计恢复时间：',
    'changelog.empty.title': '该仓库暂无发布版本',
    'changelog.empty.subtitle': '一旦在 GitHub 上发布带 Tag 的 Release，更新日志会自动出现在这里。',
    'changelog.empty.missingTitle': '找不到这个 GitHub 仓库',
    'changelog.empty.missingSubtitle':
      '在 src/landing/site-config.ts 里把 owner / repo 改成你实际的公开仓库（私有仓库匿名访问会拿到相同的 404）。',
    'changelog.empty.cta': '前往 GitHub 仓库 →',

    'changelog.demo.title': '演示数据',
    'changelog.demo.subtitle':
      '这是一份内置的样例 diff，用于展示完整的版本对比能力。配置好真实仓库后会自动切换为线上数据 ——',
  },
  en: {
    'nav.home': 'Home',
    'nav.changelog': 'Changelog',
    'nav.playground': 'Playground',
    'nav.toggleTheme': 'Toggle theme',
    'nav.language': 'Language',
    'nav.github': 'GitHub',

    'hero.badge': 'v1.0.0 · React 19 · Vite 6',
    'hero.title.line1': 'Every great product',
    'hero.title.line2Prefix': 'starts with ',
    'hero.title.highlight': 'the same prompt',
    'hero.title.line2Suffix': '',
    'hero.subtitle':
      'A pre-baked project skeleton + stack + AI rules + quality system + shared modules, so your AI agent jumps from "setup" straight to "ship".',
    'hero.cta.primary': 'go find it',
    'hero.findIt': 'GitHub',

    'platform.eyebrow': 'Shipping shapes',
    'platform.title': 'One codebase, three shipping shapes',
    'platform.subtitle': 'Pick a target and get its deploy path + scripts',
    'platform.keyboardHint': 'switch with arrow keys',
    'platform.selectedBadge': 'Selected',
    'platform.web.title': 'Web',
    'platform.web.desc': 'Browser · native web experience',
    'platform.desktop.title': 'Desktop',
    'platform.desktop.desc': 'Tauri 2 · cross-platform desktop',
    'platform.mobile.title': 'Mobile',
    'platform.mobile.desc': 'Capacitor · iOS & Android',

    'playground.eyebrow': 'Live playground',
    'params.title': 'Configure your stack',
    'params.subtitle': 'Every choice updates the preview and the command in real time',
    'params.section.product': 'Product shape',
    'params.section.feature': 'Features',
    'params.section.tooling': 'Tooling',
    'params.sentence.prefix': 'A',
    'params.sentence.layoutSuffix': 'app with',
    'params.sentence.designPrefix': '',
    'params.sentence.designSuffix': 'design,',
    'params.sentence.uiPrefix': '',
    'params.sentence.uiSuffix': 'components,',
    'params.sentence.toastPrefix': '',
    'params.sentence.toastSuffix': 'toasts',
    'params.sentence.pmPrefix': '— install via',
    'params.sentence.pmSuffix': '',

    'playgroundPage.targetTitle': 'Target',
    'playgroundPage.paramsTitle': 'I want…',
    'playgroundPage.promptTitle': 'Copy Prompt / CLI',

    'sidebar.controlsLabel': 'Controls',
    'sidebar.expand': 'Expand parameters panel',
    'sidebar.collapse': 'Collapse panel',
    'sidebar.openAndPin': 'Open and pin',
    'sidebar.pin': 'Pin panel',
    'sidebar.unpin': 'Unpin panel',
    'sidebar.close': 'Close',
    'sidebar.jumpTo': 'Jump to',
    'sidebar.sectionsNav': 'Panel sections',

    'prompt.title': 'Copy this, start now',
    'prompt.subtitle': 'Paste it into Cursor / Claude / Codex — let your AI take the rest',
    'prompt.tab.prompt': 'Prompt',
    'prompt.tab.cli': 'CLI',
    'prompt.copy': 'Copy',
    'prompt.copied': 'Copied!',
    'prompt.copyFailed': 'Copy failed',

    'stack.eyebrow': 'Stack',
    'stack.title': 'A full stack, batteries included',
    'stack.subtitle': 'Mainstream, stable, AI-friendly — pick it up and start shipping',
    'stack.tier.core': 'Core runtime',
    'stack.tier.state': 'State & data',
    'stack.tier.quality': 'Quality & testing',
    'stack.tier.platform': 'Cross-platform & infra',

    'pain.eyebrow': 'Pain Points',
    'pain.title': 'Why you might want this',
    'pain.subtitle': "Solve the things you'd otherwise re-fight with your AI every project",
    'pain.1.title': 'Configuring from scratch every time',
    'pain.1.desc':
      "Stop letting your AI start from 'do you want TypeScript?'. The scaffold already encodes structure, deps, and scripts.",
    'pain.2.title': 'Endless stack-selection debates',
    'pain.2.desc':
      '6 design presets × multiple layouts × UI libs × toast styles — all the tradeoffs are pre-decided so you can just pick.',
    'pain.3.title': 'Shared modules silently missed',
    'pain.3.desc':
      'i18n, theming, modals, responsive, toast, forms, state, error boundaries — all wired. No more midnight i18next debugging.',
    'pain.4.title': "Your AI doesn't know your standards",
    'pain.4.desc':
      '.agent/rules and .agent/skills encode architecture, naming, tests — your AI matches your conventions the moment it loads them.',

    'toil.eyebrow': 'The real cost',
    'toil.title': 'Stop paying for bad architecture, one "please continue" at a time',
    'toil.lead':
      'Ever spent a whole night watching your agent run for over an hour — while you do nothing but type "please continue" again and again? It isn\'t that it\'s slacking. The project simply had no architectural constraints or engineering standards to begin with, so it keeps pouring the foundation while building the walls, redoing the same work over and over.',
    'toil.plea.label': 'Why I built this',
    'toil.plea.body':
      'Every "please continue" burns your tokens and your hours. Download this project and start from an engineering base that\'s already good — so your agent spends its focus on the actual product, not on babysitting the quality of a from-scratch scaffold.',
    'toil.plea.kicker': 'Save the tokens. Save the time. It matters.',
    'toil.caption':
      'Build, find another flaw, "continue" again — that hour could\'ve gone to your product.',

    'toil.demo.aria':
      'Animated demo: an AI coding agent that has run for over an hour while the user keeps typing "please continue"',
    'toil.demo.agent': 'Coding Agent',
    'toil.demo.elapsed': '{h}h {m}m',
    'toil.demo.tokens': '{n}M tokens',
    'toil.demo.user': 'Build me a cross-platform app from scratch — keep the code quality high',
    'toil.demo.done1': 'Scaffolded the project structure & folders',
    'toil.demo.done2': 'Wired ESLint / Prettier / Vitest',
    'toil.demo.done3': 'Added error boundaries, types & state management',
    'toil.demo.done4': 'Quality pass: 87% test coverage, build green',
    'toil.demo.quality': 'build ✓  ·  tests 87%  ·  lint clean',
    'toil.demo.question':
      'That said, the current design pattern still has an architectural flaw — fixing it properly means refactoring the data layer. Want me to continue?',
    'toil.demo.placeholder': 'Request a change…',
    'toil.demo.reply': 'please continue',

    'philosophy.title': 'A few engineering choices',
    'philosophy.subtitle': 'Why this stack, not the trendiest one',
    'philosophy.intro':
      "This template reflects how I ship products: get something running fast, leave room to grow. It deliberately picks the 'fewest landmines, easiest to maintain, easiest for AI to understand' combination — not the shiniest one.",
    'philosophy.points.1.title': 'Vite, not Next.js',
    'philosophy.points.1.desc':
      'You rarely need SSR/SSG on day one. Vite starts faster, configures clearer, and packages cross-platform cleaner. Upgrade later if needed.',
    'philosophy.points.2.title': 'Zustand, not Redux',
    'philosophy.points.2.desc':
      'Lower mental tax, intuitive API, hook + vanilla flavours cover both in-component and cross-boundary cases.',
    'philosophy.points.3.title': 'Tailwind v4 CSS-first',
    'philosophy.points.3.desc':
      'No tailwind.config — tokens live in @theme. AI reads it without ambiguity, refactors stay shallow.',
    'philosophy.points.4.title': 'Feature-first architecture',
    'philosophy.points.4.desc':
      'Each src/features/<name>/ is autonomous; cross-feature access only via the barrel — humans and AI both stay inside the lines.',

    'outputs.title': 'One codebase, three shipping shapes',
    'outputs.subtitle':
      'Same React + TS code packs into a web site, desktop app, or mobile app on demand',
    'outputs.web.title': 'Web app',
    'outputs.web.desc':
      'Deploy to Vercel / Cloudflare Pages / your own static host. SEO-friendly, PWA-optional, CDN by default.',
    'outputs.web.bullet1': 'Vite + React 19 + TypeScript',
    'outputs.web.bullet2': 'Static deploy, instant cold-start',
    'outputs.web.bullet3': 'Optional SSR (Next.js upgrade path reserved)',
    'outputs.desktop.title': 'Desktop app',
    'outputs.desktop.desc':
      'Tauri 2 framework, Rust core. 90% smaller than Electron, native windows and system integration.',
    'outputs.desktop.bullet1': 'macOS / Windows / Linux',
    'outputs.desktop.bullet2': '~5MB installer',
    'outputs.desktop.bullet3': 'Native menu / tray / auto-update',
    'outputs.mobile.title': 'Mobile app',
    'outputs.mobile.desc':
      'Capacitor wraps it as iOS / Android. Reuse your web code as-is, open native APIs on demand.',
    'outputs.mobile.bullet1': 'iOS / Android',
    'outputs.mobile.bullet2': 'Web view + native bridge',
    'outputs.mobile.bullet3': 'Native camera / push / filesystem',
    'outputs.tryNow': 'Try this target →',

    'qa.eyebrow': 'Support',
    'qa.title': 'FAQ',
    'qa.subtitle': 'Things you might ask before getting started',
    'qa.contact.text':
      "Can't find the answer you're looking for? Email the author directly — usually a reply within 24 hours. … or … why not just ask your AI?",
    'qa.contact.cta': 'Contact author',
    'qa.1.q': 'How is this different from create-next-app / create-t3-app?',
    'qa.1.a':
      'Next/T3 lean full-stack-web. Eikon-React leans cross-platform + AI workflow — one codebase ships to Web / Desktop (Tauri) / Mobile (Capacitor) and the .agent/ rules teach your AI your conventions. If you only ship web full-stack, T3 fits better; if you want cross-platform and AI-heavy collaboration, this is the more direct path.',
    'qa.2.q': 'Why Vite over Next.js / Remix?',
    'qa.2.a':
      "Vite's startup speed, configuration clarity, and cross-platform packaging are friendlier for indie work. Eikon-React is pure CSR by default — no SSR/SSG complexity. The feature structure and stores are designed so you can migrate to Next.js or Astro later if you need SSR.",
    'qa.3.q': 'Tauri 2 vs Electron — which should I use?',
    'qa.3.a':
      "Default is Tauri 2: smaller, faster, less memory, Rust's safety model fits modern products. Electron's advantage is ecosystem maturity and familiar debugging — only switch if you depend on existing Node packages.",
    'qa.4.q': 'What does the .agent/ directory actually do?',
    'qa.4.a':
      "It's an AI-collaboration protocol. rules/ are non-negotiable engineering constraints (architecture, tests, i18n, naming); skills/ are callable task playbooks (add-feature, add-page, enable-supabase, etc.). Any file-aware AI agent that loads it will follow these conventions automatically.",
    'qa.5.q': 'Commercial / closed-source use?',
    'qa.5.a':
      'Allowed. Template is MIT-licensed. Scaffolded projects belong to you; no attribution required (a star would still make my day).',
    'qa.6.q': 'How do I upgrade to a new version?',
    'qa.6.a':
      'Diff against the changelog and cherry-pick the deltas you care about. The template is a starting point, not a dependency — version drift is expected.',
    'qa.7.q': "Why don't the component demos show usage code?",
    'qa.7.a':
      'Intentionally omitted. Component APIs, props, and composition patterns all live in .agent/ — once your coding agent loads them, it knows what to call, what to import, and what to pass in. You describe the page you want; spend your attention on the requirement, not on copying imports from a demo.',

    'footer.author': 'fmw · indie developer',
    'footer.tagline': 'AI · frontend · cross-platform tooling',
    'footer.contactHint': 'Questions? Reach out anytime.',
    'footer.huntTitle': 'Find the hidden flower',
    'footer.copyright': '© 2026 Eikon-React',
    'footer.explore': 'Explore',
    'footer.connect': 'Connect',
    'footer.madeWith': 'Crafted with React 19 · Vite 6 · Tailwind v4',
    'footer.live': 'Online & live',
    'footer.backToTop': 'Back to top',

    'changelog.comingSoon': 'Changelog is on the way',
    'changelog.back': '← Back to home',

    'changelog.eyebrow': 'Version compare',
    'changelog.title': 'Changelog',
    'changelog.subtitle':
      'Pulled from GitHub releases in real time. Pick a left and a right version to see the diff.',
    'changelog.picker.base': 'Base',
    'changelog.picker.head': 'Head',
    'changelog.picker.refresh': 'Refresh',
    'changelog.compare.loading': 'Loading diff…',
    'changelog.compare.identical': 'These two versions are identical.',
    'changelog.compare.pick': 'Pick a base and a head version.',
    'changelog.compare.files': 'changed files',
    'changelog.compare.commits': 'commits',
    'changelog.compare.viewOnGithub': 'View on GitHub',
    'changelog.notes.title': 'Release notes ·',
    'changelog.notes.openOnGithub': 'Open on GitHub',
    'changelog.error.title': 'Failed to load version data',
    'changelog.error.retry': 'Retry',
    'changelog.error.rateLimitUntil': 'Rate-limited until',
    'changelog.empty.title': 'No releases yet',
    'changelog.empty.subtitle': 'Tag a Release on GitHub and it will show up here automatically.',
    'changelog.empty.missingTitle': "Couldn't find that GitHub repo",
    'changelog.empty.missingSubtitle':
      'Update owner / repo in src/landing/site-config.ts to point at your real public repository (private repos return the same 404 anonymously).',
    'changelog.empty.cta': 'Open the GitHub repo →',

    'changelog.demo.title': 'Demo data',
    'changelog.demo.subtitle':
      "This is a built-in example diff so you can see the full compare experience. Wire up a real repo and it'll switch to live data automatically —",
  },
} as const;

export type I18nKey = keyof (typeof DICT)['zh'];

/**
 * Compile-time guard: every key present in `zh` must also be present in
 * `en`. If you add a key to one and forget the other, TypeScript will
 * complain at this line. We assert via a phantom assignment so the
 * check has zero runtime cost.
 */
const _enParity: Record<I18nKey, string> = DICT.en;
void _enParity;

/**
 * Subscribe to `lang` once and return a stable `t()` function. The hook
 * is intentionally tiny: callers receive a memoised lookup so they don't
 * need to remember to memoise it themselves to avoid child re-renders.
 */
export function useI18n(): {
  lang: Lang;
  t: (key: I18nKey) => string;
} {
  const lang = useThemeStore((s) => s.lang);
  const t = useCallback(
    (key: I18nKey): string => {
      const table = DICT[lang];
      return table[key] ?? DICT[DEFAULT_LANG][key] ?? key;
    },
    [lang]
  );
  return { lang, t };
}
