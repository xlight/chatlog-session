/**
 * aiAgent store - autoReply 子模块
 *
 * Auto Reply Tracking 相关 actions：
 * - getAutoReplyTracker / incrementAutoReplyTracker / resetAutoReplyTracker
 */
import type { AutoReplyTracker } from '@/types/ai/agent'
import type { AiAgentConfigContext } from './config'

export interface AiAgentAutoReplyContext {
  getAutoReplyTracker: (sessionId: string) => AutoReplyTracker
  incrementAutoReplyTracker: (sessionId: string) => void
  resetAutoReplyTracker: (sessionId: string) => void
  $resetAutoReply: () => void
}

export function useAiAgentAutoReply(core: AiAgentConfigContext): AiAgentAutoReplyContext {
  const { autoReplyTrackers } = core

  // ==================== Auto Reply Tracking ====================

  function getAutoReplyTracker(sessionId: string): AutoReplyTracker {
    let tracker = autoReplyTrackers.value.get(sessionId)
    if (!tracker) {
      tracker = { count: 0, lastAt: null }
      autoReplyTrackers.value = new Map(autoReplyTrackers.value).set(sessionId, tracker)
    }
    return tracker
  }

  function incrementAutoReplyTracker(sessionId: string): void {
    const tracker = getAutoReplyTracker(sessionId)
    autoReplyTrackers.value = new Map(autoReplyTrackers.value).set(sessionId, {
      count: tracker.count + 1,
      lastAt: Date.now(),
    })
  }

  function resetAutoReplyTracker(sessionId: string): void {
    const newMap = new Map(autoReplyTrackers.value)
    newMap.delete(sessionId)
    autoReplyTrackers.value = newMap
  }

  // ==================== Reset (autoReply 部分) ====================

  function $resetAutoReply(): void {
    autoReplyTrackers.value = new Map()
  }

  return {
    getAutoReplyTracker,
    incrementAutoReplyTracker,
    resetAutoReplyTracker,
    $resetAutoReply,
  }
}
