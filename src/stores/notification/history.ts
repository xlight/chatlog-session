/**
 * notification store - history 子模块
 *
 * 通知历史记录与去重 + 已通知 ID 集合管理
 * 补充 TTL + 最大长度限制，避免无限增长
 */
import {
  HISTORY_KEY,
  NOTIFIED_KEY,
  MAX_HISTORY_LENGTH,
  MAX_NOTIFIED_IDS,
} from './config'
import type { NotificationConfigContext, NotificationItem, NotificationType } from './config'
import type { Message } from '@/types/message'

export interface NotificationHistory {
  loadHistory: () => void
  saveHistory: () => void
  loadNotifiedIds: () => void
  saveNotifiedIds: () => void
  addToHistory: (
    type: NotificationType,
    talker: string,
    talkerName: string,
    message: Message
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearHistory: () => void
}

export function useNotificationHistory(
  ctx: NotificationConfigContext
): NotificationHistory {
  const { history, notifiedIds } = ctx

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
        .slice(0, MAX_HISTORY_LENGTH)

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
      const ids = Array.from(notifiedIds.value).slice(-MAX_NOTIFIED_IDS)  // 只保留最近 1000 个
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids))
    } catch (error) {
      console.error('Failed to save notified IDs:', error)
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
    if (history.value.length > MAX_HISTORY_LENGTH) {
      history.value = history.value.slice(0, MAX_HISTORY_LENGTH)
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

  return {
    loadHistory,
    saveHistory,
    loadNotifiedIds,
    saveNotifiedIds,
    addToHistory,
    markAsRead,
    markAllAsRead,
    clearHistory,
  }
}
