import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { chatlogAPI } from '@/api/chatlog'
import { triggerSessionAnalysis } from '@/composables/triggerSessionAnalysis'
import type { Message } from '@/types/message'

const MAX_CONTEXT_MESSAGES = 50

class AnalysisQueue {
  private queue: string[] = []
  private running = new Set<string>()
  private maxConcurrent: number

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent
  }

  enqueue(sessionId: string): void {
    if (this.running.has(sessionId)) return
    if (this.queue.includes(sessionId)) return
    this.queue.push(sessionId)
    this.drain()
  }

  private drain(): void {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const sid = this.queue.shift()!
      this.running.add(sid)
      this.execute(sid)
    }
  }

  private async execute(sid: string): Promise<void> {
    const agentStore = useAIAgentStore()
    try {
      const config = agentStore.getEffectiveConfig(sid)
      if (!config.observer.enabled) return
      const state = agentStore.getObserverState(sid)
      if (state.isAnalyzing) return
      const elapsed = Date.now() - state.lastAnalysisTime
      if (elapsed < config.observer.intervalSeconds * 1000) return

      const messages = await getContextMessagesForSession(sid)
      if (!messages.length) return

      await triggerSessionAnalysis(sid, {
        contextMessages: messages,
        skipAccumulatedCheck: true,
      })
    } finally {
      this.running.delete(sid)
      this.drain()
    }
  }

  clear(): void {
    this.queue = []
    this.running.clear()
  }

  get pendingCount(): number {
    return this.queue.length
  }

  get runningCount(): number {
    return this.running.size
  }
}

async function getContextMessagesForSession(sid: string): Promise<Message[]> {
  try {
    return await chatlogAPI.getSessionMessages(sid, undefined, MAX_CONTEXT_MESSAGES, 0)
  } catch {
    return []
  }
}

export function useBackgroundObserver() {
  const agentStore = useAIAgentStore()
  const sessionStore = useSessionStore()

  let queue: AnalysisQueue | null = null
  let isStarted = false

  function getWatchedSessions(): string[] {
    const pinned = new Set(sessionStore.pinnedSessions.map(s => s.id))
    const observerEnabled = new Set<string>()

    for (const session of sessionStore.filteredSessions) {
      const config = agentStore.getEffectiveConfig(session.id)
      if (config.observer.enabled) {
        observerEnabled.add(session.id)
      }
    }

    const merged = new Set([...pinned, ...observerEnabled])
    return [...merged]
  }

  function start(maxConcurrent = 2): void {
    if (isStarted) return
    isStarted = true
    queue = new AnalysisQueue(maxConcurrent)
  }

  function tick(): void {
    if (!isStarted || !queue) return
    const watched = getWatchedSessions()
    for (const sid of watched) {
      queue.enqueue(sid)
    }
  }

  function stop(): void {
    isStarted = false
    queue?.clear()
    queue = null
  }

  return {
    start,
    tick,
    stop,
    get isRunning() { return isStarted },
    get pendingCount() { return queue?.pendingCount ?? 0 },
    get runningCount() { return queue?.runningCount ?? 0 },
  }
}
