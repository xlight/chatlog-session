/**
 * Service Worker 注册和管理工具
 * 
 * 功能：
 * - Service Worker 注册
 * - 生命周期管理
 * - 缓存控制
 * - 更新检测
 * - 通知支持
 */

export interface ServiceWorkerConfig {
  enabled: boolean
  scriptUrl: string
  scope: string
  updateCheckInterval: number // 更新检查间隔（毫秒）
}

export interface CacheInfo {
  totalEntries: number
  details: Record<string, number>
}

export interface ServiceWorkerMessage {
  type: string
  [key: string]: any
}

/**
 * Service Worker 状态
 */
export enum ServiceWorkerState {
  NOT_SUPPORTED = 'not_supported',
  REGISTERING = 'registering',
  REGISTERED = 'registered',
  ACTIVATING = 'activating',
  ACTIVATED = 'activated',
  ERROR = 'error',
  UPDATING = 'updating',
}

/**
 * Service Worker 管理类
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private config: ServiceWorkerConfig
  private updateCheckTimer: number | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private state: ServiceWorkerState = ServiceWorkerState.NOT_SUPPORTED

  constructor(config: Partial<ServiceWorkerConfig> = {}) {
    this.config = {
      enabled: true,
      scriptUrl: '/sw.js',
      scope: '/',
      updateCheckInterval: 60 * 60 * 1000, // 1小时
      ...config,
    }
  }

  /**
   * 检查浏览器是否支持 Service Worker
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator
  }

  /**
   * 获取当前状态
   */
  getState(): ServiceWorkerState {
    return this.state
  }

  /**
   * 注册 Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.config.enabled) {
      console.log('[SW Manager] Service Worker disabled')
      return null
    }

    if (!this.isSupported()) {
      console.warn('[SW Manager] Service Worker not supported')
      this.state = ServiceWorkerState.NOT_SUPPORTED
      this.emit('statechange', this.state)
      return null
    }

    try {
      this.state = ServiceWorkerState.REGISTERING
      this.emit('statechange', this.state)

      console.log('[SW Manager] Registering Service Worker:', this.config.scriptUrl)
      
      this.registration = await navigator.serviceWorker.register(
        this.config.scriptUrl,
        { scope: this.config.scope }
      )

      console.log('[SW Manager] Service Worker registered successfully')
      this.state = ServiceWorkerState.REGISTERED
      this.emit('statechange', this.state)
      this.emit('registered', this.registration)

      // 监听状态变化
      this.setupEventListeners()

      // 检查是否有更新
      await this.checkForUpdates()

      // 定期检查更新
      this.startUpdateCheck()

      return this.registration
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error)
      this.state = ServiceWorkerState.ERROR
      this.emit('statechange', this.state)
      this.emit('error', error)
      return null
    }
  }

  /**
   * 注销 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      this.stopUpdateCheck()
      const success = await this.registration.unregister()
      
      if (success) {
        console.log('[SW Manager] Service Worker unregistered')
        this.registration = null
        this.state = ServiceWorkerState.NOT_SUPPORTED
        this.emit('statechange', this.state)
        this.emit('unregistered')
      }
      
      return success
    } catch (error) {
      console.error('[SW Manager] Unregistration failed:', error)
      return false
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.registration) return

    // 监听 Service Worker 更新
    this.registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] Update found')
      this.state = ServiceWorkerState.UPDATING
      this.emit('statechange', this.state)
      this.emit('updatefound')

      const newWorker = this.registration!.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('[SW Manager] New worker state:', newWorker.state)
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新版本已安装，等待激活
            console.log('[SW Manager] New version installed, waiting for activation')
            this.emit('updateready')
          }
          
          if (newWorker.state === 'activated') {
            console.log('[SW Manager] New version activated')
            this.state = ServiceWorkerState.ACTIVATED
            this.emit('statechange', this.state)
            this.emit('activated')
          }
        })
      }
    })

    // 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Controller changed')
      this.emit('controllerchange')
    })

    // 监听来自 Service Worker 的消息
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW Manager] Message from SW:', event.data)
      this.emit('message', event.data)
    })
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return

    try {
      console.log('[SW Manager] Checking for updates...')
      await this.registration.update()
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error)
    }
  }

  /**
   * 开始定期检查更新
   */
  private startUpdateCheck(): void {
    this.stopUpdateCheck()
    
    this.updateCheckTimer = window.setInterval(() => {
      this.checkForUpdates()
    }, this.config.updateCheckInterval)
  }

  /**
   * 停止检查更新
   */
  private stopUpdateCheck(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer)
      this.updateCheckTimer = null
    }
  }

  /**
   * 激活等待中的 Service Worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return
    }

    console.log('[SW Manager] Skipping waiting...')
    
    // 发送消息给 Service Worker
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * 向 Service Worker 发送消息
   */
  async postMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active')
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data)
        } else {
          reject(new Error(event.data.error || 'Unknown error'))
        }
      }

      this.registration!.active!.postMessage(message, [messageChannel.port2])
    })
  }

  /**
   * 清空所有缓存
   */
  async clearCache(): Promise<void> {
    try {
      await this.postMessage({ type: 'CLEAR_CACHE' })
      console.log('[SW Manager] All caches cleared')
      this.emit('cachecleared')
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error)
      throw error
    }
  }

  /**
   * 获取缓存信息
   */
  async getCacheInfo(): Promise<CacheInfo> {
    try {
      const response = await this.postMessage({ type: 'GET_CACHE_SIZE' })
      return {
        totalEntries: response.totalEntries || 0,
        details: response.details || {},
      }
    } catch (error) {
      console.error('[SW Manager] Failed to get cache info:', error)
      throw error
    }
  }

  /**
   * 更新缓存
   */
  async updateCache(urls: string[]): Promise<void> {
    try {
      await this.postMessage({
        type: 'UPDATE_CACHE',
        urls,
      })
      console.log('[SW Manager] Cache updated for:', urls.length, 'URLs')
    } catch (error) {
      console.error('[SW Manager] Failed to update cache:', error)
      throw error
    }
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission
    }

    return Notification.permission
  }

  /**
   * 显示通知（通过 Service Worker）
   */
  async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    await this.registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options,
    })
  }

  /**
   * 订阅推送通知
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    const subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log('[SW Manager] Push subscription created')
    return subscription
  }

  /**
   * 取消推送订阅
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    const subscription = await this.registration.pushManager.getSubscription()
    if (subscription) {
      const success = await subscription.unsubscribe()
      console.log('[SW Manager] Push subscription removed')
      return success
    }

    return false
  }

  /**
   * 注册后台同步
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    // @ts-ignore - Background Sync API 可能不被所有 TypeScript 版本识别
    if ('sync' in this.registration) {
      // @ts-ignore
      await this.registration.sync.register(tag)
      console.log('[SW Manager] Background sync registered:', tag)
    } else {
      console.warn('[SW Manager] Background Sync not supported')
    }
  }

  /**
   * 注册定期同步
   */
  async registerPeriodicSync(tag: string, minInterval: number): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    // @ts-ignore - Periodic Sync API 可能不被所有 TypeScript 版本识别
    if ('periodicSync' in this.registration) {
      // @ts-ignore
      await this.registration.periodicSync.register(tag, { minInterval })
      console.log('[SW Manager] Periodic sync registered:', tag)
    } else {
      console.warn('[SW Manager] Periodic Sync not supported')
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * 工具方法：将 Base64 字符串转换为 Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopUpdateCheck()
    this.listeners.clear()
  }
}

/**
 * 创建全局 Service Worker 管理器实例
 */
let globalManager: ServiceWorkerManager | null = null

export function getServiceWorkerManager(
  config?: Partial<ServiceWorkerConfig>
): ServiceWorkerManager {
  if (!globalManager) {
    globalManager = new ServiceWorkerManager(config)
  }
  return globalManager
}

/**
 * 初始化 Service Worker
 */
export async function initServiceWorker(
  config?: Partial<ServiceWorkerConfig>
): Promise<ServiceWorkerManager> {
  const manager = getServiceWorkerManager(config)
  await manager.register()
  return manager
}

/**
 * 检查 Service Worker 是否可用
 */
export function isServiceWorkerAvailable(): boolean {
  return 'serviceWorker' in navigator
}

/**
 * 获取当前激活的 Service Worker
 */
export function getActiveServiceWorker(): ServiceWorker | null {
  return navigator.serviceWorker?.controller || null
}

/**
 * 等待 Service Worker 激活
 */
export function waitForServiceWorkerActivation(): Promise<void> {
  return new Promise((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve()
      return
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      resolve()
    }, { once: true })
  })
}