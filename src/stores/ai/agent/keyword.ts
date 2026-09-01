/**
 * aiAgent store - keyword 子模块
 *
 * Keyword 相关 actions：
 * - addKeywordResult / clearKeywordResults
 */
import type { KeywordResult } from '@/types/ai/agent'
import { MAX_RESULTS_PER_SESSION } from './config'
import type { AiAgentConfigContext } from './config'

export interface AiAgentKeywordContext {
  addKeywordResult: (sessionId: string, result: KeywordResult) => void
  clearKeywordResults: (sessionId: string) => void
  $resetKeyword: () => void
}

export function useAiAgentKeyword(core: AiAgentConfigContext): AiAgentKeywordContext {
  const { keywordResults } = core

  // ==================== Keyword Actions ====================

  /** 添加关键词匹配结果 */
  function addKeywordResult(sessionId: string, result: KeywordResult): void {
    const results = keywordResults.value.get(sessionId) ?? []
    const updated = [...results, result]
    if (updated.length > MAX_RESULTS_PER_SESSION) {
      updated.splice(0, updated.length - MAX_RESULTS_PER_SESSION)
    }
    keywordResults.value = new Map(keywordResults.value).set(sessionId, updated)
  }

  /** 清空指定会话的关键词匹配结果 */
  function clearKeywordResults(sessionId: string): void {
    const newMap = new Map(keywordResults.value)
    newMap.delete(sessionId)
    keywordResults.value = newMap
  }

  // ==================== Reset (keyword 部分) ====================

  function $resetKeyword(): void {
    keywordResults.value = new Map()
  }

  return {
    addKeywordResult,
    clearKeywordResults,
    $resetKeyword,
  }
}
