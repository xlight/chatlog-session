/**
 * Agent 自动回复领域类型
 *
 * 定义 Agent 自动回复配置、草稿、发送状态等专用类型
 */

/** Agent 自动回复配置 */
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

/** 回复模式 */
export type AgentReplyMode = 'draft' | 'auto'

/** 会话过滤条件 */
export interface AgentSessionFilter {
  /** 会话 ID */
  sessionId: string
  /** 会话名称（仅展示用） */
  sessionName: string
}

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

/** Agent 发送任务状态 */
export interface AgentSendingStatus {
  /** 草稿 ID */
  draftId: string
  /** 队列 message_id */
  messageId: number
  /** 联系人名称 */
  contactName: string
  /** 发送内容摘要 */
  contentPreview: string
  /** 发送状态 */
  status: 'sending' | 'completed' | 'failed' | 'cancelled'
  /** 错误信息 */
  error?: string
  /** 开始时间 */
  startedAt: number
}

/** Agent 活动类型扩展（追加到 ActivityAction） */
export type AgentActivityAction =
  | 'agent_draft_generated'
  | 'agent_draft_sent'
  | 'agent_draft_cancelled'
  | 'agent_auto_reply'
