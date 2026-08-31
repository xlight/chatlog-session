import { Component } from 'vue'

// 从 config 派生组件注册表（config 为单一事实源）
import { MESSAGE_TYPE_CONFIGS } from './config'

/**
 * 消息类型组件注册表
 * 由 config 派生：从 MESSAGE_TYPE_CONFIGS 的 component 引用构建 name → Component 映射
 * @deprecated 直接使用 config.component 获取组件引用替代。此映射表仅保留供 __test-config__.ts 统计使用。
 */
export const MESSAGE_COMPONENT_REGISTRY: Record<string, Component> = Object.fromEntries(
  MESSAGE_TYPE_CONFIGS.map(c => {
    const component = c.component as unknown as { name?: string } & Component
    // Vue 组件通常有 name 属性；若无则用 config.name 作为 key
    const key = component.name || c.name
    return [key, c.component]
  })
)

/**
 * 根据组件名称获取组件
 * @deprecated 使用 config 直接获取组件引用替代。计划在后续清理 change 中移除。
 */
export function getMessageComponent(componentName: string): Component | undefined {
  return MESSAGE_COMPONENT_REGISTRY[componentName]
}

/**
 * 检查组件是否已注册
 * @deprecated 使用 config 直接获取组件引用替代。计划在后续清理 change 中移除。
 */
export function isComponentRegistered(componentName: string): boolean {
  return componentName in MESSAGE_COMPONENT_REGISTRY
}
