// 样式兜底：ElMessage/ElMessageBox/ElLoading 服务式调用需手动引入样式
// 置于最顶部，确保先于 mount 前可能触发的 ElMessage.error 调用有样式
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/loading/style/css'
// 暗色模式 CSS 变量（全局变量定义，非组件级样式，移除会导致暗色模式变量丢失）
import 'element-plus/theme-chalk/dark/css-vars.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { ElMessage } from 'element-plus'
import 'github-markdown-css/github-markdown.css'
import App from './App.vue'
import router from './router'
import './assets/styles/index.scss'
import { db } from './utils/db'
import { setOnErrorCallback } from './utils/request'
import { useClarity } from './composables/useClarity'
import { registerIcons } from './utils/icons'

const app = createApp(App)

// 注入 UI 错误处理回调到 request 模块
setOnErrorCallback((message: string) => ElMessage.error(message))

// 注册 Pinia（含持久化插件）
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// 注册 Router
app.use(router)

// 按需注册 Element Plus 图标（动态字符串引用）
registerIcons(app)

// 初始化 IndexedDB
db.init().catch(err => {
  console.error('❌ IndexedDB 初始化失败:', err)
})

// Clarity: 仅当 VITE_CLARITY_PROJECT_ID 存在时初始化
const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID
if (clarityProjectId) {
  const { init } = useClarity()
  init(clarityProjectId)
}

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