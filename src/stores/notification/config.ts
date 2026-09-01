/**
 * notification store - config 子模块
 *
 * 通知配置 State + 基础 getters + 配置加载/保存/更新
 */
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useAppStore } from '../app'
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
export interface NotificationItem {
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
export interface NotificationConfig {
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
export type PermissionStatus = 'default' | 'granted' | 'denied'

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  enableMention: true,
  enableQuote: true,
  enableMessage: false,
  enableSound: true,
  enableVibrate: true,
  muteList: [],
  onlyShowLatest: false,
  maxNotifications: 5,
  autoClose: 0,
  showMessageContent: true,
}

/**
 * 存储键
 */
export const CONFIG_KEY = 'chatlog_notification_config'
export const HISTORY_KEY = 'chatlog_notification_history'
export const NOTIFIED_KEY = 'chatlog_notified_messages'

/**
 * 历史记录最大长度
 */
export const MAX_HISTORY_LENGTH = 100

/**
 * 已通知 ID 集合最大数量
 */
export const MAX_NOTIFIED_IDS = 1000

export interface NotificationConfigContext {
  // State
  config: Ref<NotificationConfig>
  permission: Ref<PermissionStatus>
  history: Ref<NotificationItem[]>
  notifiedIds: Ref<Set<string>>
  activeNotifications: Ref<Map<string, Notification>>
  autoCloseTimers: ReturnType<typeof setTimeout>[]
  initialized: Ref<boolean>

  // Getters
  isEnabled: ComputedRef<boolean>
  needsPermission: ComputedRef<boolean>
  unreadCount: ComputedRef<number>
  recentNotifications: ComputedRef<(limit?: number) => NotificationItem[]>
  isMuted: ComputedRef<(talker: string) => boolean>

  // 配置管理
  loadConfig: () => void
  saveConfig: () => void
  updateConfig: (newConfig: Partial<NotificationConfig>) => void

  // $reset config 部分
  $resetConfig: () => void
}

export function useNotificationConfig(): NotificationConfigContext {
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
   * $reset config 部分
   */
  function $resetConfig() {
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
    autoCloseTimers,
    initialized,

    // Getters
    isEnabled,
    needsPermission,
    unreadCount,
    recentNotifications,
    isMuted,

    // 配置管理
    loadConfig,
    saveConfig,
    updateConfig,

    // $reset
    $resetConfig,
  }
}
