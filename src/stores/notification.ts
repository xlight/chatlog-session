/**
 * 消息通知 Store
 * 管理消息通知功能
 * 
 * 功能：
 * - 检测 @我 的消息
 * - 检测引用我的消息
 * - 浏览器原生通知
 * - 通知去重机制
 * - 通知历史记录
 * - 通知权限管理
 * - 通知设置
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import { useContactStore } from './contact'
import { usePWAStore } from './pwa'
import type { Message } from '@/types/message'

/**
 * 通知类型
 */
export enum NotificationType {
  MENTION = 'mention',      // @我
  QUOTE = 'quote',          // 引用我
  MESSAGE = 'message',      // 普通消息
}

/**
 * 通知项
 */
interface NotificationItem {
  id: string
  type: NotificationType
  talker: string
  talkerName: string
  message: Message
  timestamp: number
  read: boolean
  clicked: boolean
}

/**
 * 通知配置
 */
interface NotificationConfig {
  enabled: boolean              // 全局开关
  enableMention: boolean        // @我通知
  enableQuote: boolean          // 引用通知
  enableMessage: boolean        // 普通消息通知
  enableSound: boolean          // 声音提示
  enableVibrate: boolean        // 震动提示
  muteList: string[]            // 静音列表
  onlyShowLatest: boolean       // 只显示最新一条
  maxNotifications: number      // 最大通知数
  autoClose: number             // 自动关闭时间（秒，0 表示不自动关闭）
  myWxid?: string               // 我的微信 ID，用于识别 @我
  showMessageContent: boolean   // 是否在通知中显示消息具体内容（隐私设置）
}

/**
 * 通知权限状态
 */
type PermissionStatus = 'default' | 'granted' | 'denied'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  enableMention: true,
  enableQuote: true,
  enableMessage: false,         // 默认不通知普通消息
  enableSound: true,
  enableVibrate: false,
  muteList: [],
  onlyShowLatest: true,
  maxNotifications: 5,
  autoClose: 5,                 // 5秒后自动关闭
  myWxid: undefined,            // 需要用户手动配置
  showMessageContent: true,     // 默认显示消息内容
}

/**
 * 存储键
 */
const CONFIG_KEY = 'chatlog_notification_config'
const HISTORY_KEY = 'chatlog_notification_history'
const NOTIFIED_KEY = 'chatlog_notified_messages'

export const useNotificationStore = defineStore('notification', () => {
  // ==================== State ====================
  const config = ref<NotificationConfig>({ ...DEFAULT_CONFIG })
  const permission = ref<PermissionStatus>('default')
  const history = ref<NotificationItem[]>([])
  const notifiedIds = ref<Set<string>>(new Set())
  const activeNotifications = ref<Map<string, Notification>>(new Map())
  const autoCloseTimers: ReturnType<typeof setTimeout>[] = []
  const initialized = ref(false)

  // ==================== Getters ====================

  const isEnabled = computed(() => {
    return config.value.enabled && permission.value === 'granted'
  })

  const needsPermission = computed(() => {
    return permission.value === 'default'
  })

  const unreadCount = computed(() => {
    return history.value.filter(item => !item.read).length
  })

  const recentNotifications = computed(() => (limit = 10): NotificationItem[] => {
    return [...history.value]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  })

  const isMuted = computed(() => (talker: string): boolean => {
    return config.value.muteList.includes(talker)
  })

  // ==================== Actions ====================

  /**
   * 初始化
   */
  async function init() {
    if (initialized.value) {
      console.log('🔔 Notification store already initialized')
      return
    }

    loadConfig()
    loadHistory()
    loadNotifiedIds()
    await checkPermission()

    // 监听 Service Worker 消息（通知点击事件）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'notification-click') {
          const { talker, messageId, message } = event.data
          handleNotificationClick(messageId, talker, message)
        }
      })
    }

    initialized.value = true

    console.log('🔔 Notification store initialized', {
      permission: permission.value,
      enabled: config.value.enabled,
      isEnabled: isEnabled.value,
      myWxid: config.value.myWxid,
      enableMessage: config.value.enableMessage,
      enableMention: config.value.enableMention,
    })
  }

  /**
   * 检查通知权限
   */
  async function checkPermission(): Promise<PermissionStatus> {
    if (!('Notification' in window)) {
      permission.value = 'denied'
      return 'denied'
    }

    permission.value = Notification.permission as PermissionStatus
    return permission.value
  }

  /**
   * 请求通知权限
   */
  async function requestPermission(): Promise<PermissionStatus> {
    if (!('Notification' in window)) {
      permission.value = 'denied'
      return 'denied'
    }

    if (permission.value === 'granted') {
      return 'granted'
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result as PermissionStatus

      const appStore = useAppStore()
      if (appStore.isDebug) {
        console.log('🔔 Notification permission:', result)
      }

      return permission.value
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      permission.value = 'denied'
      return 'denied'
    }
  }

  /**
   * 加载配置
   */
  function loadConfig() {
    try {
      // 迁移：如果 localStorage 无数据但 sessionStorage 有数据，迁移过来
      const localData = localStorage.getItem(CONFIG_KEY)
      if (!localData) {
        const sessionData = sessionStorage.getItem(CONFIG_KEY)
        if (sessionData) {
          localStorage.setItem(CONFIG_KEY, sessionData)
          sessionStorage.removeItem(CONFIG_KEY)
        }
      }

      const data = localStorage.getItem(CONFIG_KEY)
      if (data) {
        config.value = { ...config.value, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('Failed to load notification config:', error)
    }
  }

  /**
   * 保存配置
   */
  function saveConfig() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
    } catch (error) {
      console.error('Failed to save notification config:', error)
    }
  }

  /**
   * 更新配置
   */
  function updateConfig(newConfig: Partial<NotificationConfig>) {
    config.value = { ...config.value, ...newConfig }
    saveConfig()

    const appStore = useAppStore()
    if (appStore.isDebug) {
      console.log('🔔 Notification config updated:', config.value)
    }
  }

  /**
   * 加载通知历史
   */
  function loadHistory() {
    try {
      // 迁移：sessionStorage → localStorage
      const localData = localStorage.getItem(HISTORY_KEY)
      if (!localData) {
        const sessionData = sessionStorage.getItem(HISTORY_KEY)
        if (sessionData) {
          localStorage.setItem(HISTORY_KEY, sessionData)
          sessionStorage.removeItem(HISTORY_KEY)
        }
      }

      const data = localStorage.getItem(HISTORY_KEY)
      if (data) {
        history.value = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load notification history:', error)
    }
  }

  /**
   * 保存通知历史
   */
  function saveHistory() {
    try {
      // 只保留最近的通知
      const recent = history.value
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100)

      localStorage.setItem(HISTORY_KEY, JSON.stringify(recent))
    } catch (error) {
      console.error('Failed to save notification history:', error)
    }
  }

  /**
   * 加载已通知的消息 ID
   */
  function loadNotifiedIds() {
    try {
      // 迁移：sessionStorage → localStorage
      const localData = localStorage.getItem(NOTIFIED_KEY)
      if (!localData) {
        const sessionData = sessionStorage.getItem(NOTIFIED_KEY)
        if (sessionData) {
          localStorage.setItem(NOTIFIED_KEY, sessionData)
          sessionStorage.removeItem(NOTIFIED_KEY)
        }
      }

      const data = localStorage.getItem(NOTIFIED_KEY)
      if (data) {
        notifiedIds.value = new Set(JSON.parse(data))
      }
    } catch (error) {
      console.error('Failed to load notified IDs:', error)
    }
  }

  /**
   * 保存已通知的消息 ID
   */
  function saveNotifiedIds() {
    try {
      const ids = Array.from(notifiedIds.value).slice(-1000)  // 只保留最近 1000 个
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids))
    } catch (error) {
      console.error('Failed to save notified IDs:', error)
    }
  }

  /**
   * 检测消息是否需要通知
   */
  function shouldNotify(message: Message, talker: string, myWxid?: string): NotificationType | null {
    // 如果未启用通知
    if (!isEnabled.value) {
      console.log('🔔 shouldNotify: disabled', { enabled: config.value.enabled, permission: permission.value })
      return null
    }

    // 如果是我自己发的消息
    if (message.isSend) return null

    // 如果已经通知过
    const messageId = `${message.id}_${message.seq}`
    if (notifiedIds.value.has(messageId)) return null

    // 如果在静音列表中
    if (isMuted.value(talker)) return null

    // 检测 @我
    if (config.value.enableMention && isMentioned(message, myWxid)) {
      console.log('🔔 shouldNotify: mention detected', { talker, myWxid })
      return NotificationType.MENTION
    }

    // 检测引用我
    if (config.value.enableQuote && isQuoted(message, myWxid)) {
      console.log('🔔 shouldNotify: quote detected', { talker, myWxid })
      return NotificationType.QUOTE
    }

    // 普通消息
    if (config.value.enableMessage) {
      console.log('🔔 shouldNotify: message notification', { talker })
      return NotificationType.MESSAGE
    }

    console.log('🔔 shouldNotify: no notification type matched', { enableMention: config.value.enableMention, enableQuote: config.value.enableQuote, enableMessage: config.value.enableMessage })
    return null
  }

  /**
   * 检测是否 @我
   */
  function isMentioned(message: Message, myWxid?: string): boolean {
    if (!myWxid) return false

    // 文本消息中检测 @
    if (message.type === 1 && message.content) {
      // 检测 @all
      if (message.content.includes('@所有人') || message.content.includes('@All')) {
        return true
      }

      // 优先使用配置中的 myWxid
      const wxid = myWxid || config.value.myWxid
      if (!wxid) return false

      // 检测 @我的微信号
      if (message.content.includes(`@${wxid}`)) {
        return true
      }

      // 检测 @我的昵称（需要从联系人信息中获取）
      const contactStore = useContactStore()
      const myContact = contactStore.contacts.find(c => c.wxid === wxid)
      const displayName = myContact?.remark || myContact?.nickname
      if (myContact && displayName && message.content.includes(`@${displayName}`)) {
        return true
      }
    }

    return false
  }

  /**
   * 检测是否引用我
   */
  function isQuoted(message: Message, myWxid?: string): boolean {
    if (!myWxid) return false

    // TODO: 根据实际的引用消息结构来实现
    if (message.type === 49) {
      if (message.content && message.content.includes(myWxid)) {
        return true
      }
    }

    return false
  }

  /**
   * 发送通知
   */
  async function notify(
    type: NotificationType,
    talker: string,
    talkerName: string,
    message: Message
  ): Promise<void> {
    // 检查权限
    if (!isEnabled.value) {
      const appStore = useAppStore()
      if (appStore.isDebug) {
        console.log('🔔 Notification disabled, skipping')
      }
      return
    }

    // 去重检查
    const messageId = `${message.id}_${message.seq}`
    if (notifiedIds.value.has(messageId)) {
      return
    }

    // 构建通知内容
    const { title, body, icon } = buildNotification(type, talkerName, message)

    try {
      // 如果只显示最新一条，关闭之前的通知
      if (config.value.onlyShowLatest) {
        closeAllNotifications()
      }

      // 检查通知数量限制
      if (activeNotifications.value.size >= config.value.maxNotifications) {
        closeOldestNotification()
      }

      const notificationOptions: NotificationOptions & Record<string, any> = {
        body,
        icon,
        tag: talker,
        renotify: true,
        requireInteraction: config.value.autoClose === 0,
        silent: !config.value.enableSound,
      }

      const shouldAddActions = type === NotificationType.MENTION || type === NotificationType.QUOTE

      const pwaStore = usePWAStore()
      const appStore = useAppStore()

      // Service Worker 通知支持 actions，new Notification() 不支持
      if (pwaStore.isActive) {
        const swNotificationOptions: Record<string, any> = {
          ...notificationOptions,
          data: {
            talker,
            messageId,
            message: {
              id: message.id,
              seq: message.seq,
              sender: message.sender,
              senderName: message.senderName,
            },
          },
        }

        if (shouldAddActions) {
          swNotificationOptions.actions = [
            { action: 'view', title: '查看' },
            { action: 'dismiss', title: '忽略' },
          ]
        }

        await pwaStore.showNotification(title, swNotificationOptions)

        if (appStore.isDebug) {
          console.log('🔔 SW Notification sent:', { title, body, talker, type })
        }
      } else {
        // 降级：移除 actions 后使用 new Notification()
        const { actions, ...fallbackOptions } = notificationOptions

        const notification = new Notification(title, fallbackOptions)

        if (appStore.isDebug) {
          console.log('🔔 Fallback Notification created:', { title, body, talker, permission: permission.value, isEnabled: isEnabled.value })
        }

        notification.onclick = () => {
          handleNotificationClick(messageId, talker, message)
        }

        notification.onerror = () => {
          activeNotifications.value.delete(messageId)
          console.error('通知显示失败:', { title, body, talker })
        }

        notification.onclose = () => {
          activeNotifications.value.delete(messageId)
        }

        if (config.value.autoClose > 0) {
          const timerId = setTimeout(() => {
            notification.close()
            const idx = autoCloseTimers.indexOf(timerId)
            if (idx !== -1) autoCloseTimers.splice(idx, 1)
          }, config.value.autoClose * 1000)
          autoCloseTimers.push(timerId)
        }

        activeNotifications.value.set(messageId, notification)
      }

      // 震动
      if (config.value.enableVibrate && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }

      // 记录通知
      addToHistory(type, talker, talkerName, message)
      notifiedIds.value.add(messageId)
      if (notifiedIds.value.size > 1000) {
        const arr = Array.from(notifiedIds.value)
        notifiedIds.value = new Set(arr.slice(-1000))
      }
      saveNotifiedIds()

      if (appStore.isDebug) {
        console.log('🔔 Notification sent:', { type, talker, title, body })
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  /**
   * 构建通知内容
   */
  function buildNotification(
    type: NotificationType,
    talkerName: string,
    message: Message
  ): { title: string; body: string; icon: string } {
    const icon = '/logo.svg'

    // 获取发送者显示名称：优先从联系人 store 获取，若返回原始 wxid 则 fallback 到 message.senderName
    const contactStore = useContactStore()
    const contactSenderName = contactStore.getContactDisplayNameSync(message.sender)
    const senderName = (contactSenderName && contactSenderName !== message.sender)
      ? contactSenderName
      : (message.senderName || message.sender)

    // 群聊：title = 群名，body = 发送者：内容
    // 私聊：title = 发送者，body = 内容
    const isGroup = message.isChatRoom

    let title = ''
    let body = ''

    if (config.value.showMessageContent) {
      const preview = getMessagePreview(message)

      switch (type) {
        case NotificationType.MENTION:
          title = isGroup ? `💬 ${talkerName}` : `💬 ${senderName}`
          body = isGroup ? `${senderName} @了你：${preview}` : `@了你：${preview}`
          break
        case NotificationType.QUOTE:
          title = isGroup ? `↩️ ${talkerName}` : `↩️ ${senderName}`
          body = isGroup ? `${senderName} 引用了你：${preview}` : `引用了你：${preview}`
          break
        case NotificationType.MESSAGE:
          title = isGroup ? `💬 ${talkerName}` : `📩 ${senderName}`
          body = isGroup ? `${senderName}：${preview}` : preview
          break
        default:
          title = isGroup ? `💬 ${talkerName}` : `📩 ${senderName}`
          body = preview
      }
    } else {
      switch (type) {
        case NotificationType.MENTION:
          title = isGroup ? `💬 ${talkerName}` : `💬 ${senderName}`
          body = isGroup ? `${senderName} @了你` : '@了你'
          break
        case NotificationType.QUOTE:
          title = isGroup ? `↩️ ${talkerName}` : `↩️ ${senderName}`
          body = isGroup ? `${senderName} 引用了你` : '引用了你'
          break
        case NotificationType.MESSAGE:
          title = isGroup ? `💬 ${talkerName}` : `📩 ${senderName}`
          body = isGroup ? `${senderName} 发来了新消息` : '发来了新消息'
          break
        default:
          title = isGroup ? `💬 ${talkerName}` : `📩 ${senderName}`
          body = '您有新消息'
      }
    }

    return { title, body, icon }
  }

  /**
   * 获取消息预览文本
   */
  function getMessagePreview(message: Message): string {
    switch (message.type) {
      case 1: {
        const content = message.content || '新消息'
        return content.length > 50 ? content.substring(0, 50) + '...' : content
      }
      case 3:  return '[图片]'
      case 34: return '[语音]'
      case 43: return '[视频]'
      case 47: return '[表情]'
      case 49: return '[文件]'
      default: return '新消息'
    }
  }

  /**
   * 处理通知点击
   */
  function handleNotificationClick(messageId: string, talker: string, message: Message) {
    // 标记为已点击
    const item = history.value.find(h => h.id === messageId)
    if (item) {
      item.clicked = true
      item.read = true
      saveHistory()
    }

    // 关闭通知
    const notification = activeNotifications.value.get(messageId)
    if (notification) {
      notification.close()
    }

    // 跳转到对应会话和消息
    window.dispatchEvent(new CustomEvent('chatlog-notification-click', {
      detail: { talker, message }
    }))

    // 聚焦窗口
    if (window.focus) {
      window.focus()
    }

    const appStore = useAppStore()
    if (appStore.isDebug) {
      console.log('🔔 Notification clicked:', { talker, messageId })
    }
  }

  /**
   * 添加到历史记录
   */
  function addToHistory(
    type: NotificationType,
    talker: string,
    talkerName: string,
    message: Message
  ) {
    const id = `${message.id}_${message.seq}`

    const item: NotificationItem = {
      id,
      type,
      talker,
      talkerName,
      message,
      timestamp: Date.now(),
      read: false,
      clicked: false,
    }

    history.value.unshift(item)

    // 限制历史记录数量
    if (history.value.length > 100) {
      history.value = history.value.slice(0, 100)
    }

    saveHistory()
  }

  /**
   * 标记通知为已读
   */
  function markAsRead(id: string) {
    const item = history.value.find(h => h.id === id)
    if (item) {
      item.read = true
      saveHistory()
    }
  }

  /**
   * 标记所有通知为已读
   */
  function markAllAsRead() {
    history.value.forEach(item => {
      item.read = true
    })
    saveHistory()
  }

  /**
   * 清空通知历史
   */
  function clearHistory() {
    history.value = []
    saveHistory()
  }

  /**
   * 关闭所有通知
   */
  function closeAllNotifications() {
    activeNotifications.value.forEach(notification => {
      notification.close()
    })
    activeNotifications.value.clear()
  }

  /**
   * 关闭最旧的通知
   */
  function closeOldestNotification() {
    const entries = Array.from(activeNotifications.value.entries())
    if (entries.length > 0) {
      const [id, notification] = entries[0]
      notification.close()
      activeNotifications.value.delete(id)
    }
  }

  /**
   * 添加到静音列表
   */
  function mute(talker: string) {
    if (!config.value.muteList.includes(talker)) {
      config.value.muteList.push(talker)
      saveConfig()
    }
  }

  /**
   * 从静音列表移除
   */
  function unmute(talker: string) {
    const index = config.value.muteList.indexOf(talker)
    if (index > -1) {
      config.value.muteList.splice(index, 1)
      saveConfig()
    }
  }

  /**
   * 切换静音状态
   */
  function toggleMute(talker: string): boolean {
    if (isMuted.value(talker)) {
      unmute(talker)
      return false
    } else {
      mute(talker)
      return true
    }
  }

  /**
   * 批量检测和发送通知
   */
  async function checkMessages(messages: Message[], talker: string, talkerName: string, myWxid?: string) {
    if (!isEnabled.value) return

    // 如果所有通知类型都关闭，跳过每条消息的 shouldNotify 检测
    if (!config.value.enableMention && !config.value.enableQuote && !config.value.enableMessage) return

    for (const message of messages) {
      const type = shouldNotify(message, talker, myWxid)
      if (type) {
        await notify(type, talker, talkerName, message)
      }
    }
  }

  /**
   * 测试通知
   */
  async function testNotification() {
    const appStore = useAppStore()

    if (appStore.isDebug) {
      console.log('🔔 Testing notification...', {
        permission: permission.value,
        enabled: config.value.enabled,
        isEnabled: isEnabled.value
      })
    }

    // 检查权限
    if (permission.value !== 'granted') {
      console.warn('⚠️ Notification permission not granted, requesting...')
      const result = await requestPermission()
      if (result !== 'granted') {
        console.error('❌ Notification permission denied')
        return false
      }
    }

    if (permission.value === 'granted') {
      try {
        const notification = new Notification('Chatlog Session 通知测试', {
          body: '通知功能正常工作！✨',
          icon: '/logo.svg',
          tag: 'test-notification',
          requireInteraction: false,
        })

        if (appStore.isDebug) {
          console.log('✅ Test notification created successfully')
        }

        notification.onclick = () => {
          console.log('🔔 Test notification clicked')
          notification.close()
          if (window.focus) {
            window.focus()
          }
        }

        notification.onclose = () => {
          if (appStore.isDebug) {
            console.log('🔔 Test notification closed')
          }
        }

        notification.onerror = (error) => {
          console.error('❌ Test notification error:', error)
        }

        setTimeout(() => {
          notification.close()
        }, 3000)

        return true
      } catch (error) {
        console.error('❌ Failed to create test notification:', error)
        return false
      }
    }

    console.error('❌ Notification permission not granted')
    return false
  }

  /**
   * 获取统计信息
   */
  function getStats() {
    return {
      enabled: isEnabled.value,
      permission: permission.value,
      totalNotifications: history.value.length,
      unreadCount: unreadCount.value,
      activeCount: activeNotifications.value.size,
      muteCount: config.value.muteList.length,
      notifiedCount: notifiedIds.value.size,
      config: config.value,
    }
  }

  /**
   * $reset 方法：重置 store 到初始状态
   */
  function $reset() {
    autoCloseTimers.forEach(id => clearTimeout(id))
    autoCloseTimers.length = 0
    config.value = { ...DEFAULT_CONFIG }
    permission.value = 'default'
    history.value = []
    notifiedIds.value = new Set()
    activeNotifications.value = new Map()
    initialized.value = false
  }

  return {
    // State
    config,
    permission,
    history,
    notifiedIds,
    activeNotifications,
    initialized,

    // Getters
    isEnabled,
    needsPermission,
    unreadCount,
    recentNotifications,
    isMuted,

    // Actions
    init,
    checkPermission,
    requestPermission,
    loadConfig,
    saveConfig,
    updateConfig,
    loadHistory,
    saveHistory,
    loadNotifiedIds,
    saveNotifiedIds,
    shouldNotify,
    isMentioned,
    isQuoted,
    notify,
    buildNotification,
    getMessagePreview,
    handleNotificationClick,
    addToHistory,
    markAsRead,
    markAllAsRead,
    clearHistory,
    closeAllNotifications,
    closeOldestNotification,
    mute,
    unmute,
    toggleMute,
    checkMessages,
    testNotification,
    getStats,
    $reset,
  }
})
