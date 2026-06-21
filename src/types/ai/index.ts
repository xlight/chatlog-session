/**
 * AI 相关类型定义
 *
 * 定义 AI 面板、AI 对话、Prompt 模板等领域的类型
 * 兼容 OpenAI Chat Completions API 格式
 */

/** OpenAI Chat 消息格式 */
export interface ChatMessage {
  id?: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  thinkingContent?: string
}

/** 工具调用信息 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具调用结果 */
export interface ToolResult {
  toolCallId: string
  toolName: string
  result: string
}

/** 后端能力扩展（butler/x-capabilities） */
export interface ModelCapabilities {
  tools?: boolean
  tool_names?: string[]
  [key: string]: unknown
}

/** 模型信息（包含扩展能力） */
export interface ModelInfo {
  id: string
  object?: string
  owned_by?: string
  created?: number
  capabilities: ModelCapabilities
}

/** 上下文数据 */
export interface ContextData {
  sessionName: string
  messageCount: number
  timeRange: string
  content: string
}

/** Prompt 变量定义 */
export interface PromptVariable {
  name: string
  description: string
  defaultValue?: string
  source: 'auto' | 'manual'
}

/** Prompt 模板 */
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'builtin' | 'custom'
  content: string
  variables: PromptVariable[]
  tags: string[]
}

/** Token 使用统计 */
export interface UsageInfo {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** AI 错误 */
export interface AIError {
  type:
    | 'auth_error'
    | 'rate_limit'
    | 'timeout'
    | 'network_error'
    | 'server_error'
    | 'aborted'
    | 'unknown_error'
  message: string
  code?: string
  retryable: boolean
  retryAfter?: number
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean
  modelCount: number
  models?: ModelInfo[]
  error?: string
  latencyMs?: number
}

/** 流式对话请求 */
export interface ChatStreamRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  signal?: AbortSignal
}

/** 流式 chunk 中的选项增量 */
export interface StreamDelta {
  role?: 'assistant'
  content?: string | null
  reasoning_content?: string | null
  tool_calls?: Array<{
    index: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }>
}

/** 流式 chunk（OpenAI 格式） */
export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: StreamDelta
    finish_reason: string | null
  }>
  usage?: UsageInfo | null
}

/** 已投喂的上下文项 */
export interface ContextTag {
  id: string
  sessionId: string
  sessionName: string
  messageCount: number
  timeRange: string
  fedAt: number
}

/** 「帮我回复」/「分析消息」生成的最近一次 AI 草稿（RecentReplyCard 显示用） */
export interface LastReply {
  messageId: string
  content: string
  promptType: 'reply' | 'analyze'
  sourceMessageId: string
  generatedAt: number
  injected: boolean
}
