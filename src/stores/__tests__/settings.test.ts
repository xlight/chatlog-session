/**
 * useSettingsStore 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useSettingsStore } from '@/stores/settings'

function createStore() {
  return useSettingsStore(createTestingPinia({ stubActions: false }))
}

describe('useSettingsStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  // ==================== 默认状态 ====================

  describe('默认状态', () => {
    it('api 默认值', () => {
      expect(store.api).toEqual({
        apiBaseUrl: '',
        apiTimeout: 30000,
        apiRetryCount: 3,
        apiRetryDelay: 1000,
        enableDebug: false,
      })
    })

    it('appearance 默认值', () => {
      expect(store.appearance).toEqual({
        theme: 'light',
        language: 'zh-CN',
        fontSize: 14,
      })
    })

    it('notification 默认值', () => {
      expect(store.notification.enableNotifications).toBe(true)
      expect(store.notification.enableMention).toBe(true)
      expect(store.notification.enableQuote).toBe(true)
      expect(store.notification.enableMessage).toBe(true)
      expect(store.notification.enableSound).toBe(true)
      expect(store.notification.enableVibrate).toBe(true)
      expect(store.notification.onlyShowLatest).toBe(false)
      expect(store.notification.autoCloseTime).toBe(5)
      expect(store.notification.myWxid).toBe('')
      expect(store.notification.showMessageContent).toBe(true)
    })

    it('chat 默认值', () => {
      expect(store.chat).toEqual({
        showTimestamp: true,
        showAvatar: true,
        messageGrouping: true,
        showMediaResources: true,
        enableServerPinning: true,
        autoRefresh: false,
        autoRefreshInterval: 30,
      })
    })

    it('privacy 默认值', () => {
      expect(store.privacy).toEqual({
        saveHistory: true,
        autoDownloadMedia: false,
        compressImages: true,
      })
    })

    it('advanced 默认值', () => {
      expect(store.advanced).toEqual({
        enableDebug: false,
        cacheSize: 0,
      })
    })

    it('sendmsg 默认值', () => {
      expect(store.sendmsg).toEqual({
        apiUrl: 'http://127.0.0.1:8765',
        enabled: false,
        sendShortcut: 'enter',
      })
    })

    it('ai 默认值', () => {
      expect(store.ai).toEqual({
        llmBaseUrl: 'https://api.deepseek.com/v1',
        llmApiKey: '',
        llmDefaultModel: 'deepseek-chat',
        enabled: false,
        privacyAcknowledged: false,
        showConsoleInSidebar: true,
        mcpServers: [],
      })
    })
  })

  // ==================== Actions ====================

  describe('migrateFromLegacyStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('无 legacy 数据时返回 false', () => {
      const result = store.migrateFromLegacyStorage()
      expect(result).toBe(false)
    })

    it('迁移 apiBaseUrl', () => {
      localStorage.setItem('chatlog-settings', JSON.stringify({ apiBaseUrl: 'http://custom:9999' }))
      store.migrateFromLegacyStorage()
      expect(store.api.apiBaseUrl).toBe('http://custom:9999')
    })

    it('迁移 theme', () => {
      localStorage.setItem('chatlog-settings', JSON.stringify({ theme: 'dark' }))
      store.migrateFromLegacyStorage()
      expect(store.appearance.theme).toBe('dark')
    })

    it('迁移 enableDebug 同步到 advanced', () => {
      localStorage.setItem('chatlog-settings', JSON.stringify({ enableDebug: true }))
      store.migrateFromLegacyStorage()
      expect(store.api.enableDebug).toBe(true)
      expect(store.advanced.enableDebug).toBe(true)
    })

    it('迁移 fontSize', () => {
      localStorage.setItem('chatlog-settings', JSON.stringify({ fontSize: 18 }))
      store.migrateFromLegacyStorage()
      expect(store.appearance.fontSize).toBe(18)
    })
  })

  describe('syncEnableDebug', () => {
    it('同步 enableDebug 到 api 和 advanced', () => {
      store.syncEnableDebug(true)
      expect(store.api.enableDebug).toBe(true)
      expect(store.advanced.enableDebug).toBe(true)

      store.syncEnableDebug(false)
      expect(store.api.enableDebug).toBe(false)
      expect(store.advanced.enableDebug).toBe(false)
    })
  })

  describe('setAiEnabled', () => {
    it('enabled=false 直接写入', () => {
      store.ai.enabled = true
      store.setAiEnabled(false)
      expect(store.ai.enabled).toBe(false)
    })

    it('enabled=true 且已确认（acknowledged）时写入 enabled + privacyAcknowledged', () => {
      store.setAiEnabled(true, { acknowledged: true })
      expect(store.ai.enabled).toBe(true)
      expect(store.ai.privacyAcknowledged).toBe(true)
    })

    it('enabled=true 且 privacyAcknowledged 已为 true 时写入', () => {
      store.ai.privacyAcknowledged = true
      store.setAiEnabled(true)
      expect(store.ai.enabled).toBe(true)
      expect(store.ai.privacyAcknowledged).toBe(true)
    })

    it('enabled=true 但未确认时不写入（UI 开关回弹）', () => {
      store.setAiEnabled(true)
      expect(store.ai.enabled).toBe(false)
      expect(store.ai.privacyAcknowledged).toBe(false)
    })
  })

  describe('resetPrivacyAcknowledgment', () => {
    it('重置 privacyAcknowledged 为 false（供重新确认入口）', () => {
      store.setAiEnabled(true, { acknowledged: true })
      expect(store.ai.privacyAcknowledged).toBe(true)
      store.resetPrivacyAcknowledgment()
      expect(store.ai.privacyAcknowledged).toBe(false)
    })

    it('重置后重新启用需再次确认（未确认不写入）', () => {
      store.setAiEnabled(true, { acknowledged: true })
      store.setAiEnabled(false)
      store.resetPrivacyAcknowledgment()
      store.setAiEnabled(true)
      expect(store.ai.enabled).toBe(false)
      expect(store.ai.privacyAcknowledged).toBe(false)
    })
  })

  describe('$reset', () => {
    it('恢复所有设置为默认值', () => {
      // 修改多个设置
      store.api.apiBaseUrl = 'http://modified:8080'
      store.appearance.theme = 'dark'
      store.appearance.fontSize = 20
      store.chat.showTimestamp = false
      store.privacy.saveHistory = false
      store.sendmsg.enabled = true

      store.$reset()

      // 验证恢复
      expect(store.api.apiBaseUrl).toBe('')
      expect(store.appearance.theme).toBe('light')
      expect(store.appearance.fontSize).toBe(14)
      expect(store.chat.showTimestamp).toBe(true)
      expect(store.privacy.saveHistory).toBe(true)
      expect(store.sendmsg.enabled).toBe(false)
    })
  })

  // ==================== State 修改 ====================

  describe('直接修改 state', () => {
    it('可以修改 appearance theme', () => {
      store.appearance.theme = 'dark'
      expect(store.appearance.theme).toBe('dark')
    })

    it('可以修改 font size', () => {
      store.appearance.fontSize = 18
      expect(store.appearance.fontSize).toBe(18)
    })

    it('可以修改 sendShortcut', () => {
      store.sendmsg.sendShortcut = 'ctrl-enter'
      expect(store.sendmsg.sendShortcut).toBe('ctrl-enter')
    })

    it('可以修改 enableServerPinning', () => {
      store.chat.enableServerPinning = false
      expect(store.chat.enableServerPinning).toBe(false)
    })
  })

  // ==================== Getters / Computed ====================

  describe('computed 属性', () => {
    it('allSettings 合并所有设置', () => {
      const all = store.allSettings
      expect(all.apiBaseUrl).toBe('')
      expect(all.theme).toBe('light')
      expect(all.language).toBe('zh-CN')
      expect(all.fontSize).toBe(14)
      expect(all.enableNotifications).toBe(true)
      expect(all.showTimestamp).toBe(true)
      expect(all.saveHistory).toBe(true)
    })

    it('normalizedApiBaseUrl 移除尾部斜杠', () => {
      store.api.apiBaseUrl = 'http://example.com/api/'
      // 修改后 computed 自动更新
      expect(store.normalizedApiBaseUrl).toBe('http://example.com/api')
    })

    it('normalizedApiBaseUrl 对无尾部斜杠的 URL 保持不变', () => {
      store.api.apiBaseUrl = 'http://example.com/api'
      expect(store.normalizedApiBaseUrl).toBe('http://example.com/api')
    })
  })
})
