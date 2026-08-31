/**
 * 全局键盘快捷键
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useAppStore } from '@/stores/app'

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  key: string
  ctrlOrCmd?: boolean
  shift?: boolean
  alt?: boolean
  callback: () => void
  description?: string
}

/**
 * 使用键盘快捷键
 */
export function useKeyboardShortcuts() {
  const appStore = useAppStore()
  const shortcuts = new Map<string, ShortcutConfig>()
  const showHelp = ref(false)

  /**
   * 生成快捷键标识符
   */
  const getShortcutKey = (config: ShortcutConfig): string => {
    const parts: string[] = []
    if (config.ctrlOrCmd) parts.push('ctrl')
    if (config.shift) parts.push('shift')
    if (config.alt) parts.push('alt')
    parts.push(config.key.toLowerCase())
    return parts.join('+')
  }

  /**
   * 注册快捷键
   */
  const register = (config: ShortcutConfig) => {
    const key = getShortcutKey(config)
    shortcuts.set(key, config)
  }

  /**
   * 注销快捷键
   */
  const unregister = (config: ShortcutConfig) => {
    const key = getShortcutKey(config)
    shortcuts.delete(key)
  }

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    // 忽略在输入框、文本域等元素中的快捷键
    const target = event.target as HTMLElement
    const tagName = target.tagName.toLowerCase()
    const isEditable = target.isContentEditable

    if (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isEditable
    ) {
      // 只允许某些全局快捷键在输入框中工作（如 Cmd+K）
      const allowedInInput = ['k', 'f']
      if (!allowedInInput.includes(event.key.toLowerCase())) {
        return
      }
    }

    // 构建当前按键组合
    const parts: string[] = []

    // 检测 Ctrl (Windows/Linux) 或 Cmd (Mac)
    if (event.ctrlKey || event.metaKey) {
      parts.push('ctrl')
    }

    if (event.shiftKey) {
      parts.push('shift')
    }

    if (event.altKey) {
      parts.push('alt')
    }

    parts.push(event.key.toLowerCase())

    const currentKey = parts.join('+')

    // 查找匹配的快捷键
    const shortcut = shortcuts.get(currentKey)

    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      shortcut.callback()
    }
  }

  /**
   * 注册默认快捷键
   */
  const registerDefaultShortcuts = () => {

    // Cmd/Ctrl + /: 打开搜索
    register({
      key: '/',
      ctrlOrCmd: true,
      description: '打开搜索',
      callback: () => {
        appStore.setActiveNav('search')
      }
    })

    // Cmd/Ctrl + ,: 打开设置
    register({
      key: ',',
      ctrlOrCmd: true,
      description: '打开设置',
      callback: () => {
        appStore.setActiveNav('settings')
      }
    })

    // Esc: 返回（移动端）
    register({
      key: 'Escape',
      description: '返回',
      callback: () => {
        if (appStore.isMobile && appStore.canNavigateBack()) {
          appStore.navigateBack()
        }
      }
    })

    // ?: 显示快捷键帮助
    register({
      key: '?',
      ctrlOrCmd: true,
      description: '显示快捷键帮助',
      callback: () => {
        showHelp.value = true
      }
    })
  }

  /**
   * 初始化
   */
  onMounted(() => {
    registerDefaultShortcuts()
    // useEventListener 自动在组件卸载时清理
    useEventListener(window, 'keydown', handleKeyDown)
  })

  /**
   * 清理
   */
  onUnmounted(() => {
    shortcuts.clear()
  })

  return {
    register,
    unregister,
    shortcuts: Array.from(shortcuts.values()),
    showHelp
  }
}

/**
 * 获取快捷键显示文本
 */
export function getShortcutDisplay(config: ShortcutConfig): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const parts: string[] = []

  if (config.ctrlOrCmd) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }

  if (config.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }

  if (config.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  // 特殊键显示
  const keyMap: Record<string, string> = {
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    'Backspace': '⌫',
    'Delete': 'Del',
    ' ': 'Space'
  }

  const displayKey = keyMap[config.key] || config.key.toUpperCase()
  parts.push(displayKey)

  return parts.join(isMac ? '' : '+')
}
