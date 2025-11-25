/**
 * 消息类型枚举
 */
export enum MessageType {
  Text = 1,
  Image = 3,
  Voice = 34,
  ContactCard = 42,
  Video = 43,
  Emoji = 47,
  Location = 48,
  File = 49,
  System = 10000,
  Revoke = 10002,
  Gap = 99999,
  EmptyRange = 99998,
}

/**
 * 后端返回的消息数据结构
 */
export interface MessageResponse {
  seq: number
  time: string
  talker: string
  talkerName: string
  isChatRoom: boolean
  sender: string
  senderName: string
  isSelf: boolean
  type: number
  subType: number
  content: string
  contents?: {
    md5?: string
    title?: string
    url?: string
    [key: string]: any
  }
}

/**
 * 前端使用的消息接口
 */
export interface Message {
  id: number
  seq: number
  time: string
  createTime: number
  talker: string
  talkerName: string
  talkerAvatar?: string
  sender: string
  senderName: string
  isSelf: boolean
  isSend: number
  isChatRoom: boolean
  type: MessageType
  subType: number
  content: string
  contents?: {
    md5?: string
    title?: string
    url?: string
    [key: string]: any
  }
  imageUrl?: string
  videoUrl?: string
  voiceUrl?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  duration?: number
  // Gap 消息标识
  isGap?: boolean
  gapData?: {
    timeRange: string
    beforeTime: number
  }
  // EmptyRange 消息标识
  isEmptyRange?: boolean
  emptyRangeData?: {
    timeRange: string
    triedTimes: number
    suggestedBeforeTime: number
  }
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
  [MessageType.ContactCard]: '个人名片',
  [MessageType.Video]: '视频',
  [MessageType.Emoji]: '表情',
  [MessageType.Location]: '位置',
  [MessageType.File]: '文件',
  [MessageType.System]: '系统消息',
  [MessageType.Revoke]: '撤回消息',
  [MessageType.Gap]: '虚拟间隙消息',
  [MessageType.EmptyRange]: '虚拟空范围消息',
}

/**
 * 消息类型图标映射
 */
export const MessageTypeIcons: Record<MessageType, string> = {
  [MessageType.Text]: 'ChatLineSquare',
  [MessageType.Image]: 'Picture',
  [MessageType.Voice]: 'Microphone',
  [MessageType.ContactCard]: 'User',
  [MessageType.Video]: 'VideoCamera',
  [MessageType.Emoji]: 'Sunny',
  [MessageType.Location]: 'Location',
  [MessageType.File]: 'Document',
  [MessageType.System]: 'Bell',
  [MessageType.Revoke]: 'RefreshLeft',
  [MessageType.Gap]: 'MoreFilled',
  [MessageType.EmptyRange]: 'RemoveFilled',
}

/**
 * 创建 EmptyRange 消息
 */
export function createEmptyRangeMessage(
  talker: string,
  timeRange: string,
  triedTimes: number,
  suggestedBeforeTime: number
): Message {
  const startTime = parseTimeRangeStart(timeRange)
  const endTime = parseTimeRangeEnd(timeRange)
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)
  
  return {
    id: -Date.now() - 1000,
    seq: -1,
    time: new Date().toISOString(),
    createTime: Date.now(),
    talker,
    talkerName: '',
    sender: '',
    senderName: '',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: MessageType.EmptyRange,
    subType: 0,
    content: `${startStr} ~ ${endStr} 没有消息`,
    isEmptyRange: true,
    emptyRangeData: {
      timeRange,
      triedTimes,
      suggestedBeforeTime,
    },
  }
}

/**
 * 解析时间范围的起始时间
 */
export function parseTimeRangeStart(timeRange: string): number {
  const parts = timeRange.split('~')
  if (parts.length !== 2) {
    return Date.now()
  }
  return new Date(parts[0].trim()).getTime()
}

/**
 * 解析时间范围的结束时间
 */
export function parseTimeRangeEnd(timeRange: string): number {
  const parts = timeRange.split('~')
  if (parts.length !== 2) {
    return Date.now()
  }
  return new Date(parts[1].trim()).getTime()
}