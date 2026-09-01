/**
 * notification store - detector 子模块
 *
 * 消息检测与触发条件判断
 * 包含 shouldNotify / isMentioned / isQuoted / checkMessages
 */
import { useContactStore } from '../contact'
import { NotificationType } from './config'
import type { NotificationConfigContext } from './config'
import type { NotificationSender } from './sender'
import type { Message } from '@/types/message'

export interface NotificationDetector {
  shouldNotify: (message: Message, talker: string, myWxid?: string) => NotificationType | null
  isMentioned: (message: Message, myWxid?: string) => boolean
  isQuoted: (message: Message, myWxid?: string) => boolean
  checkMessages: (
    messages: Message[],
    talker: string,
    talkerName: string,
    myWxid?: string
  ) => Promise<void>
}

export function useNotificationDetector(
  ctx: NotificationConfigContext,
  sender: NotificationSender
): NotificationDetector {
  const { config, notifiedIds, isEnabled, isMuted } = ctx
  const { notify } = sender

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
   * 检测消息是否需要通知
   */
  function shouldNotify(message: Message, talker: string, myWxid?: string): NotificationType | null {
    // 如果未启用通知
    if (!isEnabled.value) {
      console.log('🔔 shouldNotify: disabled', { enabled: config.value.enabled, permission: ctx.permission.value })
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

  return {
    shouldNotify,
    isMentioned,
    isQuoted,
    checkMessages,
  }
}
