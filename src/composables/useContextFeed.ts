import { ref, computed } from 'vue'
import type { ContextTag } from '@/types/ai'
import type { Session } from '@/types'
import { useChatMessagesStore } from '@/stores/chatMessages'

export type FeedTimeRange = { seconds: number; label: string } | { type: 'today'; label: string } | { type: 'all'; label: string }

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

function filterByTimeRange(
  messages: Array<{ time: string; createTime: number }>,
  range: FeedTimeRange
): Array<{ time: string; createTime: number }> {
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

function formatMessage(msg: {
  time: string
  createTime: number
  senderName?: string
  sender?: string
  content?: string
}): string {
  const sender = msg.senderName || msg.sender || '未知'
  const t = formatTime(msg.time, msg.createTime)
  return `[${t}] ${sender}: ${msg.content || ''}`
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

  function clearContextTags() {
    contextTags.value = []
  }

  return {
    contextTags,
    feeding,
    contextSummary,
    feedSessionContext,
    removeContextTag,
    clearContextTags,
  }
}
