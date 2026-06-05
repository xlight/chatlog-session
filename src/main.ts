import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'github-markdown-css/github-markdown.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './App.vue'
import router from './router'
import './assets/styles/index.scss'
import { db } from './utils/db'
import { setOnErrorCallback } from './utils/request'

// 开发环境：导入缓存调试工具
if (import.meta.env.DEV) {
  import('./utils/debugCache').then(module => {
    module.installDebugTools()
  })
}

const app = createApp(App)

// 注入 UI 错误处理回调到 request 模块
setOnErrorCallback((message: string) => ElMessage.error(message))

// 注册 Pinia（含持久化插件）
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// 注册 Router
app.use(router)

// 注册 Element Plus
app.use(ElementPlus)

// 注册虚拟滚动
app.use(VueVirtualScroller)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 初始化 IndexedDB
db.init().catch(err => {
  console.error('❌ IndexedDB 初始化失败:', err)
})

// 挂载应用
app.mount('#app')

// 注意：已移除自动后台刷新联系人功能
// 用户可以在 Contact 视图中手动触发刷新

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('🚀 Chatlog Session v' + import.meta.env.VITE_APP_VERSION)
  console.log('📡 API Base URL:', import.meta.env.VITE_API_BASE_URL)
  console.log('🔧 Debug Mode:', import.meta.env.VITE_ENABLE_DEBUG)
}

// 页面卸载时关闭数据库
window.addEventListener('beforeunload', () => {
  db.close()
})