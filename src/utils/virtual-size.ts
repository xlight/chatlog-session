import type { Message } from '@/types/message'
import type { VirtualListItem } from '@/types/virtual-list'
import { findMessageTypeConfig } from '@/components/chat/message-types/config'

// body padding: 10px top + 10px bottom
const BODY_PADDING = 20

// bubble padding: 8px top + 8px bottom
const BUBBLE_PADDING = 16

// 各元素固定高度
const AVATAR_H = 36
const TIME_H = 16
const NAME_H = 16
const QA_H = 24
const GAP = 4

// 文本消息单行 body 默认估值
const DEFAULT_TEXT_BODY = 44

/**
 * 估算 avatar-col 高度
 * = avatar(36?) + time(16?) + quickActions(24) + gaps
 */
function estimateAvatarColH(showAvatar: boolean, showTime: boolean): number {
  const parts: number[] = []
  if (showAvatar) parts.push(AVATAR_H)
  if (showTime) parts.push(TIME_H)
  parts.push(QA_H)
  const heights = parts.reduce((a, b) => a + b, 0)
  const gaps = (parts.length - 1) * GAP
  return heights + gaps
}

/**
 * 估算 content 高度
 * = name(16?) + bodyHeight (bodyHeight 已包含 padding)
 */
function estimateContentH(showName: boolean, bodyHeight: number): number {
  return (showName ? NAME_H + GAP : 0) + bodyHeight
}

/**
 * 估算消息气泡总高度
 * = max(avatar-col, content) + bubble-padding(16)
 */
export function estimateMessageSize(
  message: Message,
  showAvatar = false,
  showTime = false,
  showName = false,
): number {
  const config = findMessageTypeConfig(message.type, message.subType)
  const bodyHeight = config?.estimateHeight ?? DEFAULT_TEXT_BODY

  const colH = estimateAvatarColH(showAvatar, showTime)
  const contentH = estimateContentH(showName, bodyHeight)

  return Math.max(colH, contentH) + BUBBLE_PADDING
}

/**
 * 按 VirtualListItem.type 分发估值
 */
export function estimateItemSize(item: VirtualListItem): number {
  switch (item.type) {
    case 'date':
      return 48
    case 'gap':
    case 'empty-range':
      return 52
    case 'load-more':
      return 56
    case 'no-more':
    case 'bottom-hint':
      return 44
    case 'message':
      return estimateMessageSize(item.message, item.showAvatar, item.showTime, item.showName)
  }
}
