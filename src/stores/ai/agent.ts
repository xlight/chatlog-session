import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AgentConfig,
  AgentDraft,
  AgentSendingStatus,
  AgentSessionFilter,
  SendPermissionLevel,
  AgentAction,
  SessionAgentConfig,
  PersistedAgentConfig,
  ObserverState,
  ObserverResult,
  KeywordResult,
} from '@/types/ai/agent'

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  mode: 'draft',
  targetSessions: [],
  promptTemplateId: 'builtin-reply',
  requireConfirm: true,
  maxAutoReplies: 0,
  cooldownMs: 5000,
}

const DEFAULT_PERSISTED_CONFIG: PersistedAgentConfig = {
  defaults: {
    sendPermission: 'draft_confirm',
    allowedActions: ['draft_reply', 'analyze'],
    observerEnabled: false,
    observerIntervalSeconds: 300,
    observerMinNewMessages: 5,
    keywordEnabled: false,
    keywordMatchPatterns: [],
    promptTemplateId: 'builtin-reply',
    maxAutoReplies: 0,
    cooldownMs: 5000,
  },
}

const MAX_DRAFTS = 20
const MAX_SENDING_STATUS = 50

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useAIAgentStore = defineStore('aiAgent', () => {
  // ==================== State ====================

  // --- Phase B1 旧 state（保留兼容） ---
  /** @deprecated 使用 persistedConfig + sessionConfigs 替代 */
  const config = ref<AgentConfig>({ ...DEFAULT_CONFIG })

  // --- Phase B2 新 state ---
  /** 全局 Agent 开关 */
  const enabled = ref(false)

  /** 全局持久化配置（localStorage） */
  const persistedConfig = ref<PersistedAgentConfig>({ ...DEFAULT_PERSISTED_CONFIG })

  /** 会话级配置覆盖（localStorage，key = sessionId） */
  const sessionConfigs = ref<Record<string, SessionAgentConfig>>({})

  // --- Phase C 运行时 state（不持久化） ---
  const observerStates = ref<Map<string, ObserverState>>(new Map())
  const observerResults = ref<Map<string, ObserverResult[]>>(new Map())
  const keywordResults = ref<Map<string, KeywordResult[]>>(new Map())

  // --- 不变 state ---
  const drafts = ref<AgentDraft[]>([])
  const sendingStatuses = ref<AgentSendingStatus[]>([])
  const autoReplyCount = ref(0)
  const lastAutoReplyAt = ref<number | null>(null)

  // ==================== Getters ====================

  const pendingDrafts = computed(() =>
    drafts.value.filter((d) => !d.sent)
  )

  const hasPendingDrafts = computed(() => pendingDrafts.value.length > 0)

  const activeSendings = computed(() =>
    sendingStatuses.value.filter((s) => s.status === 'sending')
  )

  const hasActiveSendings = computed(() => activeSendings.value.length > 0)

  /** 获取指定会话的有效配置（session override → global defaults） */
  function getEffectiveConfig(sessionId: string): SessionAgentConfig {
    const defaults = persistedConfig.value.defaults
    const sessionOverride = sessionConfigs.value[sessionId]

    const config: SessionAgentConfig = {
      sessionId,
      sendPermission: sessionOverride?.sendPermission ?? defaults.sendPermission,
      userActions: {
        enabled: true,
        allowedActions: sessionOverride?.userActions?.allowedActions ?? [...defaults.allowedActions],
      },
      allowScheduledMessages: sessionOverride?.allowScheduledMessages ?? false,
      observer: {
        enabled: sessionOverride?.observer?.enabled ?? defaults.observerEnabled,
        intervalSeconds: sessionOverride?.observer?.intervalSeconds ?? defaults.observerIntervalSeconds,
        minNewMessages: sessionOverride?.observer?.minNewMessages ?? defaults.observerMinNewMessages,
      },
      keywordMonitor: {
        enabled: sessionOverride?.keywordMonitor?.enabled ?? defaults.keywordEnabled,
        matchPatterns: sessionOverride?.keywordMonitor?.matchPatterns ?? [...defaults.keywordMatchPatterns],
      },
      promptTemplateId: sessionOverride?.promptTemplateId ?? defaults.promptTemplateId,
      maxAutoReplies: sessionOverride?.maxAutoReplies ?? defaults.maxAutoReplies,
      cooldownMs: sessionOverride?.cooldownMs ?? defaults.cooldownMs,
    }

    if (sessionOverride?.model) {
      config.model = sessionOverride.model
    }

    return config
  }

  /** @deprecated 使用 canAutoReplySession(sessionId) 替代 */
  const canAutoReply = computed(() => {
    if (!enabled.value) return false
    if (config.value.mode !== 'auto') return false
    if (config.value.maxAutoReplies > 0 && autoReplyCount.value >= config.value.maxAutoReplies) return false
    if (config.value.cooldownMs > 0 && lastAutoReplyAt.value) {
      if (Date.now() - lastAutoReplyAt.value < config.value.cooldownMs) return false
    }
    return true
  })

  /** 检查指定会话是否有权限自动回复（per-session 版） */
  function canAutoReplySession(sessionId: string): boolean {
    if (!enabled.value) return false
    const effective = getEffectiveConfig(sessionId)
    if (effective.sendPermission !== 'full_auto') return false
    if (effective.maxAutoReplies > 0 && autoReplyCount.value >= effective.maxAutoReplies) return false
    if (effective.cooldownMs > 0 && lastAutoReplyAt.value) {
      if (Date.now() - lastAutoReplyAt.value < effective.cooldownMs) return false
    }
    return true
  }

  // ==================== Config Actions (B1, deprecated) ====================

  /** @deprecated 使用 updateDefaultPermission / setSessionConfig 替代 */
  function updateConfig(partial: Partial<AgentConfig>): void {
    config.value = { ...config.value, ...partial }
    // 同步 B2 ref 以保证 canAutoReply 正常工作
    if (partial.enabled !== undefined) {
      enabled.value = partial.enabled
    }
  }

  /** @deprecated 使用 resetPersistedConfig 替代 */
  function resetConfig(): void {
    config.value = { ...DEFAULT_CONFIG }
  }

  /** @deprecated 使用 sessionConfigs 替代 */
  function addTargetSession(filter: AgentSessionFilter): void {
    if (config.value.targetSessions.some((f) => f.sessionId === filter.sessionId)) return
    config.value.targetSessions.push(filter)
  }

  /** @deprecated 使用 clearSessionConfig 替代 */
  function removeTargetSession(sessionId: string): void {
    config.value.targetSessions = config.value.targetSessions.filter(
      (f) => f.sessionId !== sessionId
    )
  }

  /** @deprecated 使用 getEffectiveConfig 替代 */
  function isSessionTargeted(sessionId: string): boolean {
    if (config.value.targetSessions.length === 0) return true
    return config.value.targetSessions.some((f) => f.sessionId === sessionId)
  }

  // ==================== Config Actions (B2) ====================

  /** 更新全局默认发送权限 */
  function updateDefaultPermission(permission: SendPermissionLevel): void {
    persistedConfig.value = {
      ...persistedConfig.value,
      defaults: {
        ...persistedConfig.value.defaults,
        sendPermission: permission,
      },
    }
  }

  /** 设置全局默认允许的操作 */
  function setDefaultActions(actions: AgentAction[]): void {
    persistedConfig.value = {
      ...persistedConfig.value,
      defaults: {
        ...persistedConfig.value.defaults,
        allowedActions: actions,
      },
    }
  }

  /** 设置会话级配置覆盖 */
  function setSessionConfig(sessionId: string, partial: Partial<SessionAgentConfig>): void {
    const existing = sessionConfigs.value[sessionId]
    if (existing) {
      sessionConfigs.value = {
        ...sessionConfigs.value,
        [sessionId]: { ...existing, ...partial },
      }
    } else {
      const defaults = getEffectiveConfig(sessionId)
      sessionConfigs.value = {
        ...sessionConfigs.value,
        [sessionId]: { ...defaults, ...partial },
      }
    }
  }

  /** 清除会话级配置（恢复全局默认） */
  function clearSessionConfig(sessionId: string): void {
    const { [sessionId]: _, ...rest } = sessionConfigs.value
    sessionConfigs.value = rest
  }

  /** 重置全局配置 */
  function resetPersistedConfig(): void {
    persistedConfig.value = { ...DEFAULT_PERSISTED_CONFIG }
    sessionConfigs.value = {}
  }

  // ==================== Draft Actions ====================

  function addDraft(draft: Omit<AgentDraft, 'id' | 'sent'>): AgentDraft {
    if (drafts.value.length >= MAX_DRAFTS) {
      drafts.value = drafts.value.filter((d) => d.sent).concat(
        drafts.value.filter((d) => !d.sent).slice(-(MAX_DRAFTS - drafts.value.filter((d) => d.sent).length))
      )
    }

    const newDraft: AgentDraft = {
      ...draft,
      id: generateId(),
      sent: false,
    }
    drafts.value.push(newDraft)
    return newDraft
  }

  function removeDraft(draftId: string): void {
    drafts.value = drafts.value.filter((d) => d.id !== draftId)
  }

  function markDraftSent(draftId: string, jobId: number): void {
    const draft = drafts.value.find((d) => d.id === draftId)
    if (draft) {
      draft.sent = true
      draft.jobId = jobId
    }
  }

  function clearDrafts(): void {
    drafts.value = []
  }

  function clearSentDrafts(): void {
    drafts.value = drafts.value.filter((d) => !d.sent)
  }

  // ==================== Sending Status Actions ====================

  function addSendingStatus(status: Omit<AgentSendingStatus, 'startedAt'>): AgentSendingStatus {
    const newStatus: AgentSendingStatus = {
      ...status,
      startedAt: Date.now(),
    }
    sendingStatuses.value.push(newStatus)

    if (sendingStatuses.value.length > MAX_SENDING_STATUS) {
      sendingStatuses.value = sendingStatuses.value.slice(-MAX_SENDING_STATUS)
    }

    return newStatus
  }

  function updateSendingStatus(draftId: string, update: Partial<AgentSendingStatus>): void {
    const status = sendingStatuses.value.find((s) => s.draftId === draftId)
    if (status) {
      Object.assign(status, update)
    }
  }

  function removeSendingStatus(draftId: string): void {
    sendingStatuses.value = sendingStatuses.value.filter((s) => s.draftId !== draftId)
  }

  function clearSendingStatuses(): void {
    sendingStatuses.value = []
  }

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
    observerResults.value = new Map(observerResults.value).set(sessionId, [...results, result])
  }

  /** 清空指定会话的 Observer 结果 */
  function clearObserverResults(sessionId: string): void {
    const newMap = new Map(observerResults.value)
    newMap.delete(sessionId)
    observerResults.value = newMap
  }

  // ==================== Keyword Actions ====================

  /** 添加关键词匹配结果 */
  function addKeywordResult(sessionId: string, result: KeywordResult): void {
    const results = keywordResults.value.get(sessionId) ?? []
    keywordResults.value = new Map(keywordResults.value).set(sessionId, [...results, result])
  }

  /** 清空指定会话的关键词匹配结果 */
  function clearKeywordResults(sessionId: string): void {
    const newMap = new Map(keywordResults.value)
    newMap.delete(sessionId)
    keywordResults.value = newMap
  }

  // ==================== Auto Reply Tracking ====================

  function incrementAutoReplyCount(): void {
    autoReplyCount.value++
    lastAutoReplyAt.value = Date.now()
  }

  function resetAutoReplyCount(): void {
    autoReplyCount.value = 0
    lastAutoReplyAt.value = null
  }

  // ==================== Migration ====================

  /** 从 B1 旧 sessionStorage 迁移数据到 B2 新结构 */
  function migrateFromB1(): void {
    try {
      const stored = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('aiAgent')
        : null
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.config?.enabled) {
          enabled.value = true
        }
        window.sessionStorage.removeItem('aiAgent')
      }
    } catch {
      // 静默失败
    }
  }

  /** store 初始化时自动执行数据迁移 */
  migrateFromB1()

  // ==================== Reset ====================

  function $reset(): void {
    config.value = { ...DEFAULT_CONFIG }
    enabled.value = false
    persistedConfig.value = { ...DEFAULT_PERSISTED_CONFIG }
    sessionConfigs.value = {}
    observerStates.value = new Map()
    observerResults.value = new Map()
    keywordResults.value = new Map()
    drafts.value = []
    sendingStatuses.value = []
    autoReplyCount.value = 0
    lastAutoReplyAt.value = null
  }

  return {
    // State
    config,
    enabled,
    persistedConfig,
    sessionConfigs,
    observerStates,
    observerResults,
    keywordResults,
    drafts,
    sendingStatuses,
    autoReplyCount,
    lastAutoReplyAt,

    // Getters
    pendingDrafts,
    hasPendingDrafts,
    activeSendings,
    hasActiveSendings,
    canAutoReply,
    getEffectiveConfig,

    // Config Actions (B1 deprecated)
    updateConfig,
    resetConfig,
    addTargetSession,
    removeTargetSession,
    isSessionTargeted,

    // Config Actions (B2)
    updateDefaultPermission,
    setDefaultActions,
    setSessionConfig,
    clearSessionConfig,
    resetPersistedConfig,

    // Per-session permission
    canAutoReplySession,

    // Observer Actions
    getObserverState,
    updateObserverState,
    addObserverResult,
    clearObserverResults,

    // Keyword Actions
    addKeywordResult,
    clearKeywordResults,

    // Draft Actions
    addDraft,
    removeDraft,
    markDraftSent,
    clearDrafts,
    clearSentDrafts,

    // Sending Status Actions
    addSendingStatus,
    updateSendingStatus,
    removeSendingStatus,
    clearSendingStatuses,

    // Auto Reply Tracking
    incrementAutoReplyCount,
    resetAutoReplyCount,

    // Migration
    migrateFromB1,

    // Reset
    $reset,
  }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    pick: ['enabled', 'persistedConfig', 'sessionConfigs'],
  },
})
