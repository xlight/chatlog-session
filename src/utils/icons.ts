// 全量注册 Element Plus 图标
// 用于 <component :is="图标名字符串"> 动态引用场景
// IconsResolver 只解析模板中的图标组件，不解析字符串动态引用
import type { App } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export function registerIcons(app: App) {
  for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(name, component as never)
  }
}
