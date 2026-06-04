import { ref, computed } from 'vue'
import type { ContextTag } from '@/types/ai'
import type { Session } from '@/types'
import { chatlogAPI } from '@/api/chatlog'

/**
 * 上下文投喂组合函数
 *
 * 提取会话的最近消息，格式化为 system message 注入到对话中
 */
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

export function useContextFeed() {
  const contextTags = ref<ContextTag[]>([])
  const feeding = ref(false)

  const contextSummary = computed(() => {
    if (contextTags.value.length === 0) return ''
    return contextTags.value
      .map(
        (t) => `会话「${t.sessionName}」(${t.messageCount}条, ${t.timeRange})`
      )
      .join('；')
  })

  async function feedSessionContext(
    session: Session,
    messageCount: number = 20
  ): Promise<string> {
    feeding.value = true
    try {
      const messages = await chatlogAPI.getChatlog({
        talker: session.id,
        time: '',
        limit: messageCount,
      })

      if (!messages || messages.length === 0) {
        return ''
      }

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

      const content = messages
        .map((m) => {
          const sender = m.senderName || m.sender || '未知'
          const t = formatTime(m.time, m.createTime)
          return `[${t}] ${sender}: ${m.content || ''}`
        })
        .join('\n')

      return content
    } catch (err) {
      console.error('投喂上下文失败:', err)
      return ''
    } finally {
      feeding.value = false
    }
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
