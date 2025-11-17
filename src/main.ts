import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/styles/index.scss'

const app = createApp(App)

// 注册 Pinia
app.use(createPinia())

// 注册 Router
app.use(router)

// 注册 Element Plus
app.use(ElementPlus)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 挂载应用
app.mount('#app')

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('🚀 Chatlog Session v' + import.meta.env.VITE_APP_VERSION)
  console.log('📡 API Base URL:', import.meta.env.VITE_API_BASE_URL)
  console.log('🔧 Debug Mode:', import.meta.env.VITE_ENABLE_DEBUG)
}