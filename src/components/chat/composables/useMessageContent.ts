import { computed } from 'vue'
import type { Message } from '@/types'
import { MESSAGE_TYPE, RICH_MESSAGE_SUBTYPE } from './constants'

export function useMessageContent(message: Message) {
  // 消息内容类型判断
  const isTextMessage = computed(() => message.type === MESSAGE_TYPE.TEXT)
  const isImageMessage = computed(() => message.type === MESSAGE_TYPE.IMAGE)
  const isVoiceMessage = computed(() => message.type === MESSAGE_TYPE.VOICE)
  const isContactCardMessage = computed(() => message.type === MESSAGE_TYPE.CONTACT_CARD)
  const isVideoMessage = computed(() => message.type === MESSAGE_TYPE.VIDEO)
  const isEmojiMessage = computed(() => message.type === MESSAGE_TYPE.EMOJI)
  const isLocationMessage = computed(() => message.type === MESSAGE_TYPE.LOCATION)
  const isSystemMessage = computed(() => message.type === MESSAGE_TYPE.SYSTEM)
  const isRevokeMessage = computed(() => message.type === MESSAGE_TYPE.REVOKE)
  const isGapMessage = computed(() => message.type === MESSAGE_TYPE.GAP || message.isGap)
  const isEmptyRangeMessage = computed(() => message.type === MESSAGE_TYPE.EMPTY_RANGE || message.isEmptyRange)

  // type=49 的各种子类型
  const isQQMusicMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.QQMUSIC
  )
  const isCardPackageMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.CARDPACKAGE
  )
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
  const isLiveMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.LIVE
  )
  const isJielongMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.JIELONG
  )
  const isTransferMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.TRANSFER
  )
  const isRedPacketMessage = computed(
    () => message.type === MESSAGE_TYPE.RICH && message.subType === RICH_MESSAGE_SUBTYPE.REDPACKET
  )
  const isOtherRichMessage = computed(
    () =>
      message.type === MESSAGE_TYPE.RICH &&
      !isQQMusicMessage.value &&
      !isCardPackageMessage.value &&
      !isReferMessage.value &&
      !isLinkMessage.value &&
      !isForwardedMessage.value &&
      !isFileMessage.value &&
      !isMiniProgramMessage.value &&
      !isShoppingMiniProgramMessage.value &&
      !isShortVideoMessage.value &&
      !isPatMessage.value &&
      !isLiveMessage.value &&
      !isJielongMessage.value &&
      !isTransferMessage.value &&
      !isRedPacketMessage.value
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
    isContactCardMessage,
    isVideoMessage,
    isEmojiMessage,
    isLocationMessage,
    isSystemMessage,
    isRevokeMessage,
    isGapMessage,
    isEmptyRangeMessage,
    isQQMusicMessage,
    isCardPackageMessage,
    isReferMessage,
    isLinkMessage,
    isForwardedMessage,
    isFileMessage,
    isMiniProgramMessage,
    isShoppingMiniProgramMessage,
    isShortVideoMessage,
    isPatMessage,
    isLiveMessage,
    isJielongMessage,
    isTransferMessage,
    isRedPacketMessage,
    isOtherRichMessage,
    referMessage,
    referMessageType,
    isSelf
  }
}