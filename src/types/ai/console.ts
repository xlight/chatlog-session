/**
 * Agent Console 领域类型
 *
 * Agent Console 自由对话、上下文投喂、活动日志、配置 Tab 等专用类型
 */

import type { ChatMessage } from './index'

/** ConsoleChat 多对话会话 */
export interface ConsoleChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  contextFeed?: ContextSource[]
}

/** Console 统计信息（总览 Tab 用） */
export interface ConsoleStats {
  totalSessions: number
  totalMessages: number
  lastActivityAt: number | null
}

/** 单次投喂的上下文来源（与 useContextFeed ContextTag 对齐） */
export interface ContextSource {
  sessionId: string
  sessionName: string
  messageCount: number
  timeRange: string
  fedAt: number
}

/** Agent 活动日志条目 */
export interface ActivityLogEntry {
  id: string
  timestamp: number
  action: ActivityAction
  detail: string
  sessionId?: string
}

/** Agent 活动类型 */
export type ActivityAction =
  | 'console_chat'
  | 'context_feed'
  | 'ai_reply'
  | 'ai_analyze'

/** Console 页面 Tab 类型 */
export type ConsoleTab = 'chat' | 'overview' | 'log' | 'sessions' | 'config'
