import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIError, ChatMessage } from '@/types/ai'
import type {
  ConsoleChatSession,
  ConsoleStats,
  ConsoleTab,
  ContextSource,
} from '@/types/ai/console'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function autoTitle(ts: number): string {
  const d = new Date(ts)
  return `对话 ${d.getMonth() + 1}/${d.getDate()}`
}

const MAX_SESSIONS = 50

export const useAIConsoleStore = defineStore(
  'aiConsole',
  () => {
    // ==================== State ====================

    const sessions = ref<ConsoleChatSession[]>([])
    const currentSessionId = ref<string | null>(null)
    const activeTab = ref<ConsoleTab>('chat')

    // per-session 流式状态（不是全局单值）
    const streamingMap = ref<Record<string, boolean>>({})
    const abortControllers = ref<Record<string, AbortController | null>>({})
    const errorsBySession = ref<Record<string, AIError | null>>({})

    const sessionListCollapsed = ref(false)
    const isLoading = ref(false)

    // ==================== Getters ====================

    const currentSession = computed<ConsoleChatSession | undefined>(() =>
      sessions.value.find((s) => s.id === currentSessionId.value)
    )
    const hasSessions = computed(() => sessions.value.length > 0)
    const sortedSessions = computed(() =>
      [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
    )
    const totalMessages = computed(() =>
      sessions.value.reduce((sum, s) => sum + s.messages.length, 0)
    )
    const recentSessions = computed(() => sortedSessions.value.slice(0, 5))
    const isStreamingCurrent = computed(() =>
      currentSessionId.value ? !!streamingMap.value[currentSessionId.value] : false
    )

    // ==================== Actions ====================

    function createSession(title?: string): string {
      if (sessions.value.length >= MAX_SESSIONS) {
        throw new Error(`已达上限（${MAX_SESSIONS}个）`)
      }
      const id = generateId()
      const now = Date.now()
      sessions.value.push({
        id,
        title: title || autoTitle(now),
        messages: [],
        createdAt: now,
        updatedAt: now,
        contextFeed: [],
      })
      currentSessionId.value = id
      return id
    }

    function switchSession(id: string): void {
      if (sessions.value.some((s) => s.id === id)) {
        currentSessionId.value = id
      }
    }

    function deleteSession(id: string): void {
      const ctrl = abortControllers.value[id]
      if (ctrl) {
        ctrl.abort()
      }
      delete abortControllers.value[id]
      delete streamingMap.value[id]
      delete errorsBySession.value[id]
      sessions.value = sessions.value.filter((s) => s.id !== id)
      if (currentSessionId.value === id) {
        currentSessionId.value = sessions.value[0]?.id ?? null
      }
    }

    // 消息操作 — 全部接受 sessionId
    function addMessage(sessionId: string, msg: ChatMessage): void {
      const s = sessions.value.find((x) => x.id === sessionId)
      if (!s) return
      const msgWithId = msg.id ? msg : { ...msg, id: generateId() }
      s.messages.push(msgWithId)
      s.updatedAt = Date.now()
    }

    function updateLastContent(sessionId: string, content: string): void {
      const s = sessions.value.find((x) => x.id === sessionId)
      if (!s) return
      for (let i = s.messages.length - 1; i >= 0; i--) {
        if (s.messages[i].role === 'assistant') {
          s.messages[i] = { ...s.messages[i], content }
          return
        }
      }
    }

    function appendStreamContent(sessionId: string, delta: string): void {
      const s = sessions.value.find((x) => x.id === sessionId)
      if (!s) return
      for (let i = s.messages.length - 1; i >= 0; i--) {
        if (s.messages[i].role === 'assistant') {
          s.messages[i] = {
            ...s.messages[i],
            content: s.messages[i].content + delta,
          }
          return
        }
      }
      s.messages.push({ id: generateId(), role: 'assistant', content: delta })
    }

    function clearSessionMessages(sessionId: string): void {
      const s = sessions.value.find((x) => x.id === sessionId)
      if (s) {
        s.messages = []
        s.updatedAt = Date.now()
      }
    }

    // 上下文投喂 — Store 只接收已格式化文本，UI 层编排 useContextFeed
    function feedContext(
      sessionId: string,
      contextText: string,
      source: ContextSource
    ): void {
      const s = sessions.value.find((x) => x.id === sessionId)
      if (!s || !contextText) return
      s.messages.unshift({ id: generateId(), role: 'system', content: contextText })
      s.contextFeed = s.contextFeed || []
      s.contextFeed.push(source)
      s.updatedAt = Date.now()
    }

    // 流式控制 — 接受 sessionId
    function setStreaming(sessionId: string, val: boolean): void {
      streamingMap.value[sessionId] = val
      if (!val) {
        abortControllers.value[sessionId] = null
      }
    }
    function setAbortController(sessionId: string, ctrl: AbortController | null): void {
      abortControllers.value[sessionId] = ctrl
    }
    function abortStream(sessionId: string): void {
      const ctrl = abortControllers.value[sessionId]
      if (ctrl) {
        ctrl.abort()
      }
      abortControllers.value[sessionId] = null
      streamingMap.value[sessionId] = false
    }
    function abortAllStreams(): void {
      Object.keys(abortControllers.value).forEach((k) => abortStream(k))
    }
    function setError(sessionId: string, err: AIError | null): void {
      errorsBySession.value[sessionId] = err
    }
    function isStreaming(sessionId: string): boolean {
      return !!streamingMap.value[sessionId]
    }

    // Tab
    function switchTab(tab: ConsoleTab): void {
      activeTab.value = tab
    }

    // 统计
    function getStats(): ConsoleStats {
      return {
        totalSessions: sessions.value.length,
        totalMessages: totalMessages.value,
        lastActivityAt: sortedSessions.value[0]?.updatedAt ?? null,
      }
    }

    function $reset(): void {
      abortAllStreams()
      sessions.value = []
      currentSessionId.value = null
      activeTab.value = 'chat'
      streamingMap.value = {}
      abortControllers.value = {}
      errorsBySession.value = {}
      sessionListCollapsed.value = false
      isLoading.value = false
    }

    return {
      // State
      sessions,
      currentSessionId,
      activeTab,
      streamingMap,
      abortControllers,
      errorsBySession,
      sessionListCollapsed,
      isLoading,

      // Getters
      currentSession,
      hasSessions,
      sortedSessions,
      totalMessages,
      recentSessions,
      isStreamingCurrent,

      // Actions
      createSession,
      switchSession,
      deleteSession,
      addMessage,
      updateLastContent,
      appendStreamContent,
      clearSessionMessages,
      feedContext,
      setStreaming,
      setAbortController,
      abortStream,
      abortAllStreams,
      setError,
      isStreaming,
      switchTab,
      getStats,
      $reset,
    }
  },
  {
    persist: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      paths: ['sessions', 'currentSessionId', 'activeTab'],
    },
  }
)
