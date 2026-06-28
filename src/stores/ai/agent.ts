import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import type {
  AgentConfig,
  AgentDraft,
  AgentSendingStatus,
  AgentSessionFilter,
  SendPermissionLevel,
  AgentLevelPreset,
  AutoReplyTracker,
  AgentAction,
  SessionAgentConfig,
  PersistedAgentConfig,
  ObserverState,
  ObserverResult,
  StreamingObserverResult,
  KeywordResult,
} from '@/types/ai/agent'
import { DEFAULT_MCP_TOOL_PERMISSION } from '@/types/ai/mcp'

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  mode: 'draft',
  targetSessions: [],
  promptTemplateId: 'builtin-reply',
  requireConfirm: true,
  maxAutoReplies: 0,
  cooldownMs: 600000,
}

const DEFAULT_PERSISTED_CONFIG: PersistedAgentConfig = {
  defaults: {
    levelPreset: 'L2',
    sendPermission: 'draft_confirm',
    allowedActions: ['draft_reply', 'analyze'],
    observerEnabled: false,
    observerIntervalSeconds: 300,
    observerMinNewMessages: 5,
    observerAutoReply: false,
    observerAutoReplyCount: 1,
    observerMaxContextMessages: 20,
    keywordEnabled: false,
    keywordMatchPatterns: [],
    promptTemplateId: 'builtin-reply',
    maxAutoReplies: 0,
    cooldownMs: 600000,
    mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION },
  },
}

const MAX_DRAFTS = 20
const MAX_SENDING_STATUS = 50
const MAX_RESULTS_PER_SESSION = 20

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function deriveLevelPreset(config: SessionAgentConfig): AgentLevelPreset {
  const { sendPermission, observer, keywordMonitor } = config
  if (sendPermission === 'forbidden' && !observer.enabled && !keywordMonitor.enabled) return 'L0'
  if (sendPermission === 'forbidden' && observer.enabled && !keywordMonitor.enabled && !observer.autoReply) return 'L1'
  if (sendPermission === 'draft_confirm' && observer.enabled && !keywordMonitor.enabled && !observer.autoReply) return 'L2'
  if (sendPermission === 'auto' && observer.enabled && keywordMonitor.enabled && !observer.autoReply) return 'L3'
  if (sendPermission === 'auto' && observer.enabled && !keywordMonitor.enabled && observer.autoReply) return 'L4'
  return 'Custom'
}

export function applyLevelPreset(preset: AgentLevelPreset): Partial<SessionAgentConfig> {
  switch (preset) {
    case 'L0': return { sendPermission: 'forbidden', observer: { enabled: false, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 }, keywordMonitor: { enabled: false, matchPatterns: [] }, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: false } }
    case 'L1': return { sendPermission: 'forbidden', observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 15 }, keywordMonitor: { enabled: false, matchPatterns: [] }, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: false } }
    case 'L2': return { sendPermission: 'draft_confirm', observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 15 }, keywordMonitor: { enabled: false, matchPatterns: [] }, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: true, requireConfirmation: true } }
    case 'L3': return { sendPermission: 'auto', observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 25 }, keywordMonitor: { enabled: true, matchPatterns: [] }, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: true, requireConfirmation: false } }
    case 'L4': return { sendPermission: 'auto', observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: true, autoReplyCount: 1, maxContextMessages: 25 }, keywordMonitor: { enabled: false, matchPatterns: [] }, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: true, requireConfirmation: false } }
    case 'Custom': return {}
  }
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
  const observerStreaming = ref<Map<string, StreamingObserverResult | null>>(new Map())
  const keywordResults = ref<Map<string, KeywordResult[]>>(new Map())

  // --- 不变 state ---
  const drafts = ref<AgentDraft[]>([])
  const sendingStatuses = ref<AgentSendingStatus[]>([])
  const autoReplyTrackers = ref<Map<string, AutoReplyTracker>>(new Map())

  // ==================== Getters ====================

  const pendingDrafts = computed(() =>
    drafts.value.filter((d) => !d.sent)
  )

  const hasPendingDrafts = computed(() => pendingDrafts.value.length > 0)

  const activeSendings = computed(() =>
    sendingStatuses.value.filter((s) => s.status === 'sending')
  )

  const hasActiveSendings = computed(() => activeSendings.value.length > 0)

  /** 获取指定会话的有效配置（session override → 置顶会话 defaults / L0） */
  function getEffectiveConfig(sessionId: string): SessionAgentConfig {
    const sessionOverride = sessionConfigs.value[sessionId]

    // 无单独配置时：置顶会话使用 persistedConfig.defaults，非置顶会话回退 L0
    const sessionStore = useSessionStore()
    const session = sessionStore.sessions.find(s => s.id === sessionId)
    const isPinned = session?.isLocalPinned === true
    const defaults = isPinned
      ? persistedConfig.value.defaults
      : { ...DEFAULT_PERSISTED_CONFIG.defaults, levelPreset: 'L0' as AgentLevelPreset, sendPermission: 'forbidden' as SendPermissionLevel, observerEnabled: false, keywordEnabled: false, observerAutoReply: false, mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: false } }

    const config: SessionAgentConfig = {
      sessionId,
      levelPreset: 'L0', // placeholder, derived below
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
        autoReply: sessionOverride?.observer?.autoReply ?? defaults.observerAutoReply,
        autoReplyCount: sessionOverride?.observer?.autoReplyCount ?? defaults.observerAutoReplyCount,
        maxContextMessages: sessionOverride?.observer?.maxContextMessages ?? defaults.observerMaxContextMessages,
      },
      keywordMonitor: {
        enabled: sessionOverride?.keywordMonitor?.enabled ?? defaults.keywordEnabled,
        matchPatterns: sessionOverride?.keywordMonitor?.matchPatterns ?? [...defaults.keywordMatchPatterns],
      },
      promptTemplateId: sessionOverride?.promptTemplateId ?? defaults.promptTemplateId,
      maxAutoReplies: sessionOverride?.maxAutoReplies ?? defaults.maxAutoReplies,
      cooldownMs: sessionOverride?.cooldownMs ?? defaults.cooldownMs,
      mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION, ...(defaults.mcpTools ?? {}), ...(sessionOverride?.mcpTools ?? {}) },
    }

    if (sessionOverride?.model) {
      config.model = sessionOverride.model
    }

    config.levelPreset = deriveLevelPreset(config)

    // 当 sessionOverride 未显式设置 mcpTools 时，根据推导出的 levelPreset 补充默认值
    // 修复旧数据缺少 mcpTools 字段导致 L3/L4 下 mcpTools.enabled 仍为 false 的问题
    if (!sessionOverride?.mcpTools) {
      const presetMcp = applyLevelPreset(config.levelPreset).mcpTools
      if (presetMcp) {
        config.mcpTools = { ...DEFAULT_MCP_TOOL_PERMISSION, ...presetMcp }
      }
    }

    return config
  }

  /** @deprecated 使用 canAutoReplySession(sessionId) 替代 */
  const canAutoReply = computed(() => {
    if (!enabled.value) return false
    if (config.value.mode !== 'auto') return false
    return true
  })

  /** 检查指定会话是否有权限自动回复（per-session 版） */
  function canAutoReplySession(sessionId: string): boolean {
    if (!enabled.value) return false
    const effective = getEffectiveConfig(sessionId)
    if (!effective.observer.autoReply || effective.sendPermission !== 'auto') return false
    if (effective.maxAutoReplies > 0) {
      const tracker = autoReplyTrackers.value.get(sessionId)
      if (tracker && tracker.count >= effective.maxAutoReplies) return false
    }
    if (effective.cooldownMs > 0) {
      const tracker = autoReplyTrackers.value.get(sessionId)
      if (tracker?.lastAt && Date.now() - tracker.lastAt < effective.cooldownMs) return false
    }
    return true
  }

  /** 检查指定会话是否允许关键词自动发送 */
  function canKeywordAutoSend(sessionId: string): boolean {
    if (!enabled.value) return false
    const effective = getEffectiveConfig(sessionId)
    return effective.keywordMonitor.enabled && effective.sendPermission === 'auto'
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

  /** 更新全局默认预设级别 */
  function updateDefaultLevelPreset(preset: AgentLevelPreset): void {
    const patch = applyLevelPreset(preset)
    persistedConfig.value = {
      ...persistedConfig.value,
      defaults: {
        ...persistedConfig.value.defaults,
        levelPreset: preset,
        sendPermission: patch.sendPermission ?? persistedConfig.value.defaults.sendPermission,
        observerEnabled: patch.observer?.enabled ?? persistedConfig.value.defaults.observerEnabled,
        observerAutoReply: patch.observer?.autoReply ?? persistedConfig.value.defaults.observerAutoReply,
        keywordEnabled: patch.keywordMonitor?.enabled ?? persistedConfig.value.defaults.keywordEnabled,
        mcpTools: patch.mcpTools ?? persistedConfig.value.defaults.mcpTools,
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

  /** 迁移旧格式配置到新格式（send_cancellable/full_auto → auto，推导 levelPreset） */
  function migratePersistedConfig(): void {
    const defaults = persistedConfig.value.defaults
    let changed = false

    // send_cancellable / full_auto → auto
    if (defaults.sendPermission === 'send_cancellable' || defaults.sendPermission === 'full_auto') {
      (defaults as any).sendPermission = 'auto'
      changed = true
    }

    if (!(defaults as any).mcpTools) {
      (defaults as any).mcpTools = { ...DEFAULT_MCP_TOOL_PERMISSION }
      changed = true
    } else {
      const mcp = (defaults as any).mcpTools
      if (mcp.enabled === undefined) { mcp.enabled = false; changed = true }
      if (mcp.requireConfirmation === undefined) { mcp.requireConfirmation = true; changed = true }
      if (!mcp.allowedTools) { mcp.allowedTools = []; changed = true }
      if (!mcp.deniedTools) { mcp.deniedTools = []; changed = true }
      if (mcp.callTimeoutMs === undefined) { mcp.callTimeoutMs = 30000; changed = true }
      if (mcp.maxLoopCount === undefined) { mcp.maxLoopCount = 10; changed = true }
    }

    for (const [sid, cfg] of Object.entries(sessionConfigs.value)) {
      if (!(cfg as any).mcpTools) {
        ;(cfg as any).mcpTools = { ...DEFAULT_MCP_TOOL_PERMISSION }
        changed = true
      } else {
        const mcp = (cfg as any).mcpTools
        if (mcp.enabled === undefined) { mcp.enabled = false; changed = true }
        if (mcp.requireConfirmation === undefined) { mcp.requireConfirmation = true; changed = true }
        if (!mcp.allowedTools) { mcp.allowedTools = []; changed = true }
        if (!mcp.deniedTools) { mcp.deniedTools = []; changed = true }
        if (mcp.callTimeoutMs === undefined) { mcp.callTimeoutMs = 30000; changed = true }
        if (mcp.maxLoopCount === undefined) { mcp.maxLoopCount = 10; changed = true }
      }
    }

    // 推导 levelPreset
    const tempConfig: SessionAgentConfig = {
      sessionId: '__migration__',
      levelPreset: 'L0',
      sendPermission: defaults.sendPermission as SendPermissionLevel,
      userActions: { enabled: true, allowedActions: defaults.allowedActions },
      allowScheduledMessages: false,
      observer: {
        enabled: defaults.observerEnabled,
        intervalSeconds: defaults.observerIntervalSeconds,
        minNewMessages: defaults.observerMinNewMessages,
        autoReply: defaults.observerAutoReply,
        autoReplyCount: defaults.observerAutoReplyCount,
      },
      keywordMonitor: {
        enabled: defaults.keywordEnabled,
        matchPatterns: defaults.keywordMatchPatterns,
      },
      maxAutoReplies: defaults.maxAutoReplies,
      cooldownMs: defaults.cooldownMs,
      mcpTools: (defaults as any).mcpTools,
    }

    const derivedPreset = deriveLevelPreset(tempConfig)
    if (!('levelPreset' in defaults) || (defaults as any).levelPreset !== derivedPreset) {
      (defaults as any).levelPreset = derivedPreset
      changed = true
    }

    if (changed) {
      persistedConfig.value = { ...persistedConfig.value }
      sessionConfigs.value = { ...sessionConfigs.value }
    }
  }

  /** store 初始化时自动执行数据迁移 */
  migrateFromB1()
  migratePersistedConfig()

  // ==================== Reset ====================

  function $reset(): void {
    config.value = { ...DEFAULT_CONFIG }
    enabled.value = false
    persistedConfig.value = { ...DEFAULT_PERSISTED_CONFIG }
    sessionConfigs.value = {}
    observerStates.value = new Map()
    observerResults.value = new Map()
    observerStreaming.value = new Map()
    keywordResults.value = new Map()
    drafts.value = []
    sendingStatuses.value = []
    autoReplyTrackers.value = new Map()
  }

  return {
    // State
    config,
    enabled,
    persistedConfig,
    sessionConfigs,
    observerStates,
    observerResults,
    observerStreaming,
    keywordResults,
    drafts,
    sendingStatuses,
    autoReplyTrackers,

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
    updateDefaultLevelPreset,
    setDefaultActions,
    setSessionConfig,
    clearSessionConfig,
    resetPersistedConfig,

    // Per-session permission
    canAutoReplySession,
    canKeywordAutoSend,

    // Observer Actions
    getObserverState,
    updateObserverState,
    addObserverResult,
    clearObserverResults,
    updateStreamingState,
    clearStreamingState,

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
    getAutoReplyTracker,
    incrementAutoReplyTracker,
    resetAutoReplyTracker,

    // Migration
    migrateFromB1,
    migratePersistedConfig,

    // Reset
    $reset,
  }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    pick: ['enabled', 'persistedConfig', 'sessionConfigs'],
  },
})
