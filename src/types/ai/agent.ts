/**
 * Agent 自动回复领域类型
 *
 * 定义 Agent 自动回复配置、草稿、发送状态等专用类型
 */

// ==================== Phase B1 旧类型（保留兼容） ====================

/** @deprecated 使用 `PersistedAgentConfig` + `SessionAgentConfig` 替代 */
export interface AgentConfig {
  /** 是否启用自动回复 */
  enabled: boolean
  /** 回复模式 */
  mode: AgentReplyMode
  /** 目标会话过滤（空 = 全部） */
  targetSessions: AgentSessionFilter[]
  /** Prompt 模板 ID */
  promptTemplateId: string
  /** 发送前是否需要确认（草稿模式） */
  requireConfirm: boolean
  /** 最大自动回复次数（0 = 无限） */
  maxAutoReplies: number
  /** 冷却时间（毫秒） */
  cooldownMs: number
}

/** @deprecated 使用 `SendPermissionLevel` 替代 */
export type AgentReplyMode = 'draft' | 'auto'

/** @deprecated 保留兼容 */
export interface AgentSessionFilter {
  /** 会话 ID */
  sessionId: string
  /** 会话名称（仅展示用） */
  sessionName: string
}

// ==================== Phase B2 新类型 ====================

/** 三级发送权限（send_cancellable 和 full_auto 合并为 auto） */
export type SendPermissionLevel = 'forbidden' | 'draft_confirm' | 'auto'

/** Agent 能力预设 — UI 快捷方式，运行时行为由底层独立字段决定 */
export type AgentLevelPreset = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'Custom'

/** Per-session 自动回复追踪 */
export interface AutoReplyTracker {
  /** 该 session 累计自动回复次数 */
  count: number
  /** 该 session 上次自动回复的时间戳，null 表示从未触发 */
  lastAt: number | null
}

/** Agent 可执行操作类型 */
export type AgentAction =
  | 'analyze'
  | 'draft_reply'
  | 'ask_ai'
  | 'summarize'
  | 'extract_todos'
  | 'profile'
  | 'mcp_tool_call'

/** 会话级 Agent 配置（完整版，含 observer 和 keywordMonitor） */
export interface SessionAgentConfig {
  /** 会话 ID */
  sessionId: string
  /** UI 预设级别 — 由 deriveLevelPreset() 推导，非真源 */
  levelPreset: AgentLevelPreset
  /** 发送权限级别 — 底层独立字段，真源 */
  sendPermission: SendPermissionLevel
  /** 用户操作权限 */
  userActions: {
    /** 是否启用用户操作 */
    enabled: boolean
    /** 允许的操作列表 */
    allowedActions: AgentAction[]
  }
  /** 是否允许定时消息（预留，Phase B2 无运行时行为） */
  allowScheduledMessages: boolean
  /** 旁观分析模式配置 */
  observer: {
    /** 是否启用 */
    enabled: boolean
    /** 两次分析的最小间隔（秒），默认 300 */
    intervalSeconds: number
    /** 触发分析的最少新增消息数，默认 5 */
    minNewMessages: number
    /** 分析后是否自动回复 */
    autoReply: boolean
    /** 每次分析最多回复条数，默认 1 */
    autoReplyCount: number
    /** 每次分析传递给 LLM 的最多原始消息数量，默认 20 */
    maxContextMessages: number
  }
  /** 关键词监测模式配置 */
  keywordMonitor: {
    /** 是否启用 */
    enabled: boolean
    /** 关键词列表，任一匹配即触发 */
    matchPatterns: string[]
  }
  /** 覆盖全局 Prompt 模板 ID */
  promptTemplateId?: string
  /** 覆盖全局模型（仅影响 Agent 分析调用，不影响 AI Console/Panel） */
  model?: string
  /** 最大自动回复次数（0 = 无限） */
  maxAutoReplies: number
  /** 冷却时间（毫秒） */
  cooldownMs: number
  /** MCP 工具权限配置 */
  mcpTools: import('./mcp').MCPToolPermission
}

/** 全局持久化 Agent 配置（存储在 localStorage）
 *
 * 注：不包含 `enabled`（由 `settingsStore.ai.enabled` 管理）和 `aiBackend`（运行时 computed）
 */
export interface PersistedAgentConfig {
  /** 置顶会话默认值 */
  defaults: {
    /** 默认预设级别 — 由 deriveLevelPreset() 推导 */
    levelPreset: AgentLevelPreset
    /** 默认发送权限 — 底层独立字段，三级模型 */
    sendPermission: SendPermissionLevel
    /** 默认允许的操作 */
    allowedActions: AgentAction[]
    /** 默认启动旁观分析 */
    observerEnabled: boolean
    /** 默认分析间隔（秒） */
    observerIntervalSeconds: number
    /** 默认触发分析的最少新消息数 */
    observerMinNewMessages: number
    /** 默认分析后自动回复 */
    observerAutoReply: boolean
    /** 默认每次分析最多回复条数 */
    observerAutoReplyCount: number
    /** 默认每次分析传递给 LLM 的最多原始消息数量 */
    observerMaxContextMessages: number
    /** 默认启动关键词监测 */
    keywordEnabled: boolean
    /** 默认关键词列表 */
    keywordMatchPatterns: string[]
    /** 默认 Prompt 模板 ID */
    promptTemplateId: string
    /** 默认最大自动回复次数 */
    maxAutoReplies: number
    /** 默认冷却时间（毫秒） */
    cooldownMs: number
    /** 默认 MCP 工具权限 */
    mcpTools: import('./mcp').MCPToolPermission
  }
}

// ==================== Phase C 新类型（Observer + KeywordMonitor） ====================

/** 旁观分析运行时状态（不持久化） */
export interface ObserverState {
  /** 会话 ID */
  sessionId: string
  /** 上次分析时间戳（秒级，与 Message.createTime 同精度） */
  lastAnalysisTime: number
  /** 上次分析覆盖的消息 ID 集合，用于精确追踪增量（补偿 createTime 秒级精度不足） */
  lastAnalyzedMessageIds?: Set<number>
  /** 自上次分析以来的新增消息数 */
  accumulatedMessageCount: number
  /** 是否正在 AI 分析中 */
  isAnalyzing: boolean
  /** 上次分析的错误信息 */
  error?: string
  /** 最近一次成功的结果（缓存供快速展示） */
  lastResult?: ObserverResult
  /** 上一次分析的结果摘要（用于增量上下文构建），与 lastResult 在常规情况下相同 */
  incrementalContext?: ObserverResult
}

/** 旁观分析结果 */
export interface ObserverResult {
  /** 唯一 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 分析状态 */
  status: 'success' | 'error'
  /** AI 生成的会话摘要 */
  summary: string
  /** 关键点列表 */
  keyPoints: string[]
  /** 建议回复或行动 */
  suggestions: string[]
  /** 分析失败时的错误消息 */
  error?: string
  /** 分析时间戳 */
  analyzedAt: number
  /** 本次分析覆盖的消息数 */
  messageCount: number
  /** 本次分析覆盖的消息时间范围起点（Unix 秒级时间戳，messages[0].createTime） */
  startTime?: number
  /** 本次分析覆盖的消息时间范围终点（Unix 秒级时间戳，messages[-1].createTime） */
  endTime?: number
}

/** 流式分析结果（分析过程中实时构建） */
export interface StreamingObserverResult {
  /** 流式状态 */
  streamingStatus: 'streaming' | 'complete' | 'error'
  /** 实时追加的摘要文本 */
  streamingSummary: string
  /** 逐条添加的关键点 */
  streamingKeyPoints: string[]
  /** 逐条添加的建议 */
  streamingSuggestions: string[]
}

/** 关键词匹配结果 */
export interface KeywordResult {
  /** 唯一 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 触发匹配的源消息 ID */
  sourceMessageId: string
  /** 匹配到的关键词 */
  matchedPattern: string
  /** 分析状态 */
  status: 'success' | 'error'
  /** AI 分析摘要 */
  summary: string
  /** AI 建议的回复 */
  replySuggestion?: string
  /** 分析失败时的错误消息 */
  error?: string
  /** 提及上下文（如果消息是回复/引用） */
  mentionContext?: {
    /** 提及者名称 */
    mentionedBy: string
    /** 对方说的内容摘要 */
    whatTheyAsk: string
  }
  /** 分析时间戳 */
  analyzedAt: number
}

// ==================== 不变类型 ====================

/** Agent 草稿状态 */
export interface AgentDraft {
  /** 唯一 ID */
  id: string
  /** 来源消息 ID */
  sourceMessageId: string
  /** 来源会话 ID */
  sessionId: string
  /** 会话名称（展示用） */
  sessionName: string
  /** 联系人名称（发送用） */
  contactName: string
  /** 草稿内容 */
  content: string
  /** 生成时间戳 */
  generatedAt: number
  /** 是否已发送 */
  sent: boolean
  /** 发送后的 job ID（用于轮询状态） */
  jobId?: number
}

/** Agent 活动类型扩展（追加到 ActivityAction） */
export type AgentActivityAction =
  | 'agent_draft_generated'
  | 'agent_draft_sent'
  | 'agent_draft_cancelled'
  | 'agent_auto_reply'
