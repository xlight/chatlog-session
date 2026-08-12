import { ref, computed } from 'vue'
import type { ContextTag } from '@/types/ai'
import type { Session } from '@/types'
import type { Message } from '@/types/message'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { useMessageCacheStore } from '@/stores/messageCache'
import { useSessionStore } from '@/stores/session'
import { getMessageSummary } from '@/components/chat/message-types/config'

export type FeedTimeRange = { seconds: number; label: string } | { type: 'today'; label: string } | { type: 'all'; label: string }

export interface FeedTimeRangeOption {
  key: string
  label: string
  value: FeedTimeRange
}

export const FEED_TIME_RANGES: FeedTimeRangeOption[] = [
  { key: '1h', label: '最近1小时', value: { seconds: 3600, label: '最近1小时' } },
  { key: '6h', label: '最近6小时', value: { seconds: 21600, label: '最近6小时' } },
  { key: '12h', label: '最近12小时', value: { seconds: 43200, label: '最近12小时' } },
  { key: '24h', label: '最近24小时', value: { seconds: 86400, label: '最近24小时' } },
  { key: 'today', label: '今天', value: { type: 'today', label: '今天' } },
  { key: '3d', label: '最近3天', value: { seconds: 86400 * 3, label: '最近3天' } },
  { key: '7d', label: '最近7天', value: { seconds: 86400 * 7, label: '最近7天' } },
  { key: 'all', label: '全部', value: { type: 'all', label: '全部' } },
]

function formatTime(rawTime: string, createTime: number): string {
  if (rawTime) {
    try {
      return new Date(rawTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      // fallback
    }
  }
  if (createTime) {
    const ts = createTime < 10000000000 ? createTime * 1000 : createTime
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return ''
}

function getTimestamp(msg: { time: string; createTime: number }): number {
  if (msg.time) {
    const t = new Date(msg.time).getTime()
    if (!isNaN(t)) return t
  }
  return msg.createTime < 10000000000 ? msg.createTime * 1000 : msg.createTime
}

function filterByTimeRange<T extends { time: string; createTime: number }>(
  messages: T[],
  range: FeedTimeRange
): T[] {
  const now = Date.now()

  let cutoff: number
  if ('type' in range) {
    if (range.type === 'today') {
      const d = new Date()
      cutoff = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    } else {
      // all - no filter
      return [...messages]
    }
  } else {
    cutoff = now - range.seconds * 1000
  }

  return messages.filter((msg) => getTimestamp(msg) >= cutoff)
}

function formatMessage(msg: Message): string {
  const sender = msg.senderName || msg.sender || '未知'
  const t = formatTime(msg.time, msg.createTime)
  return `[${t}] ${sender}: ${getMessageSummary(msg)}`
}

export function useContextFeed() {
  const contextTags = ref<ContextTag[]>([])
  const feeding = ref(false)
  const chatMessagesStore = useChatMessagesStore()

  const contextSummary = computed(() => {
    if (contextTags.value.length === 0) return ''
    return contextTags.value
      .map(
        (t) => `会话「${t.sessionName}」(${t.messageCount}条, ${t.timeRange})`
      )
      .join('；')
  })

  function feedSessionContext(
    session: Session,
    range: FeedTimeRange
  ): string {
    feeding.value = true

    const allMessages = chatMessagesStore.currentMessages

    if (!allMessages || allMessages.length === 0) {
      feeding.value = false
      return ''
    }

    const filtered = filterByTimeRange(allMessages, range)

    if (filtered.length === 0) {
      feeding.value = false
      return ''
    }

    const firstTime = formatTime(filtered[0].time, filtered[0].createTime)
    const lastTime = formatTime(
      filtered[filtered.length - 1].time,
      filtered[filtered.length - 1].createTime
    )
    const tag: ContextTag = {
      id: `ctx-${Date.now()}`,
      sessionId: session.id,
      sessionName: session.name || session.talkerName || '未知会话',
      messageCount: filtered.length,
      timeRange: `${firstTime} ~ ${lastTime}`,
      fedAt: Date.now(),
    }
    contextTags.value.push(tag)

    feeding.value = false
    return filtered.map(formatMessage).join('\n')
  }

  function removeContextTag(id: string) {
    contextTags.value = contextTags.value.filter((t) => t.id !== id)
  }

  /**
   * 从消息缓存投喂：不依赖会话窗口是否已打开加载（自动投喂用）
   * 取该会话缓存最近 limit 条（不足全部），返回格式化文本
   */
  function feedCachedContext(sessionId: string, limit = 200): string {
    feeding.value = true

    const cacheStore = useMessageCacheStore()
    const sessionStore = useSessionStore()
    const cached = cacheStore.get(sessionId)

    if (!cached || cached.length === 0) {
      feeding.value = false
      return ''
    }

    const filtered = cached.slice(-limit)
    const session = sessionStore.sessions.find((s) => s.id === sessionId)
    const firstTime = formatTime(filtered[0].time, filtered[0].createTime)
    const lastTime = formatTime(
      filtered[filtered.length - 1].time,
      filtered[filtered.length - 1].createTime
    )
    const tag: ContextTag = {
      id: `ctx-${Date.now()}`,
      sessionId,
      sessionName: session?.name || session?.talkerName || '未知会话',
      messageCount: filtered.length,
      timeRange: `${firstTime} ~ ${lastTime}`,
      fedAt: Date.now(),
    }
    contextTags.value.push(tag)

    feeding.value = false
    return filtered.map(formatMessage).join('\n')
  }

  function clearContextTags() {
    contextTags.value = []
  }

  function restoreTags(tags: ContextTag[]) {
    contextTags.value = tags
  }

  return {
    contextTags,
    feeding,
    contextSummary,
    feedSessionContext,
    feedCachedContext,
    removeContextTag,
    clearContextTags,
    restoreTags,
  }
}
