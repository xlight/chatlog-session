import type { Message } from './message'

/**
 * 虚拟列表项联合类型
 * 将日期分隔符、消息、Gap、EmptyRange、加载指示器统一为扁平列表项
 */
export type VirtualListItem =
  | { type: 'date'; key: string; date: string; formattedDate: string; count: number }
  | { type: 'message'; key: string; message: Message; showAvatar: boolean; showTime: boolean; showName: boolean }
  | { type: 'gap'; key: string; message: Message }
  | { type: 'empty-range'; key: string; message: Message }
  | { type: 'load-more'; key: string }
  | { type: 'no-more'; key: string }
  | { type: 'bottom-hint'; key: string }
