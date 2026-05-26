/**
 * useAppStore 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useAppStore } from '@/stores/app'

function createStore() {
  return useAppStore(
    createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    })
  )
}

describe('useAppStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  // ==================== 默认状态 ====================

  describe('默认状态', () => {
    it('config 从环境变量读取默认值', () => {
      expect(store.config.title).toBe('Chatlog Session')
      expect(store.config.version).toBe('dev')
      expect(store.config.apiBaseUrl).toBe('http://127.0.0.1:5030')
      expect(store.config.enableDebug).toBe(false)
      expect(store.config.enableMock).toBe(false)
    })

    it('config 包含 pageSize 和 maxPageSize', () => {
      expect(store.config.pageSize).toBe(500)
      expect(store.config.maxPageSize).toBe(5000)
    })

    it('config 包含 apiTimeout', () => {
      expect(store.config.apiTimeout).toBe(30000)
    })

    it('settings 默认值', () => {
      expect(store.settings).toEqual({
        fontSize: 'medium',
        messageDensity: 'comfortable',
        enterToSend: true,
        autoPlayVoice: false,
        showMessagePreview: true,
        timeFormat: '24h',
      })
    })

    it('loading 初始状态全为 false', () => {
      expect(store.loading.app).toBe(false)
      expect(store.loading.sessions).toBe(false)
      expect(store.loading.messages).toBe(false)
      expect(store.loading.contacts).toBe(false)
      expect(store.loading.search).toBe(false)
      expect(store.loading.history).toBe(false)
    })

    it('sidebarCollapsed 默认为 false', () => {
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('isMobile 默认为 false (jsdom 宽度 > 768)', () => {
      expect(store.isMobile).toBe(false)
    })

    it('activeNav 默认为 chat', () => {
      expect(store.activeNav).toBe('chat')
    })

    it('navigationStack 默认包含 sessionList', () => {
      expect(store.navigationStack).toEqual([{ view: 'sessionList' }])
    })

    it('error 默认为 null', () => {
      expect(store.error).toBeNull()
    })
  })

  // ==================== Loading 状态 ====================

  describe('加载状态管理', () => {
    it('setLoading 设置指定 key', () => {
      store.setLoading('app', true)
      expect(store.loading.app).toBe(true)

      store.setLoading('messages', true)
      expect(store.loading.messages).toBe(true)
    })

    it('setLoading 恢复为 false', () => {
      store.setLoading('sessions', true)
      expect(store.loading.sessions).toBe(true)

      store.setLoading('sessions', false)
      expect(store.loading.sessions).toBe(false)
    })
  })

  // ==================== Navigation stack ====================

  describe('导航栈管理', () => {
    it('push 导航栈', () => {
      const item = { view: 'messageList' as const, params: { sessionId: 'abc' } }
      store.navigationStack.push(item)
      expect(store.navigationStack).toHaveLength(2)
      expect(store.navigationStack[1]).toEqual(item)
    })

    it('pop 导航栈', () => {
      store.navigationStack.push({ view: 'messageList' as const })
      const popped = store.navigationStack.pop()
      expect(popped?.view).toBe('messageList')
      expect(store.navigationStack).toHaveLength(1)
    })

    it('resetMobileNavigation 重置导航栈', () => {
      store.navigationStack.push({ view: 'messageList' as const })
      store.navigationStack.push({ view: 'contactDetail' as const })
      store.resetMobileNavigation()
      expect(store.navigationStack).toEqual([{ view: 'sessionList' }])
      expect(store.showMessageList).toBe(false)
      expect(store.showContactDetail).toBe(false)
    })
  })

  // ==================== Error 管理 ====================

  describe('错误管理', () => {
    it('setError 设置错误', () => {
      const err = new Error('test error')
      store.setError(err)
      expect(store.error).toBe(err)
      expect(store.hasError).toBe(true)
    })

    it('clearError 清除错误', () => {
      store.setError(new Error('test'))
      store.clearError()
      expect(store.error).toBeNull()
      expect(store.hasError).toBe(false)
    })

    it('setError(null) 等价于清空', () => {
      store.setError(new Error('test'))
      store.setError(null)
      expect(store.error).toBeNull()
    })
  })

  // ==================== Computed ====================

  describe('computed 属性', () => {
    it('isDebug 返回 config.enableDebug', () => {
      expect(store.isDebug).toBe(false)
      store.config.enableDebug = true
      expect(store.isDebug).toBe(true)
    })

    it('isLoading 任一加载状态为 true 时返回 true', () => {
      expect(store.isLoading).toBe(false)
      store.setLoading('app', true)
      expect(store.isLoading).toBe(true)
      store.setLoading('app', false)
      expect(store.isLoading).toBe(false)
    })

    it('hasError 反映 error 状态', () => {
      expect(store.hasError).toBe(false)
      store.setError(new Error('oops'))
      expect(store.hasError).toBe(true)
    })
  })

  // ==================== Actions ====================

  describe('toggleSidebar', () => {
    it('切换 sidebarCollapsed', () => {
      expect(store.sidebarCollapsed).toBe(false)
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })
  })

  describe('setActiveNav', () => {
    it('切换 activeNav', () => {
      store.setActiveNav('settings')
      expect(store.activeNav).toBe('settings')
    })
  })

  describe('checkMobile', () => {
    it('根据窗口宽度检测是否为移动端', () => {
      // 默认 jsdom 宽度 > 768
      store.checkMobile()
      expect(store.isMobile).toBe(false)
    })
  })

  // ==================== $reset ====================

  describe('$reset', () => {
    it('恢复 settings 为默认值', () => {
      store.settings.fontSize = 'large'
      store.settings.enterToSend = false
      store.$reset()
      expect(store.settings.fontSize).toBe('medium')
      expect(store.settings.enterToSend).toBe(true)
    })

    it('重置 sidebarCollapsed', () => {
      store.sidebarCollapsed = true
      store.$reset()
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('重置 activeNav', () => {
      store.setActiveNav('contacts')
      store.$reset()
      expect(store.activeNav).toBe('chat')
    })

    it('清除 error', () => {
      store.setError(new Error('something'))
      store.$reset()
      expect(store.error).toBeNull()
    })

    it('重置所有 loading 状态', () => {
      store.setLoading('app', true)
      store.setLoading('messages', true)
      store.$reset()
      Object.values(store.loading).forEach(v => {
        expect(v).toBe(false)
      })
    })

    it('重置导航栈', () => {
      store.navigationStack.push({ view: 'messageList' as const })
      store.$reset()
      expect(store.navigationStack).toEqual([{ view: 'sessionList' }])
    })
  })
})
