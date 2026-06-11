import { MessageType, RichMessageSubType } from '@/types/message'
import type { Message } from '@/types/message'

/**
 * 消息类型配置接口
 */
export interface MessageTypeConfig {
  // 匹配条件
  type: number
  subType?: number

  // UI 配置
  name: string
  icon: string
  placeholder: string

  // 组件配置
  component: string

  // Props 映射配置
  // message: 消息对象
  // context: 上下文对象，包含 showMediaResources、referMessage、referMessageType 和所有 URL 字段的值（非 ComputedRef）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  propsMapper?: (message: any, context: any) => Record<string, any>

  // 优先级（数字越大优先级越高，用于解决匹配冲突）
  priority?: number
}

/**
 * 消息类型配置列表
 * 按照优先级和常见程度排序
 */
export const MESSAGE_TYPE_CONFIGS: MessageTypeConfig[] = [
  // ==================== 基础消息类型 ====================
  {
    type: MessageType.Text,
    name: '文本',
    icon: 'ChatLineSquare',
    placeholder: '',
    component: 'TextMessage',
    priority: 100,
    propsMapper: msg => ({ content: msg.content }),
  },

  {
    type: MessageType.Image,
    name: '图片',
    icon: 'Picture',
    placeholder: '[图片]',
    component: 'ImageMessage',
    priority: 100,
    propsMapper: (msg, ctx) => ({
      thumbUrl: ctx.imageThumbUrl,
      imageUrl: ctx.imageUrl,
      imageList: ctx.imagePreviewList,
      initialIndex: ctx.imagePreviewIndex,
      showMediaResources: ctx.showMediaResources,
      md5: msg.contents?.md5,
    }),
  },

  {
    type: MessageType.Voice,
    name: '语音',
    icon: 'Microphone',
    placeholder: '[语音]',
    component: 'VoiceMessage',
    priority: 100,
    propsMapper: (msg, ctx) => ({
      voiceUrl: ctx.voiceUrl,
      duration: msg.duration,
      isSelf: msg.isSelf,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.Video,
    name: '视频',
    icon: 'VideoCamera',
    placeholder: '[视频]',
    component: 'VideoMessage',
    priority: 100,
    propsMapper: (msg, ctx) => ({
      videoUrl: ctx.videoUrl,
      showMediaResources: ctx.showMediaResources,
      content: msg.content,
      md5: msg.contents?.md5,
      thumbUrl: ctx.videoThumbUrl,
      imageUrl: ctx.videoUrl,
      imageList: ctx.videoPreviewList,
      initialIndex: ctx.videoPreviewIndex,
      mediaType: 'video',
    }),
  },

  {
    type: MessageType.Emoji,
    name: '表情',
    icon: 'Sunny',
    placeholder: '[表情]',
    component: 'EmojiMessage',
    priority: 100,
    propsMapper: (msg, ctx) => ({
      emojiUrl: ctx.emojiUrl,
      showMediaResources: ctx.showMediaResources,
      cdnurl: msg.contents?.cdnurl,
    }),
  },

  {
    type: MessageType.ContactCard,
    name: '个人名片',
    icon: 'User',
    placeholder: '[个人名片]',
    component: 'ContactCardMessage',
    priority: 100,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.Location,
    name: '位置',
    icon: 'Location',
    placeholder: '[位置]',
    component: 'LocationMessage',
    priority: 100,
    propsMapper: (_msg, ctx) => ({
      label: ctx.locationLabel,
      x: ctx.locationX,
      y: ctx.locationY,
      cityname: ctx.locationCityname,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.QQMail,
    name: 'QQ邮箱消息',
    icon: 'Message',
    placeholder: '[QQ邮箱]',
    component: 'QQMailMessage',
    priority: 100,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.VoiceCall,
    name: '语音通话',
    icon: 'Phone',
    placeholder: '[语音通话]',
    component: 'VoiceCallMessage',
    priority: 100,
    propsMapper: (msg, ctx) => ({
      content: msg.content,
      isSelf: msg.isSelf,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  // ==================== 富文本消息类型 (type=49) ====================
  {
    type: MessageType.File,
    subType: RichMessageSubType.QQMusic,
    name: 'QQ音乐',
    icon: 'Headset',
    placeholder: '[QQ音乐]',
    component: 'QQMusicMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Text,
    name: '链接',
    icon: 'Link',
    placeholder: '[链接]',
    component: 'LinkMessage',
    priority: 90,
    // subType=1 时 contents.title 存放的是 URL，contents.url 为空
    propsMapper: (msg, ctx) => {
      const url = msg.contents?.title || msg.contents?.url || msg.fileUrl || ''
      let title = '链接'
      try {
        if (url) title = new URL(url).hostname
      } catch {}
      return {
        linkTitle: title,
        linkUrl: url,
        showMediaResources: ctx.showMediaResources,
      }
    },
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.VideoLink,
    name: '视频链接',
    icon: 'VideoPlay',
    placeholder: '[视频链接]',
    component: 'LinkMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      linkTitle: ctx.linkTitle,
      linkUrl: ctx.linkUrl,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Link,
    name: '链接',
    icon: 'Link',
    placeholder: '[链接]',
    component: 'LinkMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      linkTitle: ctx.linkTitle,
      linkUrl: ctx.linkUrl,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.File,
    name: '文件',
    icon: 'Document',
    placeholder: '[文件]',
    component: 'FileMessage',
    priority: 90,
    propsMapper: (msg, ctx) => ({
      fileUrl: ctx.fileUrl,
      fileName: ctx.fileName,
      fileSize: msg.fileSize,
      showMediaResources: ctx.showMediaResources,
      md5: msg.contents?.md5,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.FileDownloading,
    name: '文件',
    icon: 'Document',
    placeholder: '[文件]',
    component: 'FileMessage',
    priority: 90,
    propsMapper: (msg, ctx) => ({
      fileUrl: ctx.fileUrl,
      fileName: ctx.fileName,
      fileSize: msg.fileSize,
      showMediaResources: ctx.showMediaResources,
      md5: msg.contents?.md5,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.EmojiNotDownloaded,
    name: '表情包(未下载)',
    icon: 'PictureFilled',
    placeholder: '[表情包(未下载)]',
    component: 'EmojiNotDownloadedMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.CardPackage,
    name: '微信卡包',
    icon: 'Tickets',
    placeholder: '[微信卡包]',
    component: 'CardPackageMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Forwarded,
    name: '聊天记录',
    icon: 'ChatDotSquare',
    placeholder: '[聊天记录]',
    component: 'ForwardedMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      forwardedTitle: ctx.forwardedTitle,
      forwardedDesc: ctx.forwardedDesc,
      forwardedCount: ctx.forwardedCount,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Favorite,
    name: '收藏',
    icon: 'Star',
    placeholder: '[收藏]',
    component: 'FavoriteMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      favoriteTitle: ctx.favoriteTitle,
      favoriteDesc: ctx.favoriteDesc,
      favoriteCount: ctx.favoriteCount,
      favoriteTypes: ctx.favoriteTypes,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.MiniProgram,
    name: '小程序',
    icon: 'Grid',
    placeholder: '[小程序]',
    component: 'MiniProgramMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      title: ctx.miniProgramTitle,
      url: ctx.miniProgramUrl,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.ShoppingMiniProgram,
    name: '购物小程序',
    icon: 'ShoppingCart',
    placeholder: '[购物小程序]',
    component: 'ShoppingMiniProgramMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      title: ctx.shoppingMiniProgramTitle,
      url: ctx.shoppingMiniProgramUrl,
      desc: ctx.shoppingMiniProgramDesc,
      thumbUrl: ctx.shoppingMiniProgramThumb,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.ShortVideo,
    name: '小视频',
    icon: 'VideoCameraFilled',
    placeholder: '[小视频]',
    component: 'ShortVideoMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      title: ctx.shortVideoTitle,
      videoUrl: ctx.shortVideoUrl,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Jielong,
    name: '接龙',
    icon: 'List',
    placeholder: '[接龙]',
    component: 'JielongMessage',
    priority: 90,
    propsMapper: (msg, ctx) => ({
      content: msg.content,
      contents: msg.contents,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Pat,
    name: '拍一拍',
    icon: 'Pointer',
    placeholder: '[拍一拍]',
    component: 'PatMessage',
    priority: 95, // 拍一拍需要特殊渲染，优先级更高
    propsMapper: (msg, ctx) => ({
      content: msg.content,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Live,
    name: '直播',
    icon: 'VideoCamera',
    placeholder: '[直播]',
    component: 'LiveMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      title: ctx.liveTitle,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Transfer,
    name: '转账',
    icon: 'Wallet',
    placeholder: '[转账]',
    component: 'TransferMessage',
    priority: 90,
    propsMapper: (msg, ctx) => ({
      content: msg.content,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.RedPacket,
    name: '红包',
    icon: 'Present',
    placeholder: '[红包]',
    component: 'RedPacketMessage',
    priority: 90,
    propsMapper: (_msg, ctx) => ({
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    subType: RichMessageSubType.Refer,
    name: '引用消息',
    icon: 'ChatLineSquare',
    placeholder: '[引用消息]',
    component: 'ReferMessage',
    priority: 90,
    propsMapper: (msg, ctx) => ({
      message: msg,
      referMessage: ctx.referMessage,
      referMessageType: ctx.referMessageType,
      showMediaResources: ctx.showMediaResources,
    }),
  },

  {
    type: MessageType.File,
    name: '富文本消息',
    icon: 'DocumentCopy',
    placeholder: '[富文本消息]',
    component: 'TextMessage',
    priority: 10,
    propsMapper: msg => ({
      content: msg.content || `[富文本消息] subType=${msg.subType}`,
    }),
  },
]

/**
 * 根据消息类型和子类型查找配置
 */
export function findMessageTypeConfig(
  type: number,
  subType?: number
): MessageTypeConfig | undefined {
  // 先查找精确匹配（type + subType）
  const exactMatch = MESSAGE_TYPE_CONFIGS.find(
    config => config.type === type && config.subType === subType
  )
  if (exactMatch) return exactMatch

  // 如果没有精确匹配，查找只匹配 type 的配置
  const typeMatch = MESSAGE_TYPE_CONFIGS.find(
    config => config.type === type && config.subType === undefined
  )
  return typeMatch
}

/**
 * 获取消息占位符文本
 */
export function getMessagePlaceholder(type: number, subType?: number, fileName?: string): string {
  const config = findMessageTypeConfig(type, subType)

  // 文件类型特殊处理，包含文件名
  if (
    type === MessageType.File &&
    (subType === RichMessageSubType.File || subType === RichMessageSubType.FileDownloading) &&
    fileName
  ) {
    return `[文件] ${fileName}`
  }

  return config?.placeholder || '[未知消息]'
}

/**
 * 获取消息类型名称
 */
export function getMessageTypeName(type: number, subType?: number): string {
  const config = findMessageTypeConfig(type, subType)
  return config?.name || '未知消息'
}

/**
 * 获取消息类型图标
 */
export function getMessageTypeIcon(type: number, subType?: number): string {
  const config = findMessageTypeConfig(type, subType)
  return config?.icon || 'ChatLineSquare'
}

/**
 * 创建类型映射表（用于向后兼容）
 */
export function createTypeMap(): Record<string, string> {
  const map: Record<string, string> = {}
  MESSAGE_TYPE_CONFIGS.forEach(config => {
    const key = config.subType !== undefined ? `${config.type}-${config.subType}` : `${config.type}`
    map[key] = config.name
  })
  return map
}

/**
 * 创建图标映射表（用于向后兼容）
 */
export function createIconMap(): Record<string, string> {
  const map: Record<string, string> = {}
  MESSAGE_TYPE_CONFIGS.forEach(config => {
    const key = config.subType !== undefined ? `${config.type}-${config.subType}` : `${config.type}`
    map[key] = config.icon
  })
  return map
}

// ==================== AI 上下文消息摘要 ====================

/** 生成消息的文本摘要，用于 AI 上下文投喂。文本消息返回 content，非文本消息调用 getMessagePlaceholder 并追加额外信息 */
export function getMessageSummary(msg: Message): string {
  if (msg.type === MessageType.Text) return msg.content || ''

  // 引用消息特殊处理：发言人+引文嵌入括号内
  if (msg.type === MessageType.File && msg.subType === RichMessageSubType.Refer) {
    return buildReferSummary(msg)
  }

  // 链接消息特殊处理：markdown 链接格式
  if (
    msg.type === MessageType.File &&
    (msg.subType === RichMessageSubType.Text ||
      msg.subType === RichMessageSubType.Link ||
      msg.subType === RichMessageSubType.VideoLink)
  ) {
    return buildLinkSummary(msg)
  }

  const base = getMessagePlaceholder(msg.type, msg.subType, msg.fileName)
  const detail = extractMessageDetail(msg)
  return detail ? `${base} ${detail}` : base
}

function buildReferSummary(msg: Message): string {
  const referSender = msg.contents?.refer?.senderName || msg.contents?.refer?.sender || ''
  const referContent = msg.contents?.refer?.content || msg.contents?.title || ''
  const replyContent = msg.content || ''

  const senderPart = referSender ? ` @${referSender}` : ''
  const quotePart = referContent ? `: "${referContent}"` : ''
  const bracket = `[引用消息${senderPart}${quotePart}]`

  return replyContent ? `${bracket} ${replyContent}` : bracket
}

function buildLinkSummary(msg: Message): string {
  const title = msg.contents?.title
  const url = msg.contents?.url

  // subType=1 (RichMessageSubType.Text): contents.title 就是 URL，contents.url 为空
  if (msg.subType === RichMessageSubType.Text) {
    return title ? `[链接](${title})` : '[链接]'
  }

  // subType=4 (VideoLink) 或 subType=5 (Link)
  const label = msg.subType === RichMessageSubType.VideoLink ? '视频链接' : '链接'
  if (title && url) return `[${label}：${title}](${url})`
  if (url) return `[${label}](${url})`
  if (title) return `[${label}：${title}]`
  return ''
}

function extractMessageDetail(msg: Message): string {
  switch (msg.type) {
    case MessageType.Voice:
      return msg.duration ? `${msg.duration}秒` : ''

    case MessageType.Location:
      return msg.contents?.label || msg.contents?.title || ''

    case MessageType.File:
      return extractFileDetail(msg)

    case MessageType.VoiceCall:
    case MessageType.System:
      return msg.content || ''

    default:
      return ''
  }
}

function extractFileDetail(msg: Message): string {
  switch (msg.subType) {
    case RichMessageSubType.Forwarded: {
      const count = msg.contents?.recordInfo?.DataList?.Count
      const countStr = count ? `(${parseInt(count)}条)` : ''
      return `${msg.contents?.title || ''}${countStr}`.trim()
    }

    case RichMessageSubType.MiniProgram:
    case RichMessageSubType.ShoppingMiniProgram:
    case RichMessageSubType.ShortVideo:
    case RichMessageSubType.Live:
      return msg.contents?.title || ''

    case RichMessageSubType.Pat:
    case RichMessageSubType.Transfer:
      return msg.content || ''

    case RichMessageSubType.QQMusic:
    case RichMessageSubType.CardPackage:
    case RichMessageSubType.Favorite:
    case RichMessageSubType.Jielong:
    case RichMessageSubType.RedPacket:
    case RichMessageSubType.EmojiNotDownloaded:
    case RichMessageSubType.FileDownloading:
      return ''

    default:
      return ''
  }
}
