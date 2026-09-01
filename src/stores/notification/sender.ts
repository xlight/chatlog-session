/**
 * notification store - sender 子模块
 *
 * 通知发送逻辑：Notification API 调用 + 声音/振动
 * 包含 buildNotification / getMessagePreview / handleNotificationClick
 * 包含 closeAllNotifications / closeOldestNotification
 * 包含 mute / unmute / toggleMute
 * 包含 testNotification
 */
import { useAppStore } from '../app'
import { useContactStore } from '../contact'
import { usePWAStore } from '../pwa'
import { NotificationType, MAX_NOTIFIED_IDS } from './config'
import type { NotificationConfigContext } from './config'
import type { NotificationHistory } from './history'
import type { NotificationPermission } from './permission'
import type { Message } from '@/types/message'

export interface NotificationSender {
  notify: (
    type: NotificationType,
    talker: string,
    talkerName: string,
    message: Message
  ) => Promise<void>
  buildNotification: (
    type: NotificationType,
    talkerName: string,
    message: Message
  ) => { title: string; body: string; icon: string }
  getMessagePreview: (message: Message) => string
  handleNotificationClick: (messageId: string, talker: string, message: Message) => void
  closeAllNotifications: () => void
  closeOldestNotification: () => void
  mute: (talker: string) => void
  unmute: (talker: string) => void
  toggleMute: (talker: string) => boolean
  testNotification: () => Promise<boolean>
}

export function useNotificationSender(
  ctx: NotificationConfigContext,
  history: NotificationHistory,
  permission: NotificationPermission
): NotificationSender {
  const {
    config,
    permission: permissionRef,
    activeNotifications,
    autoCloseTimers,
    notifiedIds,
    isEnabled,
    isMuted,
    saveConfig,
  } = ctx
  const { addToHistory, saveHistory, saveNotifiedIds } = history
  const { requestPermission } = permission

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
   * 处理通知点击
   */
  function handleNotificationClick(messageId: string, talker: string, message: Message) {
    // 标记为已点击
    const item = ctx.history.value.find(h => h.id === messageId)
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
          console.log('🔔 Fallback Notification created:', { title, body, talker, permission: permissionRef.value, isEnabled: isEnabled.value })
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
      if (notifiedIds.value.size > MAX_NOTIFIED_IDS) {
        const arr = Array.from(notifiedIds.value)
        notifiedIds.value = new Set(arr.slice(-MAX_NOTIFIED_IDS))
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
   * 测试通知
   */
  async function testNotification(): Promise<boolean> {
    const appStore = useAppStore()

    if (appStore.isDebug) {
      console.log('🔔 Testing notification...', {
        permission: permissionRef.value,
        enabled: config.value.enabled,
        isEnabled: isEnabled.value
      })
    }

    // 检查权限
    if (permissionRef.value !== 'granted') {
      console.warn('⚠️ Notification permission not granted, requesting...')
      const result = await requestPermission()
      if (result !== 'granted') {
        console.error('❌ Notification permission denied')
        return false
      }
    }

    if (permissionRef.value === 'granted') {
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

  return {
    notify,
    buildNotification,
    getMessagePreview,
    handleNotificationClick,
    closeAllNotifications,
    closeOldestNotification,
    mute,
    unmute,
    toggleMute,
    testNotification,
  }
}
