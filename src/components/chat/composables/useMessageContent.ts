import { computed } from 'vue'
import type { Message } from '@/types'
import { MESSAGE_TYPE, RICH_MESSAGE_SUBTYPE } from './constants'

export function useMessageContent(message: Message) {
  // 消息内容类型判断
  const isTextMessage = computed(() => message.type === MESSAGE_TYPE.TEXT)
  const isImageMessage = computed(() => message.type === MESSAGE_TYPE.IMAGE)
  const isVoiceMessage = computed(() => message.type === MESSAGE_TYPE.VOICE)
  const isVideoMessage = computed(() => message.type === MESSAGE_TYPE.VIDEO)
  const isEmojiMessage = computed(() => message.type === MESSAGE_TYPE.EMOJI)
  const isSystemMessage = computed(() => message.type === MESSAGE_TYPE.SYSTEM)

  // type=49 的各种子类型
  const isReferMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.REFER
  )
  const isLinkMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.LINK
  )
  const isForwardedMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.FORWARDED
  )
  const isFileMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.FILE
  )
  const isMiniProgramMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.MINIPROGRAM
  )
  const isShoppingMiniProgramMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.SHOPPINGMINIPROGRAM
  )
  const isShortVideoMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.SHORTVIDEO
  )
  const isPatMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.PAT
  )
  const isOtherRichMessage = computed(
    () =>
      message.type === MESSAGE_TYPE.RICH &&
      !isReferMessage.value &&
      !isLinkMessage.value &&
      !isForwardedMessage.value &&
      !isFileMessage.value &&
      !isMiniProgramMessage.value &&
      !isShoppingMiniProgramMessage.value &&
      !isShortVideoMessage.value &&
      !isPatMessage.value
  )

  // 引用消息内容
  const referMessage = computed(() => {
    return message.contents?.refer
  })

  // 判断引用消息的类型
  const referMessageType = computed(() => {
    if (!referMessage.value) return null
    const refer = referMessage.value
    if (refer.type === MESSAGE_TYPE.IMAGE) return 'image'
    if (refer.type === MESSAGE_TYPE.RICH && refer.subType === RICH_MESSAGE_SUBTYPE.LINK)
      return 'link'
    return 'text'
  })

  // 是否是自己发送的消息
  const isSelf = computed(() => message.isSelf)

  return {
    isTextMessage,
    isImageMessage,
    isVoiceMessage,
    isVideoMessage,
    isEmojiMessage,
    isSystemMessage,
    isReferMessage,
    isLinkMessage,
    isForwardedMessage,
    isFileMessage,
    isMiniProgramMessage,
    isShoppingMiniProgramMessage,
    isShortVideoMessage,
    isPatMessage,
    isOtherRichMessage,
    referMessage,
    referMessageType,
    isSelf
  }
}