import DefaultTheme from 'vitepress/theme'
import Mermaid from '../components/Mermaid.vue'
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // 注册 Mermaid 组件
    app.component('Mermaid', Mermaid)
  }
}
