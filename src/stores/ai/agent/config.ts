/**
 * aiAgent store - config 子模块（核心）
 *
 * 定义主要 state（config / enabled / persistedConfig / sessionConfigs /
 * observerStates / observerResults / observerStreaming / keywordResults / drafts /
 * autoReplyTrackers / analysisAborts）、Config 相关常量与工具函数
 * （deriveLevelPreset / applyLevelPreset）、以及 Config 相关 actions
 * （updateConfig / resetConfig / addTargetSession / removeTargetSession /
 *  isSessionTargeted / updateDefaultLevelPreset / setDefaultActions /
 *  setSessionConfig / clearSessionConfig / resetPersistedConfig /
 *  migrateFromB1 / migratePersistedConfig）。
 *
 * 其他子模块（draft / observer / keyword / autoReply）依赖此模块返回的 context。
 */
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useSessionStore } from '@/stores/session'
import type {
  AgentConfig,
  AgentSessionFilter,
  SendPermissionLevel,
  AgentLevelPreset,
  AgentAction,
  SessionAgentConfig,
  PersistedAgentConfig,
  ObserverState,
  ObserverResult,
  StreamingObserverResult,
  KeywordResult,
  AgentDraft,
  AutoReplyTracker,
} from '@/types/ai/agent'
import { DEFAULT_MCP_TOOL_PERMISSION } from '@/types/ai/mcp'
import { OBSERVER_ANALYZE_TEMPLATE_ID } from '@/stores/ai/prompt'

// ==================== 常量 ====================

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
    promptTemplateId: OBSERVER_ANALYZE_TEMPLATE_ID,
    maxAutoReplies: 0,
    cooldownMs: 600000,
    mcpTools: { ...DEFAULT_MCP_TOOL_PERMISSION },
  },
}

export const MAX_RESULTS_PER_SESSION = 20

// ==================== 工具函数 ====================

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

// ==================== Context 接口 ====================

export interface AiAgentConfigContext {
  // State
  config: Ref<AgentConfig>
  enabled: Ref<boolean>
  persistedConfig: Ref<PersistedAgentConfig>
  sessionConfigs: Ref<Record<string, SessionAgentConfig>>
  observerStates: Ref<Map<string, ObserverState>>
  observerResults: Ref<Map<string, ObserverResult[]>>
  observerStreaming: Ref<Map<string, StreamingObserverResult | null>>
  keywordResults: Ref<Map<string, KeywordResult[]>>
  drafts: Ref<AgentDraft[]>
  autoReplyTrackers: Ref<Map<string, AutoReplyTracker>>
  analysisAborts: Map<string, AbortController>

  // Getters
  canAutoReply: ComputedRef<boolean>
  getEffectiveConfig: (sessionId: string) => SessionAgentConfig

  // Config Actions (B1 deprecated)
  updateConfig: (partial: Partial<AgentConfig>) => void
  resetConfig: () => void
  addTargetSession: (filter: AgentSessionFilter) => void
  removeTargetSession: (sessionId: string) => void
  isSessionTargeted: (sessionId: string) => boolean

  // Config Actions (B2)
  updateDefaultLevelPreset: (preset: AgentLevelPreset) => void
  setDefaultActions: (actions: AgentAction[]) => void
  setSessionConfig: (sessionId: string, partial: Partial<SessionAgentConfig>) => void
  clearSessionConfig: (sessionId: string) => void
  resetPersistedConfig: () => void

  // Per-session permission
  canAutoReplySession: (sessionId: string) => boolean
  canKeywordAutoSend: (sessionId: string) => boolean

  // Migration
  migrateFromB1: () => void
  migratePersistedConfig: () => void

  // $reset config 部分
  $resetConfig: () => void
}

// ==================== 子模块实现 ====================

export function useAiAgentConfig(): AiAgentConfigContext {
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
  /** 进行中的分析流 AbortController 注册表（sessionId → controller），供全局总闸中止 */
  const analysisAborts = new Map<string, AbortController>()

  // --- 不变 state ---
  const drafts = ref<AgentDraft[]>([])
  const autoReplyTrackers = ref<Map<string, AutoReplyTracker>>(new Map())

  // ==================== Getters ====================

  /** @deprecated 使用 canAutoReplySession(sessionId) 替代 */
  const canAutoReply = computed(() => {
    if (!enabled.value) return false
    if (config.value.mode !== 'auto') return false
    return true
  })

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
        allowedActions: sessionOverride?.userActions?.allowedActions ?? defaults.allowedActions,
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
    if ((defaults as any).sendPermission === 'send_cancellable' || (defaults as any).sendPermission === 'full_auto') {
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

    for (const [_sid, cfg] of Object.entries(sessionConfigs.value)) {
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
        maxContextMessages: defaults.observerMaxContextMessages,
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

  // ==================== Reset (config 部分) ====================

  function $resetConfig(): void {
    config.value = { ...DEFAULT_CONFIG }
    enabled.value = false
    persistedConfig.value = { ...DEFAULT_PERSISTED_CONFIG }
    sessionConfigs.value = {}
  }

  return {
    config,
    enabled,
    persistedConfig,
    sessionConfigs,
    observerStates,
    observerResults,
    observerStreaming,
    keywordResults,
    drafts,
    autoReplyTrackers,
    analysisAborts,
    canAutoReply,
    getEffectiveConfig,
    updateConfig,
    resetConfig,
    addTargetSession,
    removeTargetSession,
    isSessionTargeted,
    updateDefaultLevelPreset,
    setDefaultActions,
    setSessionConfig,
    clearSessionConfig,
    resetPersistedConfig,
    canAutoReplySession,
    canKeywordAutoSend,
    migrateFromB1,
    migratePersistedConfig,
    $resetConfig,
  }
}
