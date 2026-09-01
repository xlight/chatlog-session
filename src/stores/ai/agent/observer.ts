/**
 * aiAgent store - observer 子模块
 *
 * Observer 相关 actions：
 * - getObserverState / updateObserverState
 * - addObserverResult / clearObserverResults
 * - updateStreamingState / clearStreamingState
 * - registerAnalysisAbort / unregisterAnalysisAbort / abortAllAnalyses
 */
import type {
  ObserverState,
  ObserverResult,
  StreamingObserverResult,
} from '@/types/ai/agent'
import { MAX_RESULTS_PER_SESSION } from './config'
import type { AiAgentConfigContext } from './config'

export interface AiAgentObserverContext {
  getObserverState: (sessionId: string) => ObserverState
  updateObserverState: (sessionId: string, partial: Partial<ObserverState>) => void
  addObserverResult: (sessionId: string, result: ObserverResult) => void
  clearObserverResults: (sessionId: string) => void
  updateStreamingState: (sessionId: string, partial: Partial<StreamingObserverResult>) => void
  clearStreamingState: (sessionId: string) => void
  registerAnalysisAbort: (sessionId: string, controller: AbortController) => void
  unregisterAnalysisAbort: (sessionId: string) => void
  abortAllAnalyses: () => void
  $resetObserver: () => void
}

export function useAiAgentObserver(core: AiAgentConfigContext): AiAgentObserverContext {
  const { observerStates, observerResults, observerStreaming, analysisAborts } = core

  // ==================== Observer Actions ====================

  /** 获取指定会话的 Observer 状态 */
  function getObserverState(sessionId: string): ObserverState {
    let state = observerStates.value.get(sessionId)
    if (!state) {
      state = {
        sessionId,
        lastAnalysisTime: 0,
        accumulatedMessageCount: 0,
        isAnalyzing: false,
      }
      observerStates.value = new Map(observerStates.value).set(sessionId, state)
    }
    return state
  }

  /** 局部更新 Observer 状态 */
  function updateObserverState(sessionId: string, partial: Partial<ObserverState>): void {
    const current = getObserverState(sessionId)
    observerStates.value = new Map(observerStates.value).set(sessionId, { ...current, ...partial })
  }

  /** 添加 Observer 分析结果 */
  function addObserverResult(sessionId: string, result: ObserverResult): void {
    const results = observerResults.value.get(sessionId) ?? []
    const updated = [...results, result]
    if (updated.length > MAX_RESULTS_PER_SESSION) {
      updated.splice(0, updated.length - MAX_RESULTS_PER_SESSION)
    }
    observerResults.value = new Map(observerResults.value).set(sessionId, updated)
  }

  /** 清空指定会话的 Observer 结果 */
  function clearObserverResults(sessionId: string): void {
    const newMap = new Map(observerResults.value)
    newMap.delete(sessionId)
    observerResults.value = newMap
  }

  /** 更新流式分析中间状态 */
  function updateStreamingState(sessionId: string, partial: Partial<StreamingObserverResult>): void {
    const current = observerStreaming.value.get(sessionId)
    observerStreaming.value = new Map(observerStreaming.value).set(sessionId, {
      streamingStatus: 'streaming',
      streamingSummary: current?.streamingSummary ?? '',
      streamingKeyPoints: current?.streamingKeyPoints ?? [],
      streamingSuggestions: current?.streamingSuggestions ?? [],
      ...partial,
    })
  }

  /** 清空流式分析状态 */
  function clearStreamingState(sessionId: string): void {
    const newMap = new Map(observerStreaming.value)
    newMap.delete(sessionId)
    observerStreaming.value = newMap
  }

  /** 注册会话的分析流 AbortController（总闸关闭时中止） */
  function registerAnalysisAbort(sessionId: string, controller: AbortController): void {
    analysisAborts.set(sessionId, controller)
  }

  /** 注销会话的分析流 AbortController */
  function unregisterAnalysisAbort(sessionId: string): void {
    analysisAborts.delete(sessionId)
  }

  /** 中止所有进行中的分析流（ai.enabled 总闸关闭时调用） */
  function abortAllAnalyses(): void {
    for (const controller of analysisAborts.values()) {
      controller.abort()
    }
    analysisAborts.clear()
  }

  // ==================== Reset (observer 部分) ====================

  function $resetObserver(): void {
    observerStates.value = new Map()
    observerResults.value = new Map()
    observerStreaming.value = new Map()
  }

  return {
    getObserverState,
    updateObserverState,
    addObserverResult,
    clearObserverResults,
    updateStreamingState,
    clearStreamingState,
    registerAnalysisAbort,
    unregisterAnalysisAbort,
    abortAllAnalyses,
    $resetObserver,
  }
}
