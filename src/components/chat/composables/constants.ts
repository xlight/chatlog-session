// 消息类型常量
export const MESSAGE_TYPE = {
  TEXT: 1,
  IMAGE: 3,
  VOICE: 34,
  VIDEO: 43,
  EMOJI: 47,
  RICH: 49,
  SYSTEM: 10000
} as const

// 富文本消息子类型
export const RICH_MESSAGE_SUBTYPE = {
  LINK: 5,
  FILE: 6,
  FORWARDED: 19,
  MINIPROGRAM: 33,
  SHOPPINGMINIPROGRAM: 36,
  SHORTVIDEO: 51,
  REFER: 57,
  PAT: 62
} as const

// 消息类型映射
export const MESSAGE_TYPE_MAP: Record<string, string> = {
  '1': '文本',
  '2': '图片',
  '3': '图片',
  '8': '文件',
  '33': '小程序',
  '34': '语音',
  '36': '购物小程序',
  '43': '视频',
  '51': '小视频',
  '62': '拍一拍'
}

// 消息图标映射
export const MESSAGE_ICON_MAP: Record<string, string> = {
  '1': 'ChatLineSquare',
  '2': 'Picture',
  '3': 'Picture',
  '8': 'Document',
  '33': 'Grid',
  '34': 'Microphone',
  '36': 'ShoppingCart',
  '43': 'VideoPlay',
  '51': 'VideoCameraFilled',
  '62': 'Pointer'
}

// 文件大小单位
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const
export const FILE_SIZE_BASE = 1024