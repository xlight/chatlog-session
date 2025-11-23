/**
 * PWA Store
 * 
 * 管理 PWA 相关状态和功能：
 * - Service Worker 状态
 * - 安装提示
 * - 更新管理
 * - 离线状态
 * - 缓存管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  ServiceWorkerManager,
  ServiceWorkerState,
  getServiceWorkerManager,
  type CacheInfo,
} from '@/utils/serviceWorker'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const usePWAStore = defineStore('pwa', () => {
  // ============================================================================
  // State
  // ============================================================================
  
  const swManager = ref<ServiceWorkerManager | null>(null)
  const swState = ref<ServiceWorkerState>(ServiceWorkerState.NOT_SUPPORTED)
  const isOnline = ref(navigator.onLine)
  const isInstallable = ref(false)
  const isInstalled = ref(false)
  const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null)
  const updateAvailable = ref(false)
  const cacheInfo = ref<CacheInfo | null>(null)
  const lastUpdateCheck = ref<Date | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================
  
  const isSupported = computed(() => {
    return swState.value !== ServiceWorkerState.NOT_SUPPORTED
  })

  const isActive = computed(() => {
    return swState.value === ServiceWorkerState.ACTIVATED || 
           swState.value === ServiceWorkerState.REGISTERED
  })

  const canInstall = computed(() => {
    return isInstallable.value && !isInstalled.value && installPromptEvent.value !== null
  })

  const totalCacheEntries = computed(() => {
    return cacheInfo.value?.totalEntries || 0
  })

  const cacheDetails = computed(() => {
    return cacheInfo.value?.details || {}
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 初始化 PWA
   */
  async function init() {
    try {
      console.log('[PWA Store] Initializing...')

      // 创建 Service Worker 管理器
      swManager.value = getServiceWorkerManager({
        enabled: true,
        scriptUrl: '/sw.js',
        scope: '/',
        updateCheckInterval: 60 * 60 * 1000, // 1小时
      })

      // 设置事件监听
      setupEventListeners()

      // 检查是否已安装为 PWA
      checkInstallStatus()

      // 监听安装提示
      setupInstallPrompt()

      // 监听在线/离线状态
      setupOnlineStatusListeners()

      // 注册 Service Worker（仅生产环境）
      if (import.meta.env.PROD) {
        await swManager.value.register()
      } else {
        console.log('[PWA Store] Skipping SW registration in dev mode')
      }

      console.log('[PWA Store] Initialized successfully')
    } catch (error) {
      console.error('[PWA Store] Initialization failed:', error)
    }
  }

  /**
   * 设置事件监听器
   */
  function setupEventListeners() {
    if (!swManager.value) return

    // 状态变化
    swManager.value.on('statechange', (state: ServiceWorkerState) => {
      console.log('[PWA Store] SW state changed:', state)
      swState.value = state
    })

    // 注册成功
    swManager.value.on('registered', () => {
      console.log('[PWA Store] SW registered')
      refreshCacheInfo()
    })

    // 发现更新
    swManager.value.on('updatefound', () => {
      console.log('[PWA Store] Update found')
    })

    // 更新准备就绪
    swManager.value.on('updateready', () => {
      console.log('[PWA Store] Update ready')
      updateAvailable.value = true
    })

    // 激活
    swManager.value.on('activated', () => {
      console.log('[PWA Store] SW activated')
      updateAvailable.value = false
    })

    // 控制器变化
    swManager.value.on('controllerchange', () => {
      console.log('[PWA Store] Controller changed')
    })

    // 缓存清空
    swManager.value.on('cachecleared', () => {
      console.log('[PWA Store] Cache cleared')
      refreshCacheInfo()
    })

    // 错误
    swManager.value.on('error', (error: Error) => {
      console.error('[PWA Store] SW error:', error)
    })
  }

  /**
   * 设置安装提示监听
   */
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA Store] Install prompt available')
      e.preventDefault()
      installPromptEvent.value = e as BeforeInstallPromptEvent
      isInstallable.value = true
    })

    window.addEventListener('appinstalled', () => {
      console.log('[PWA Store] App installed')
      isInstalled.value = true
      isInstallable.value = false
      installPromptEvent.value = null
    })
  }

  /**
   * 检查安装状态
   */
  function checkInstallStatus() {
    // 检查是否在独立模式下运行（已安装为 PWA）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIosStandalone = (window.navigator as any).standalone === true
    
    isInstalled.value = isStandalone || isIosStandalone

    if (isInstalled.value) {
      console.log('[PWA Store] Running as installed PWA')
    }
  }

  /**
   * 设置在线/离线状态监听
   */
  function setupOnlineStatusListeners() {
    window.addEventListener('online', () => {
      console.log('[PWA Store] Online')
      isOnline.value = true
    })

    window.addEventListener('offline', () => {
      console.log('[PWA Store] Offline')
      isOnline.value = false
    })
  }

  /**
   * 显示安装提示
   */
  async function promptInstall(): Promise<boolean> {
    if (!installPromptEvent.value) {
      console.warn('[PWA Store] No install prompt available')
      return false
    }

    try {
      await installPromptEvent.value.prompt()
      const { outcome } = await installPromptEvent.value.userChoice
      
      console.log('[PWA Store] Install prompt outcome:', outcome)
      
      if (outcome === 'accepted') {
        isInstalled.value = true
        isInstallable.value = false
        installPromptEvent.value = null
        return true
      }
      
      return false
    } catch (error) {
      console.error('[PWA Store] Install prompt failed:', error)
      return false
    }
  }

  /**
   * 检查更新
   */
  async function checkForUpdates() {
    if (!swManager.value) return

    try {
      await swManager.value.checkForUpdates()
      lastUpdateCheck.value = new Date()
    } catch (error) {
      console.error('[PWA Store] Update check failed:', error)
    }
  }

  /**
   * 应用更新
   */
  async function applyUpdate() {
    if (!swManager.value || !updateAvailable.value) return

    try {
      await swManager.value.skipWaiting()
      // 刷新页面以加载新版本
      window.location.reload()
    } catch (error) {
      console.error('[PWA Store] Failed to apply update:', error)
    }
  }

  /**
   * 刷新缓存信息
   */
  async function refreshCacheInfo() {
    if (!swManager.value) return

    try {
      cacheInfo.value = await swManager.value.getCacheInfo()
    } catch (error) {
      console.error('[PWA Store] Failed to get cache info:', error)
    }
  }

  /**
   * 清空缓存
   */
  async function clearCache() {
    if (!swManager.value) return

    try {
      await swManager.value.clearCache()
      cacheInfo.value = { totalEntries: 0, details: {} }
    } catch (error) {
      console.error('[PWA Store] Failed to clear cache:', error)
      throw error
    }
  }

  /**
   * 更新缓存
   */
  async function updateCache(urls: string[]) {
    if (!swManager.value) return

    try {
      await swManager.value.updateCache(urls)
      await refreshCacheInfo()
    } catch (error) {
      console.error('[PWA Store] Failed to update cache:', error)
      throw error
    }
  }

  /**
   * 显示通知
   */
  async function showNotification(title: string, options?: NotificationOptions) {
    if (!swManager.value) {
      throw new Error('Service Worker not available')
    }

    await swManager.value.showNotification(title, options)
  }

  /**
   * 请求通知权限
   */
  async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!swManager.value) {
      throw new Error('Service Worker not available')
    }

    return await swManager.value.requestNotificationPermission()
  }

  /**
   * 注册后台同步
   */
  async function registerBackgroundSync(tag: string) {
    if (!swManager.value) return

    try {
      await swManager.value.registerBackgroundSync(tag)
    } catch (error) {
      console.error('[PWA Store] Failed to register background sync:', error)
    }
  }

  /**
   * 注册定期同步
   */
  async function registerPeriodicSync(tag: string, minInterval: number) {
    if (!swManager.value) return

    try {
      await swManager.value.registerPeriodicSync(tag, minInterval)
    } catch (error) {
      console.error('[PWA Store] Failed to register periodic sync:', error)
    }
  }

  /**
   * 注销 Service Worker
   */
  async function unregister() {
    if (!swManager.value) return

    try {
      await swManager.value.unregister()
      swState.value = ServiceWorkerState.NOT_SUPPORTED
    } catch (error) {
      console.error('[PWA Store] Failed to unregister:', error)
    }
  }

  /**
   * 获取安装指南
   */
  function getInstallGuide(): { platform: string; steps: string[] } {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return {
        platform: 'iOS',
        steps: [
          '点击底部的分享按钮',
          '向下滚动并点击"添加到主屏幕"',
          '点击"添加"完成安装',
        ],
      }
    } else if (/android/.test(userAgent)) {
      return {
        platform: 'Android',
        steps: [
          '点击浏览器菜单（三个点）',
          '选择"添加到主屏幕"或"安装应用"',
          '按照提示完成安装',
        ],
      }
    } else if (/windows/.test(userAgent)) {
      return {
        platform: 'Windows',
        steps: [
          '点击地址栏右侧的安装图标',
          '或在浏览器菜单中选择"安装 Chatlog Session"',
          '按照提示完成安装',
        ],
      }
    } else if (/mac/.test(userAgent)) {
      return {
        platform: 'macOS',
        steps: [
          '点击地址栏右侧的安装图标',
          '或在浏览器菜单中选择"安装 Chatlog Session"',
          '按照提示完成安装',
        ],
      }
    } else {
      return {
        platform: 'Desktop',
        steps: [
          '点击地址栏右侧的安装图标',
          '或在浏览器菜单中选择"安装"',
          '按照提示完成安装',
        ],
      }
    }
  }

  /**
   * 获取 PWA 统计信息
   */
  function getStats() {
    return {
      isSupported: isSupported.value,
      isActive: isActive.value,
      isInstalled: isInstalled.value,
      isInstallable: isInstallable.value,
      canInstall: canInstall.value,
      updateAvailable: updateAvailable.value,
      isOnline: isOnline.value,
      swState: swState.value,
      totalCacheEntries: totalCacheEntries.value,
      cacheDetails: cacheDetails.value,
      lastUpdateCheck: lastUpdateCheck.value,
    }
  }

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    // State
    swState,
    isOnline,
    isInstallable,
    isInstalled,
    updateAvailable,
    cacheInfo,
    lastUpdateCheck,

    // Getters
    isSupported,
    isActive,
    canInstall,
    totalCacheEntries,
    cacheDetails,

    // Actions
    init,
    promptInstall,
    checkForUpdates,
    applyUpdate,
    refreshCacheInfo,
    clearCache,
    updateCache,
    showNotification,
    requestNotificationPermission,
    registerBackgroundSync,
    registerPeriodicSync,
    unregister,
    getInstallGuide,
    getStats,
  }
})