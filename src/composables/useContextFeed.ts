import { ref, computed } from 'vue'
import type { ContextTag } from '@/types/ai'
import type { Session } from '@/types'
import { useChatMessagesStore } from '@/stores/chatMessages'

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
    messageCount: number = 20
  ): string {
    feeding.value = true

    const allMessages = chatMessagesStore.currentMessages

    if (!allMessages || allMessages.length === 0) {
      feeding.value = false
      return ''
    }

    const messages = allMessages.slice(-messageCount)

    const firstTime = formatTime(messages[0].time, messages[0].createTime)
    const lastTime = formatTime(
      messages[messages.length - 1].time,
      messages[messages.length - 1].createTime
    )
    const tag: ContextTag = {
      id: `ctx-${Date.now()}`,
      sessionId: session.id,
      sessionName: session.name || session.talkerName || '未知会话',
      messageCount: messages.length,
      timeRange: `${firstTime} ~ ${lastTime}`,
      fedAt: Date.now(),
    }
    contextTags.value.push(tag)

    feeding.value = false
    return messages.map(formatMessage).join('\n')
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
