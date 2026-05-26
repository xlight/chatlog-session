/**
 * usePWAStore 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { usePWAStore } from '@/stores/pwa'
import { ServiceWorkerState } from '@/utils/serviceWorker'

function createStore() {
  return usePWAStore(createTestingPinia({ stubActions: false }))
}

describe('usePWAStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  // ==================== 默认状态 ====================

  describe('默认状态', () => {
    it('swState 默认为 NOT_SUPPORTED', () => {
      expect(store.swState).toBe(ServiceWorkerState.NOT_SUPPORTED)
    })

    it('isOnline 默认为 true (jsdom navigator.onLine)', () => {
      expect(store.isOnline).toBe(true)
    })

    it('isInstallable 默认为 false', () => {
      expect(store.isInstallable).toBe(false)
    })

    it('isInstalled 默认为 false', () => {
      expect(store.isInstalled).toBe(false)
    })

    it('updateAvailable 默认为 false', () => {
      expect(store.updateAvailable).toBe(false)
    })

    it('cacheInfo 默认为 null', () => {
      expect(store.cacheInfo).toBeNull()
    })

    it('lastUpdateCheck 默认为 null', () => {
      expect(store.lastUpdateCheck).toBeNull()
    })
  })

  // ==================== Getters / Computed ====================

  describe('computed 属性', () => {
    it('isSupported: NOT_SUPPORTED 时返回 false', () => {
      expect(store.isSupported).toBe(false)
    })

    it('isSupported: 非 NOT_SUPPORTED 状态时返回 true', () => {
      store.swState = ServiceWorkerState.REGISTERING
      expect(store.isSupported).toBe(true)
    })

    it('isActive: ACTIVATED 时返回 true', () => {
      store.swState = ServiceWorkerState.ACTIVATED
      expect(store.isActive).toBe(true)
    })

    it('isActive: REGISTERED 时返回 true', () => {
      store.swState = ServiceWorkerState.REGISTERED
      expect(store.isActive).toBe(true)
    })

    it('isActive: NOT_SUPPORTED 时返回 false', () => {
      store.swState = ServiceWorkerState.NOT_SUPPORTED
      expect(store.isActive).toBe(false)
    })

    it('canInstall 默认返回 false（无 installPromptEvent）', () => {
      expect(store.canInstall).toBe(false)
    })

    it('canInstall: 仅设置 isInstallable 仍返回 false（需要 installPromptEvent）', () => {
      store.isInstallable = true
      expect(store.canInstall).toBe(false)
    })

    it('canInstall: 已安装时返回 false', () => {
      store.isInstallable = true
      store.isInstalled = true
      expect(store.canInstall).toBe(false)
    })

    it('totalCacheEntries: 无 cacheInfo 时返回 0', () => {
      expect(store.totalCacheEntries).toBe(0)
    })

    it('totalCacheEntries: 有 cacheInfo 时返回条目数', () => {
      store.cacheInfo = {
        totalEntries: 42,
        details: {},
        totalSize: 1024,
      }
      expect(store.totalCacheEntries).toBe(42)
    })

    it('cacheDetails: 无 cacheInfo 时返回空对象', () => {
      expect(store.cacheDetails).toEqual({})
    })

    it('cacheDetails: 有 cacheInfo 时返回详情', () => {
      const details = { v1: 10, images: 5 }
      store.cacheInfo = {
        totalEntries: 15,
        details,
        totalSize: 2048,
      }
      expect(store.cacheDetails).toEqual(details)
    })
  })

  // ==================== 安装提示流 ====================

  describe('安装提示流程', () => {
    it('isInstallable 状态可以手动设置', () => {
      expect(store.isInstallable).toBe(false)
      store.isInstallable = true
      expect(store.isInstallable).toBe(true)
    })

    it('isInstalled 状态可以手动设置', () => {
      expect(store.isInstalled).toBe(false)
      store.isInstalled = true
      expect(store.isInstalled).toBe(true)
    })

    it('promptInstall: 无 installPromptEvent 时返回 false', async () => {
      const result = await store.promptInstall()
      expect(result).toBe(false)
    })

    it('安装状态独立变化不影响其他状态', () => {
      store.isInstallable = true
      expect(store.isInstallable).toBe(true)
      expect(store.isInstalled).toBe(false)

      store.isInstalled = true
      store.isInstallable = false
      expect(store.isInstalled).toBe(true)
      expect(store.isInstallable).toBe(false)
    })
  })

  // ==================== 在线/离线状态 ====================

  describe('在线状态', () => {
    it('默认 online', () => {
      expect(store.isOnline).toBe(true)
    })

    it('可以手动设置 offline', () => {
      store.isOnline = false
      expect(store.isOnline).toBe(false)
    })
  })

  // ==================== $reset ====================

  describe('$reset', () => {
    it('恢复所有状态为默认值', () => {
      store.swState = ServiceWorkerState.ACTIVATED
      store.isInstallable = true
      store.isInstalled = true
      store.updateAvailable = true
      store.cacheInfo = { totalEntries: 10, details: {}, totalSize: 500 }
      store.lastUpdateCheck = new Date()

      store.$reset()

      expect(store.swState).toBe(ServiceWorkerState.NOT_SUPPORTED)
      expect(store.isInstallable).toBe(false)
      expect(store.isInstalled).toBe(false)
      expect(store.updateAvailable).toBe(false)
      expect(store.cacheInfo).toBeNull()
      expect(store.lastUpdateCheck).toBeNull()
    })

    it('$reset 不影响 isOnline（保持 navigator.onLine 值）', () => {
      store.isOnline = false
      store.$reset()
      // isOnline 重置为 navigator.onLine (jsdom 中为 true)
      expect(store.isOnline).toBe(true)
    })
  })
})
