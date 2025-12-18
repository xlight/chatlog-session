import { toCST, formatCSTTime } from "@/utils/timezone"

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
  VoiceCall = 50,
  System = 10000,
  Revoke = 10002,
  Gap = 99999,
  EmptyRange = 99998,
  QQMail = 35,
}

/**
 * 富文本消息子类型枚举
 */
export enum RichMessageSubType {
  QQMusic = 3,
  VideoLink = 4,
  Link = 5,
  File = 6,
  CardPackage = 16,
  Forwarded = 19,
  MiniProgram = 33,
  ShoppingMiniProgram = 36,
  ShortVideo = 51,
  Jielong = 53,
  Refer = 57,
  Pat = 62,
  Live = 63,
  FileDownloading = 74,
  Transfer = 2000,
  RedPacket = 2001,
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
  [MessageType.VoiceCall]: '语音通话',
  [MessageType.System]: '系统消息',
  [MessageType.Revoke]: '撤回消息',
  [MessageType.Gap]: '虚拟间隙消息',
  [MessageType.EmptyRange]: '虚拟空范围消息',
  [MessageType.QQMail]: 'QQ邮箱消息',
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
  [MessageType.VoiceCall]: 'Phone',
  [MessageType.System]: 'Bell',
  [MessageType.Revoke]: 'RefreshLeft',
  [MessageType.Gap]: 'MoreFilled',
  [MessageType.EmptyRange]: 'RemoveFilled',
  [MessageType.QQMail]: 'Message',
}

/**
 * 消息类型映射（字符串键版本）
 */
export const MessageTypeMap: Record<string, string> = {
  '1': '文本',
  '2': '图片',
  '3': 'QQ音乐',
  '4': '视频链接',
  '8': '文件',
  '16': '微信卡包',
  '33': '小程序',
  '34': '语音',
  '35': 'QQ邮箱',
  '36': '购物小程序',
  '42': '个人名片',
  '43': '视频',
  '48': '位置',
  '50': '语音通话',
  '51': '小视频',
  '53': '接龙',
  '62': '拍一拍',
  '63': '直播',
  '2000': '转账',
  '2001': '红包'
}

/**
 * 消息图标映射（字符串键版本）
 */
export const MessageIconMap: Record<string, string> = {
  '1': 'ChatLineSquare',
  '2': 'Picture',
  '3': 'Headset',
  '4': 'VideoPlay',
  '8': 'Document',
  '16': 'Tickets',
  '33': 'Grid',
  '34': 'Microphone',
  '35': 'Message',
  '36': 'ShoppingCart',
  '42': 'User',
  '43': 'VideoPlay',
  '48': 'Location',
  '50': 'Phone',
  '51': 'VideoCameraFilled',
  '53': 'List',
  '62': 'Pointer',
  '63': 'VideoCamera',
  '2000': 'Wallet',
  '2001': 'Present'
}

/**
 * 文件大小单位
 */
export const FileSizeUnits = ['B', 'KB', 'MB', 'GB'] as const
export const FileSizeBase = 1024

/**
 * 创建 EmptyRange 消息
 */
export function createEmptyRangeMessage(
  talker: string,
  timeRange: string,
  newestMsgTime: string | undefined,
  triedTimes: number,
  suggestedBeforeTime: number
): Message {
  const startTime = parseTimeRangeStart(timeRange)
  const endTime = parseTimeRangeEnd(timeRange)
  const startDate = new Date(startTime)
  let endDate = new Date(endTime)
  if( newestMsgTime){
    endDate = new Date(newestMsgTime)
  }

  const startStr = formatCSTTime(startDate)
  const endStr = formatCSTTime(endDate)

  return {
    id: -Date.now() - 1000,
    seq: -1,
    time: toCST(startDate),
    createTime: startDate.getTime(),
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

/**
 * 创建 Gap 消息
 * Gap 消息标记指定时间范围内有数据需要加载
 * 
 * @param talker 会话 ID
 * @param gapStartTime Gap 起始时间（时间戳或 ISO 字符串）
 * @param gapEndTime Gap 结束时间（时间戳或 ISO 字符串）
 * @param estimatedCount 预估消息数量
 * @returns Gap 消息对象
 */
export function createGapMessage(
  talker: string,
  gapStartTime: string | number,
  gapEndTime: string | number,
  estimatedCount?: number
): Message {
  const startDate = typeof gapStartTime === 'string' 
    ? new Date(gapStartTime) 
    : new Date(gapStartTime)
  const endDate = typeof gapEndTime === 'string' 
    ? new Date(gapEndTime) 
    : new Date(gapEndTime)

  const startStr = formatCSTTime(startDate)
  const endStr = formatCSTTime(endDate)
  const timeRange = `${toCST(startDate)}~${toCST(endDate)}`

  const content = estimatedCount && estimatedCount > 0
    ? `${startStr} ~ ${endStr} 还有约 ${estimatedCount} 条消息`
    : `${startStr} ~ ${endStr} 还有更多消息`

  return {
    id: -Date.now(),
    seq: -1,
    time: toCST(startDate),
    createTime: startDate.getTime(),
    talker,
    talkerName: '',
    sender: '',
    senderName: '',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: MessageType.Gap,
    subType: 0,
    content,
    isGap: true,
    gapData: {
      timeRange,
      beforeTime: endDate.getTime(),
    },
  }
}
