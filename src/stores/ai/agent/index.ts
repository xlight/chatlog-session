/**
 * aiAgent store - 组合入口
 *
 * 将 config / draft / observer / keyword / autoReply 子模块组合为统一的
 * useAIAgentStore，保持与原 agent.ts 完全相同的公共 API。
 *
 * 同时 re-export deriveLevelPreset / applyLevelPreset 供外部使用。
 */
import { defineStore } from 'pinia'
import { useAiAgentConfig } from './config'
import { useAiAgentDraft } from './draft'
import { useAiAgentObserver } from './observer'
import { useAiAgentKeyword } from './keyword'
import { useAiAgentAutoReply } from './autoReply'

// re-export 工具函数（外部从 '@/stores/ai/agent' 导入）
export { deriveLevelPreset, applyLevelPreset } from './config'

export const useAIAgentStore = defineStore('aiAgent', () => {
  const core = useAiAgentConfig()
  const draft = useAiAgentDraft(core)
  const observer = useAiAgentObserver(core)
  const keyword = useAiAgentKeyword(core)
  const autoReply = useAiAgentAutoReply(core)

  // ==================== Migration ====================

  /** store 初始化时自动执行数据迁移 */
  core.migrateFromB1()
  core.migratePersistedConfig()

  // ==================== Reset ====================

  function $reset(): void {
    core.$resetConfig()
    observer.$resetObserver()
    keyword.$resetKeyword()
    draft.$resetDrafts()
    autoReply.$resetAutoReply()
  }

  return {
    // State
    config: core.config,
    enabled: core.enabled,
    persistedConfig: core.persistedConfig,
    sessionConfigs: core.sessionConfigs,
    observerStates: core.observerStates,
    observerResults: core.observerResults,
    observerStreaming: core.observerStreaming,
    keywordResults: core.keywordResults,
    drafts: core.drafts,
    autoReplyTrackers: core.autoReplyTrackers,

    // Getters
    pendingDrafts: draft.pendingDrafts,
    hasPendingDrafts: draft.hasPendingDrafts,
    canAutoReply: core.canAutoReply,
    getEffectiveConfig: core.getEffectiveConfig,

    // Config Actions (B1 deprecated)
    updateConfig: core.updateConfig,
    resetConfig: core.resetConfig,
    addTargetSession: core.addTargetSession,
    removeTargetSession: core.removeTargetSession,
    isSessionTargeted: core.isSessionTargeted,

    // Config Actions (B2)
    updateDefaultLevelPreset: core.updateDefaultLevelPreset,
    setDefaultActions: core.setDefaultActions,
    setSessionConfig: core.setSessionConfig,
    clearSessionConfig: core.clearSessionConfig,
    resetPersistedConfig: core.resetPersistedConfig,

    // Per-session permission
    canAutoReplySession: core.canAutoReplySession,
    canKeywordAutoSend: core.canKeywordAutoSend,

    // Observer Actions
    getObserverState: observer.getObserverState,
    updateObserverState: observer.updateObserverState,
    addObserverResult: observer.addObserverResult,
    clearObserverResults: observer.clearObserverResults,
    updateStreamingState: observer.updateStreamingState,
    clearStreamingState: observer.clearStreamingState,
    registerAnalysisAbort: observer.registerAnalysisAbort,
    unregisterAnalysisAbort: observer.unregisterAnalysisAbort,
    abortAllAnalyses: observer.abortAllAnalyses,

    // Keyword Actions
    addKeywordResult: keyword.addKeywordResult,
    clearKeywordResults: keyword.clearKeywordResults,

    // Draft Actions
    addDraft: draft.addDraft,
    removeDraft: draft.removeDraft,
    markDraftSent: draft.markDraftSent,
    clearDrafts: draft.clearDrafts,
    clearSentDrafts: draft.clearSentDrafts,

    // Draft Task Mapping

    // Auto Reply Tracking
    getAutoReplyTracker: autoReply.getAutoReplyTracker,
    incrementAutoReplyTracker: autoReply.incrementAutoReplyTracker,
    resetAutoReplyTracker: autoReply.resetAutoReplyTracker,

    // Migration
    migrateFromB1: core.migrateFromB1,
    migratePersistedConfig: core.migratePersistedConfig,

    // Reset
    $reset,
  }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    pick: ['enabled', 'persistedConfig', 'sessionConfigs'],
  },
})
