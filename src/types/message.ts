/**
 * 消息类型枚举
 */
export enum MessageType {
  Text = 1,
  Image = 3,
  Voice = 34,
  Video = 43,
  Emoji = 47,
  File = 49,
  System = 10000,
  Revoke = 10002,
}

/**
 * 消息接口
 */
export interface Message {
  seq: number
  time: string
  talker: string
  talkerName: string
  sender: string
  senderName: string
  isSelf: boolean
  isChatRoom: boolean
  type: MessageType
  subType: number
  content: string
  imageUrl?: string
  videoUrl?: string
  voiceUrl?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  duration?: number
}

/**
 * 消息分组（按日期）
 */
export interface MessageGroup {
  date: string
  messages: Message[]
}

/**
 * 消息内容类型
 */
export interface MessageContent {
  text?: string
  url?: string
  fileName?: string
  fileSize?: number
  duration?: number
  width?: number
  height?: number
}

/**
 * 消息类型显示名称映射
 */
export const MessageTypeNames: Record<MessageType, string> = {
  [MessageType.Text]: '文本',
  [MessageType.Image]: '图片',
  [MessageType.Voice]: '语音',
  [MessageType.Video]: '视频',
  [MessageType.Emoji]: '表情',
  [MessageType.File]: '文件',
  [MessageType.System]: '系统消息',
  [MessageType.Revoke]: '撤回消息',
}

/**
 * 消息类型图标映射
 */
export const MessageTypeIcons: Record<MessageType, string> = {
  [MessageType.Text]: 'ChatLineSquare',
  [MessageType.Image]: 'Picture',
  [MessageType.Voice]: 'Microphone',
  [MessageType.Video]: 'VideoCamera',
  [MessageType.Emoji]: 'Sunny',
  [MessageType.File]: 'Document',
  [MessageType.System]: 'Bell',
  [MessageType.Revoke]: 'RefreshLeft',
}