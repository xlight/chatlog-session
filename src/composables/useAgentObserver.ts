import { watch, ref, computed, toRef, type Ref } from 'vue'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { triggerSessionAnalysis } from '@/composables/triggerSessionAnalysis'
import type { ObserverResult } from '@/types/ai/agent'

export function useAgentObserver(sessionId: string | Ref<string>) {
  const agentStore = useAIAgentStore()
  const chatMessagesStore = useChatMessagesStore()

  const sid = toRef(sessionId)
  const isObserving = ref(false)
  const localError = ref<string | null>(null)

  const latestResult = computed<ObserverResult | null>(() => {
    const state = agentStore.getObserverState(sid.value)
    return state.lastResult ?? null
  })

  let previousMessageCount = 0
  let stopMessagesWatch: (() => void) | null = null
  let stopTalkerWatch: (() => void) | null = null

  function handleMessagesChange(): void {
    if (chatMessagesStore.currentTalker !== sid.value) {
      console.log('[Observer:watch] skip: currentTalker mismatch', { currentTalker: chatMessagesStore.currentTalker, sid: sid.value })
      return
    }

    const currentCount = chatMessagesStore.messages.length
    const delta = currentCount - previousMessageCount

    if (delta > 0) {
      const state = agentStore.getObserverState(sid.value)
      const newAccumulated = state.accumulatedMessageCount + delta
      console.log('[Observer:watch] new messages', { sid: sid.value, delta, accumulated: newAccumulated })
      agentStore.updateObserverState(sid.value, {
        accumulatedMessageCount: newAccumulated,
      })
      previousMessageCount = currentCount
      triggerSessionAnalysis(sid.value, { skipAccumulatedCheck: false })
    } else if (delta < 0) {
      previousMessageCount = currentCount
    }
  }

  function start(): void {
    if (isObserving.value) return
    isObserving.value = true
    console.log('[Observer:start]', { sid: sid.value, currentTalker: chatMessagesStore.currentTalker })

    if (chatMessagesStore.currentTalker === sid.value) {
      previousMessageCount = chatMessagesStore.messages.length
    }

    agentStore.getObserverState(sid.value)

    stopTalkerWatch = watch(
      () => chatMessagesStore.currentTalker,
      (newTalker) => {
        if (newTalker === sid.value) {
          previousMessageCount = chatMessagesStore.messages.length
        }
      },
    )

    stopMessagesWatch = watch(
      () => chatMessagesStore.messages.length,
      () => handleMessagesChange(),
    )
  }

  function stop(): void {
    isObserving.value = false
    stopTalkerWatch?.()
    stopMessagesWatch?.()
    stopTalkerWatch = null
    stopMessagesWatch = null
    previousMessageCount = 0
  }

  return { isObserving, latestResult, error: localError, start, stop }
}
