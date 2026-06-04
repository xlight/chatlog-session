/**
 * Settings Store
 *
 * 统一管理所有应用设置，使用 pinia-plugin-persistedstate 自动持久化到 localStorage
 * 替代 Settings/index.vue 中手动 localStorage 逻辑
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ==================== 类型定义 ====================

export interface ApiSettingsData {
  apiBaseUrl: string
  apiTimeout: number
  apiRetryCount: number
  apiRetryDelay: number
  enableDebug: boolean
}

export interface AppearanceSettingsData {
  theme: string
  language: string
  fontSize: number
}

export interface NotificationSettingsData {
  enableNotifications: boolean
  enableMention: boolean
  enableQuote: boolean
  enableMessage: boolean
  enableSound: boolean
  enableVibrate: boolean
  onlyShowLatest: boolean
  autoCloseTime: number
  myWxid: string
  showMessageContent: boolean
}

export interface ChatSettingsData {
  showTimestamp: boolean
  showAvatar: boolean
  messageGrouping: boolean
  showMediaResources: boolean
  enableServerPinning: boolean
  autoRefresh: boolean
  autoRefreshInterval: number
}

export interface PrivacySettingsData {
  saveHistory: boolean
  autoDownloadMedia: boolean
  compressImages: boolean
}

export interface AdvancedSettingsData {
  enableDebug: boolean
  cacheSize: number
}

export type SendShortcut = 'enter' | 'ctrl-enter'

export interface SendmsgSettingsData {
  apiUrl: string
  enabled: boolean
  sendShortcut: SendShortcut
}

export interface AISettingsData {
  llmBaseUrl: string
  llmApiKey: string
  llmDefaultModel: string
  enabled: boolean
  privacyAcknowledged: boolean
}

// ==================== 默认值 ====================

const defaultApiSettings: ApiSettingsData = {
  apiBaseUrl: '',
  apiTimeout: 30000,
  apiRetryCount: 3,
  apiRetryDelay: 1000,
  enableDebug: false,
}

const defaultAppearanceSettings: AppearanceSettingsData = {
  theme: 'light',
  language: 'zh-CN',
  fontSize: 14,
}

const defaultNotificationSettings: NotificationSettingsData = {
  enableNotifications: true,
  enableMention: true,
  enableQuote: true,
  enableMessage: true,
  enableSound: true,
  enableVibrate: true,
  onlyShowLatest: false,
  autoCloseTime: 5,
  myWxid: '',
  showMessageContent: true,
}

const defaultChatSettings: ChatSettingsData = {
  showTimestamp: true,
  showAvatar: true,
  messageGrouping: true,
  showMediaResources: true,
  enableServerPinning: true,
  autoRefresh: false,
  autoRefreshInterval: 30,
}

const defaultPrivacySettings: PrivacySettingsData = {
  saveHistory: true,
  autoDownloadMedia: false,
  compressImages: true,
}

const defaultAdvancedSettings: AdvancedSettingsData = {
  enableDebug: false,
  cacheSize: 0,
}

const defaultSendmsgSettings: SendmsgSettingsData = {
  apiUrl: 'http://127.0.0.1:8765',
  enabled: false,
  sendShortcut: 'enter',
}

const defaultAISettings: AISettingsData = {
  llmBaseUrl: 'https://api.deepseek.com/v1',
  llmApiKey: '',
  llmDefaultModel: 'deepseek-chat',
  enabled: false,
  privacyAcknowledged: false,
}

export const useSettingsStore = defineStore('settings', () => {
  // ==================== State ====================

  const api = ref<ApiSettingsData>({ ...defaultApiSettings })
  const appearance = ref<AppearanceSettingsData>({ ...defaultAppearanceSettings })
  const notification = ref<NotificationSettingsData>({ ...defaultNotificationSettings })
  const chat = ref<ChatSettingsData>({ ...defaultChatSettings })
  const privacy = ref<PrivacySettingsData>({ ...defaultPrivacySettings })
  const advanced = ref<AdvancedSettingsData>({ ...defaultAdvancedSettings })
  const sendmsg = ref<SendmsgSettingsData>({ ...defaultSendmsgSettings })
  const ai = ref<AISettingsData>({ ...defaultAISettings })

  // ==================== Getters ====================

  /**
   * 合并所有设置为扁平对象（兼容 chatlog-settings 格式）
   */
  const allSettings = computed(() => ({
    ...api.value,
    ...appearance.value,
    ...notification.value,
    ...chat.value,
    ...privacy.value,
    ...advanced.value,
    ...sendmsg.value,
    ...ai.value,
  }))

  /**
   * API 基础 URL（去除末尾斜杠）
   */
  const normalizedApiBaseUrl = computed(() => {
    return api.value.apiBaseUrl.replace(/\/+$/, '')
  })

  // ==================== Actions ====================

  /**
   * 从 localStorage 的 chatlog-settings 格式加载（迁移兼容）
   * 仅在首次使用时调用，后续由 pinia-plugin-persistedstate 自动管理
   */
  function migrateFromLegacyStorage() {
    const legacySettings = localStorage.getItem('chatlog-settings')
    if (!legacySettings) return false

    try {
      const parsed = JSON.parse(legacySettings)

      // API 设置
      if (parsed.apiBaseUrl !== undefined) api.value.apiBaseUrl = parsed.apiBaseUrl
      if (parsed.apiTimeout !== undefined) api.value.apiTimeout = parsed.apiTimeout
      if (parsed.apiRetryCount !== undefined) api.value.apiRetryCount = parsed.apiRetryCount
      if (parsed.apiRetryDelay !== undefined) api.value.apiRetryDelay = parsed.apiRetryDelay
      if (parsed.enableDebug !== undefined) {
        api.value.enableDebug = parsed.enableDebug
        advanced.value.enableDebug = parsed.enableDebug
      }

      // 外观设置
      if (parsed.theme !== undefined) appearance.value.theme = parsed.theme
      if (parsed.language !== undefined) appearance.value.language = parsed.language
      if (parsed.fontSize !== undefined) appearance.value.fontSize = parsed.fontSize

      // 通知设置
      if (parsed.enableNotifications !== undefined) notification.value.enableNotifications = parsed.enableNotifications
      if (parsed.enableMention !== undefined) notification.value.enableMention = parsed.enableMention
      if (parsed.enableQuote !== undefined) notification.value.enableQuote = parsed.enableQuote
      if (parsed.enableMessage !== undefined) notification.value.enableMessage = parsed.enableMessage
      if (parsed.enableSound !== undefined) notification.value.enableSound = parsed.enableSound
      if (parsed.enableVibrate !== undefined) notification.value.enableVibrate = parsed.enableVibrate
      if (parsed.onlyShowLatest !== undefined) notification.value.onlyShowLatest = parsed.onlyShowLatest
      if (parsed.autoCloseTime !== undefined) notification.value.autoCloseTime = parsed.autoCloseTime
      if (parsed.myWxid !== undefined) notification.value.myWxid = parsed.myWxid
      if (parsed.showMessageContent !== undefined) notification.value.showMessageContent = parsed.showMessageContent

      // 聊天设置
      if (parsed.showTimestamp !== undefined) chat.value.showTimestamp = parsed.showTimestamp
      if (parsed.showAvatar !== undefined) chat.value.showAvatar = parsed.showAvatar
      if (parsed.messageGrouping !== undefined) chat.value.messageGrouping = parsed.messageGrouping
      if (parsed.showMediaResources !== undefined) chat.value.showMediaResources = parsed.showMediaResources
      if (parsed.enableServerPinning !== undefined) chat.value.enableServerPinning = parsed.enableServerPinning
      if (parsed.autoRefresh !== undefined) chat.value.autoRefresh = parsed.autoRefresh
      if (parsed.autoRefreshInterval !== undefined) chat.value.autoRefreshInterval = parsed.autoRefreshInterval

      // 隐私设置
      if (parsed.saveHistory !== undefined) privacy.value.saveHistory = parsed.saveHistory
      if (parsed.autoDownloadMedia !== undefined) privacy.value.autoDownloadMedia = parsed.autoDownloadMedia
      if (parsed.compressImages !== undefined) privacy.value.compressImages = parsed.compressImages

      // 高级设置
      if (parsed.cacheSize !== undefined) advanced.value.cacheSize = parsed.cacheSize

      // 独立 apiBaseUrl 优先
      const independentApiBaseUrl = localStorage.getItem('apiBaseUrl')
      if (independentApiBaseUrl) {
        api.value.apiBaseUrl = independentApiBaseUrl
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * 重置所有设置到默认值
   */
  function resetSettings() {
    api.value = { ...defaultApiSettings }
    appearance.value = { ...defaultAppearanceSettings }
    notification.value = { ...defaultNotificationSettings }
    chat.value = { ...defaultChatSettings }
    privacy.value = { ...defaultPrivacySettings }
    advanced.value = { ...defaultAdvancedSettings }
    sendmsg.value = { ...defaultSendmsgSettings }
    ai.value = { ...defaultAISettings }
  }

  /**
   * 同步 enableDebug 到 api 和 advanced
   */
  function syncEnableDebug(value: boolean) {
    api.value.enableDebug = value
    advanced.value.enableDebug = value
  }

  function $reset() {
    resetSettings()
  }

  return {
    // State
    api,
    appearance,
    notification,
    chat,
    privacy,
    advanced,
    sendmsg,
    ai,

    // Getters
    allSettings,
    normalizedApiBaseUrl,

    // Actions
    migrateFromLegacyStorage,
    resetSettings,
    syncEnableDebug,
    $reset,
  }
}, {
  persist: {
    key: 'chatlog-settings',
    pick: ['api', 'appearance', 'notification', 'chat', 'privacy', 'advanced', 'sendmsg', 'ai'],
  },
})
