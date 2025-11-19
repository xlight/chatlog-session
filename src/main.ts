import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './App.vue'
import router from './router'
import './assets/styles/index.scss'
import { db } from './utils/db'

const app = createApp(App)

// 注册 Pinia
app.use(createPinia())

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

// 应用挂载后，启动后台加载联系人
import { useContactStore } from './stores/contact'
const contactStore = useContactStore()

// 延迟启动后台加载，让首屏渲染优先完成
setTimeout(() => {
  contactStore.loadContactsInBackground({
    batchSize: 50,
    batchDelay: 100,
    useCache: true,
  }).catch(err => {
    console.error('后台加载联系人失败:', err)
  })
}, 1000)

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