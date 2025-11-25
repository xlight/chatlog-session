// 消息类型常量
export const MESSAGE_TYPE = {
  TEXT: 1,
  IMAGE: 3,
  VOICE: 34,
  CONTACT_CARD: 42,
  VIDEO: 43,
  EMOJI: 47,
  LOCATION: 48,
  RICH: 49,
  SYSTEM: 10000,
  REVOKE: 10002,
  GAP: 99999,
  EMPTY_RANGE: 99998
} as const

// 富文本消息子类型
export const RICH_MESSAGE_SUBTYPE = {
  QQMUSIC: 3,
  LINK: 5,
  FILE: 6,
  CARDPACKAGE: 16,
  FORWARDED: 19,
  MINIPROGRAM: 33,
  SHOPPINGMINIPROGRAM: 36,
  SHORTVIDEO: 51,
  JIELONG: 53,
  REFER: 57,
  PAT: 62,
  LIVE: 63,
  TRANSFER: 2000,
  REDPACKET: 2001
} as const

// 消息类型映射
export const MESSAGE_TYPE_MAP: Record<string, string> = {
  '1': '文本',
  '2': '图片',
  '3': 'QQ音乐',
  '8': '文件',
  '16': '微信卡包',
  '33': '小程序',
  '34': '语音',
  '36': '购物小程序',
  '42': '个人名片',
  '43': '视频',
  '48': '位置',
  '51': '小视频',
  '53': '接龙',
  '62': '拍一拍',
  '63': '直播',
  '2000': '转账',
  '2001': '红包'
}

// 消息图标映射
export const MESSAGE_ICON_MAP: Record<string, string> = {
  '1': 'ChatLineSquare',
  '2': 'Picture',
  '3': 'Headset',
  '8': 'Document',
  '16': 'Tickets',
  '33': 'Grid',
  '34': 'Microphone',
  '36': 'ShoppingCart',
  '42': 'User',
  '43': 'VideoPlay',
  '48': 'Location',
  '51': 'VideoCameraFilled',
  '53': 'List',
  '62': 'Pointer',
  '63': 'VideoCamera',
  '2000': 'Wallet',
  '2001': 'Present'
}

// 文件大小单位
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const
export const FILE_SIZE_BASE = 1024