/**
 * notification store - 组合入口
 *
 * 将 config/permission/history/sender/detector 子模块组合为统一的 useNotificationStore
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
import { useNotificationConfig } from './config'
import { useNotificationPermission } from './permission'
import { useNotificationHistory } from './history'
import { useNotificationSender } from './sender'
import { useNotificationDetector } from './detector'

// Re-export 通知类型供外部使用
export { NotificationType } from './config'
export type { NotificationItem, NotificationConfig, PermissionStatus } from './config'

export const useNotificationStore = defineStore('notification', () => {
  const config = useNotificationConfig()
  const permission = useNotificationPermission(config)
  const history = useNotificationHistory(config)
  const sender = useNotificationSender(config, history, permission)
  const detector = useNotificationDetector(config, sender)

  // ==================== 组合方法 ====================

  /**
   * 初始化
   */
  async function init() {
    if (config.initialized.value) {
      console.log('🔔 Notification store already initialized')
      return
    }

    config.loadConfig()
    history.loadHistory()
    history.loadNotifiedIds()
    await permission.checkPermission()

    // 监听 Service Worker 消息（通知点击事件）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'notification-click') {
          const { talker, messageId, message } = event.data
          sender.handleNotificationClick(messageId, talker, message)
        }
      })
    }

    config.initialized.value = true

    console.log('🔔 Notification store initialized', {
      permission: config.permission.value,
      enabled: config.config.value.enabled,
      isEnabled: config.isEnabled.value,
      myWxid: config.config.value.myWxid,
      enableMessage: config.config.value.enableMessage,
      enableMention: config.config.value.enableMention,
    })
  }

  /**
   * 获取统计信息
   */
  function getStats() {
    return {
      enabled: config.isEnabled.value,
      permission: config.permission.value,
      totalNotifications: config.history.value.length,
      unreadCount: config.unreadCount.value,
      activeCount: config.activeNotifications.value.size,
      muteCount: config.config.value.muteList.length,
      notifiedCount: config.notifiedIds.value.size,
      config: config.config.value,
    }
  }

  /**
   * $reset 方法：重置 store 到初始状态
   */
  function $reset() {
    config.autoCloseTimers.forEach(id => clearTimeout(id))
    config.autoCloseTimers.length = 0
    config.$resetConfig()
  }

  return {
    // State
    config: config.config,
    permission: config.permission,
    history: config.history,
    notifiedIds: config.notifiedIds,
    activeNotifications: config.activeNotifications,
    initialized: config.initialized,

    // Getters
    isEnabled: config.isEnabled,
    needsPermission: config.needsPermission,
    unreadCount: config.unreadCount,
    recentNotifications: config.recentNotifications,
    isMuted: config.isMuted,

    // Actions
    init,
    checkPermission: permission.checkPermission,
    requestPermission: permission.requestPermission,
    loadConfig: config.loadConfig,
    saveConfig: config.saveConfig,
    updateConfig: config.updateConfig,
    loadHistory: history.loadHistory,
    saveHistory: history.saveHistory,
    loadNotifiedIds: history.loadNotifiedIds,
    saveNotifiedIds: history.saveNotifiedIds,
    shouldNotify: detector.shouldNotify,
    isMentioned: detector.isMentioned,
    isQuoted: detector.isQuoted,
    notify: sender.notify,
    buildNotification: sender.buildNotification,
    getMessagePreview: sender.getMessagePreview,
    handleNotificationClick: sender.handleNotificationClick,
    addToHistory: history.addToHistory,
    markAsRead: history.markAsRead,
    markAllAsRead: history.markAllAsRead,
    clearHistory: history.clearHistory,
    closeAllNotifications: sender.closeAllNotifications,
    closeOldestNotification: sender.closeOldestNotification,
    mute: sender.mute,
    unmute: sender.unmute,
    toggleMute: sender.toggleMute,
    checkMessages: detector.checkMessages,
    testNotification: sender.testNotification,
    getStats,
    $reset,
  }
})
