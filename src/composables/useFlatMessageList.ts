import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Message, MessageGroup } from '@/types/message'
import type { VirtualListItem } from '@/types/virtual-list'
import { MessageType } from '@/types/message'

/**
 * 判断是否与上一条消息不同（需要显示头像/名称）
 * 连续同一发送者且时间间隔 < 5分钟时不显示
 */
function shouldDiffFromPrev(index: number, messages: Message[]): boolean {
  if (index === 0) return true

  const current = messages[index]
  const prev = messages[index - 1]

  // 不同发送者显示头像
  if (current.sender !== prev.sender) return true

  // 时间间隔超过5分钟显示头像
  const currentTime = current.createTime
    ? current.createTime * 1000
    : new Date(current.time).getTime()
  const prevTime = prev.createTime ? prev.createTime * 1000 : new Date(prev.time).getTime()
  const timeDiff = currentTime - prevTime
  if (timeDiff > 5 * 60 * 1000) return true

  return false
}

/**
 * 判断是否显示时间
 * 时间间隔超过5分钟显示
 */
function shouldShowTime(index: number, messages: Message[]): boolean {
  if (index === 0) return true

  const current = messages[index]
  const prev = messages[index - 1]

  const currentTime = current.createTime
    ? current.createTime * 1000
    : new Date(current.time).getTime()
  const prevTime = prev.createTime ? prev.createTime * 1000 : new Date(prev.time).getTime()
  const timeDiff = currentTime - prevTime
  return timeDiff > 5 * 60 * 1000
}

/**
 * 判断是否显示名称（群聊中）
 */
function shouldShowName(index: number, messages: Message[]): boolean {
  return shouldDiffFromPrev(index, messages)
}

/**
 * 判断消息是否为 Gap 类型
 */
function isGapMessage(message: Message): boolean {
  return message.type === MessageType.Gap || !!message.isGap
}

/**
 * 判断消息是否为 EmptyRange 类型
 */
function isEmptyRangeMessage(message: Message): boolean {
  return message.type === MessageType.EmptyRange || !!message.isEmptyRange
}

/**
 * 扁平化消息列表 composable
 * 将嵌套的 messagesByDate 转换为扁平的 VirtualListItem[]
 */
export function useFlatMessageList(
  messagesByDate: ComputedRef<MessageGroup[]>,
  hasMoreHistory: ComputedRef<boolean>,
  historyLoadMessage: ComputedRef<string>,
) {
  const flatItems = computed<VirtualListItem[]>(() => {
    const items: VirtualListItem[] = []

    // 顶部加载指示器
    if (historyLoadMessage.value) {
      // 有历史加载提示时不显示 load-more/no-more
    } else if (hasMoreHistory.value) {
      items.push({ type: 'load-more', key: 'load-more' })
    } else {
      items.push({ type: 'no-more', key: 'no-more' })
    }

    // 按日期分组遍历
    for (const group of messagesByDate.value) {
      // 日期分隔符
      items.push({
        type: 'date',
        key: `date-${group.date}`,
        date: group.date,
        formattedDate: group.formattedDate,
        count: group.messages.length,
      })

      // 消息列表
      for (let i = 0; i < group.messages.length; i++) {
        const message = group.messages[i]!

        // Gap 消息作为独立虚拟项
        if (isGapMessage(message)) {
          items.push({
            type: 'gap',
            key: `gap-${message.id}`,
            message,
          })
          continue
        }

        // EmptyRange 消息作为独立虚拟项
        if (isEmptyRangeMessage(message)) {
          items.push({
            type: 'empty-range',
            key: `empty-range-${message.id}`,
            message,
          })
          continue
        }

        // 普通消息
        items.push({
          type: 'message',
          key: `msg-${message.id}`,
          message,
          showAvatar: shouldDiffFromPrev(i, group.messages),
          showTime: shouldShowTime(i, group.messages),
          showName: shouldShowName(i, group.messages),
        })
      }
    }

    // 底部提示
    items.push({ type: 'bottom-hint', key: 'bottom-hint' })

    return items
  })

  return {
    flatItems,
  }
}
