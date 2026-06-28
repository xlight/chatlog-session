/**
 * MCP (Model Context Protocol) 相关类型定义
 *
 * 定义 MCP Server 配置、传输、工具、资源、Prompt、工具调用记录、权限等类型
 * 兼容 MCP 2025-03-26 规范 (Streamable HTTP) 及旧版 SSE 传输
 */

// ==================== MCP Server 配置 ====================

/** MCP 传输类型 */
export type MCPTransportType = 'streamable-http' | 'sse'

/** MCP Server 连接状态 */
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/** MCP Server 配置（持久化到 settings） */
export interface MCPServerConfig {
  /** 唯一标识（kebab-case，用于工具命名空间） */
  id: string
  /** 显示名称 */
  name: string
  /** 传输类型 */
  transport: MCPTransportType
  /** Server URL */
  url: string
  /** 自定义请求头（如 Authorization） */
  headers?: Record<string, string>
  /** 请求超时（毫秒），默认 30000 */
  timeout?: number
  /** 是否启用 */
  enabled: boolean
  /** 是否自动连接 */
  autoConnect?: boolean
  /** 内置 Server 标记（如 "chatlog-api"、"sendmsg-api"），内置 Server 不可删除、URL 自动同步 */
  builtin?: string
}

// ==================== MCP Server 运行时信息 ====================

/** MCP Server 运行时信息（不持久化） */
export interface MCPServerInfo {
  /** 对应的配置 ID */
  configId: string
  /** 连接状态 */
  status: MCPServerStatus
  /** MCP 协议会话 ID（Streamable HTTP 传输） */
  sessionId?: string
  /** Server 声明的协议版本 */
  protocolVersion?: string
  /** Server 能力声明 */
  capabilities?: MCPServerCapabilities
  /** Server 信息 */
  serverInfo?: { name: string; version?: string }
  /** 可用工具列表 */
  tools: MCPTool[]
  /** 可用资源列表 */
  resources: MCPResource[]
  /** 可用 Prompt 列表 */
  prompts: MCPPrompt[]
  /** 错误信息 */
  error?: string
  /** 上次连接时间 */
  connectedAt?: number
}

/** MCP Server 能力声明 */
export interface MCPServerCapabilities {
  tools?: { listChanged?: boolean }
  resources?: { subscribe?: boolean; listChanged?: boolean }
  prompts?: { listChanged?: boolean }
  logging?: {}
  completions?: {}
  elicitation?: {}
}

// ==================== MCP 工具 / 资源 / Prompt ====================

/** MCP 工具定义 */
export interface MCPTool {
  /** 工具名称（原始名称，不含命名空间前缀） */
  name: string
  /** 工具描述 */
  description?: string
  /** 输入参数 JSON Schema */
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/** MCP 资源定义 */
export interface MCPResource {
  /** 资源 URI */
  uri: string
  /** 资源名称 */
  name: string
  /** 资源描述 */
  description?: string
  /** MIME 类型 */
  mimeType?: string
}

/** MCP Prompt 定义 */
export interface MCPPrompt {
  /** Prompt 名称 */
  name: string
  /** Prompt 描述 */
  description?: string
  /** 参数列表 */
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

// ==================== 工具调用记录 ====================

/** 工具调用状态 */
export type ToolCallStatus = 'calling' | 'confirming' | 'success' | 'error' | 'rejected' | 'timeout'

/** 工具调用记录（持久化到 session） */
export interface ToolCallRecord {
  /** 唯一 ID */
  id: string
  /** OpenAI tool_call ID */
  toolCallId: string
  /** 命名空间工具名：mcp__{serverId}__{toolName} */
  namespacedName: string
  /** 原始工具名 */
  toolName: string
  /** MCP Server ID */
  serverId: string
  /** 调用参数（JSON 字符串） */
  arguments: string
  /** 调用状态 */
  status: ToolCallStatus
  /** 调用结果（成功时） */
  result?: string
  /** 错误信息（失败时） */
  error?: string
  /** 调用开始时间 */
  startedAt: number
  /** 调用结束时间 */
  finishedAt?: number
  /** 是否需要用户确认 */
  requireConfirmation: boolean
  /** 用户是否已确认 */
  confirmed?: boolean
}

// ==================== MCP 工具权限 ====================

/** MCP 工具权限配置（per-session） */
export interface MCPToolPermission {
  /** 是否启用 MCP 工具 */
  enabled: boolean
  /** 是否需要确认（L2 级别默认 true） */
  requireConfirmation: boolean
  /** 允许的工具列表（命名空间格式，空 = 允许全部） */
  allowedTools: string[]
  /** 禁止的工具列表（命名空间格式，优先级高于 allowedTools） */
  deniedTools: string[]
  /** 单次调用超时（毫秒），默认 30000 */
  callTimeoutMs: number
  /** 最大循环次数，默认 10 */
  maxLoopCount: number
}

/** 默认 MCP 工具权限 */
export const DEFAULT_MCP_TOOL_PERMISSION: MCPToolPermission = {
  enabled: false,
  requireConfirmation: true,
  allowedTools: [],
  deniedTools: [],
  callTimeoutMs: 30000,
  maxLoopCount: 10,
}

/** 内置 MCP Server 模板（URL 在运行时由对应 API 地址推导） */
export const BUILTIN_MCP_SERVERS: Array<Omit<MCPServerConfig, 'url'> & { builtin: string; urlSource: 'apiBaseUrl' | 'sendmsgApiUrl' }> = [
  {
    id: 'chatlog-api',
    name: 'Chatlog API',
    transport: 'streamable-http',
    urlSource: 'apiBaseUrl',
    enabled: true,
    autoConnect: true,
    builtin: 'chatlog-api',
  },
  {
    id: 'sendmsg-api',
    name: 'Sendmsg API',
    transport: 'streamable-http',
    urlSource: 'sendmsgApiUrl',
    enabled: true,
    autoConnect: true,
    builtin: 'sendmsg-api',
  },
]

// ==================== 工具命名空间工具函数 ====================

/** 生成命名空间工具名：mcp__{serverId}__{toolName} */
export function namespacedToolName(serverId: string, toolName: string): string {
  return `mcp__${serverId}__${toolName}`
}

/** 解析命名空间工具名，返回 [serverId, toolName] */
export function parseNamespacedName(namespacedName: string): { serverId: string; toolName: string } | null {
  const match = /^mcp__([a-zA-Z0-9_-]+)__(.+)$/.exec(namespacedName)
  if (!match) return null
  return { serverId: match[1], toolName: match[2] }
}
