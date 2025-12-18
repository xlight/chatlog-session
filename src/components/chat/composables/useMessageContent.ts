import { computed } from 'vue'
import type { Message } from '@/types'
import { MessageType, RichMessageSubType } from '@/types/message'

export function useMessageContent(message: Message) {
  // 消息内容类型判断
  const isTextMessage = computed(() => message.type === MessageType.Text)
  const isImageMessage = computed(() => message.type === MessageType.Image)
  const isVoiceMessage = computed(() => message.type === MessageType.Voice)
  const isContactCardMessage = computed(() => message.type === MessageType.ContactCard)
  const isVideoMessage = computed(() => message.type === MessageType.Video)
  const isEmojiMessage = computed(() => message.type === MessageType.Emoji)
  const isLocationMessage = computed(() => message.type === MessageType.Location)
  const isSystemMessage = computed(() => message.type === MessageType.System)
  const isRevokeMessage = computed(() => message.type === MessageType.Revoke)
  const isGapMessage = computed(() => message.type === MessageType.Gap || message.isGap)
  const isEmptyRangeMessage = computed(() => message.type === MessageType.EmptyRange || message.isEmptyRange)
  const isQQMailMessage = computed(() => message.type === MessageType.QQMail)
  const isVoiceCallMessage = computed(() => message.type === MessageType.VoiceCall)

  // type=49 的各种子类型
  const isQQMusicMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.QQMusic
  )
  const isVideoLinkMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.VideoLink
  )
  const isCardPackageMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.CardPackage
  )
  const isReferMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Refer
  )
  const isLinkMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Link
  )
  const isForwardedMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Forwarded
  )
  const isFileMessage = computed(
    () =>
      message.type === MessageType.File &&
      (message.subType === RichMessageSubType.File ||
        message.subType === RichMessageSubType.FileDownloading)
  )
  const isMiniProgramMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.MiniProgram
  )
  const isShoppingMiniProgramMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.ShoppingMiniProgram
  )
  const isShortVideoMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.ShortVideo
  )
  const isPatMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Pat
  )
  const isLiveMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Live
  )
  const isJielongMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Jielong
  )
  const isTransferMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.Transfer
  )
  const isRedPacketMessage = computed(
    () => message.type === MessageType.File && message.subType === RichMessageSubType.RedPacket
  )
  const isOtherRichMessage = computed(
    () =>
      message.type === MessageType.File &&
      !isQQMusicMessage.value &&
      !isVideoLinkMessage.value &&
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
    if (refer.type === MessageType.Image) return 'image'
    if (refer.type === MessageType.File && refer.subType === RichMessageSubType.Link)
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
    isVideoLinkMessage,
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
    isQQMailMessage,
    isVoiceCallMessage,
    isOtherRichMessage,
    referMessage,
    referMessageType,
    isSelf
  }
}