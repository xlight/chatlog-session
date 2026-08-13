/**
 * 全文搜索类型定义
 * 对应后端 GET /api/v1/search（swagger model.SearchResponse）
 */

/**
 * 搜索范围：messages（默认）/contacts/favorites/all
 */
export type SearchScope = 'messages' | 'contacts' | 'favorites' | 'all'

/**
 * 全文搜索查询参数
 */
export interface SearchParams {
  /** 搜索关键词（必填） */
  q: string
  /** 搜索范围，默认 messages */
  scope?: SearchScope
  /** 会话过滤（messages 范围） */
  talker?: string
  /** 发送者过滤（messages 范围） */
  sender?: string
  /** 时间范围，如 2026-01-01 或 2026-01-01~2026-01-31 */
  time?: string
  /** 起始日期 YYYY-MM-DD（与 end 成对） */
  start?: string
  /** 结束日期 YYYY-MM-DD（与 start 成对） */
  end?: string
  /** 返回条数，默认 500（后端最大 5000） */
  limit?: number
  /** 偏移量 */
  offset?: number
  /** 跳过总数统计（加速） */
  skip_total?: boolean
}

/**
 * 索引构建状态（swagger model.SearchIndexStatus）
 */
export interface SearchIndexStatus {
  ready: boolean
  in_progress: boolean
  progress: number
  last_completed_at: string
  last_started_at: string
  last_error: string
}

/**
 * 单条搜索命中（转换后：message 为前端 Message 格式）
 */
export interface SearchHit {
  message: import('@/types/message').Message
  snippet: string
  score: number
}

/**
 * 搜索结果（转换后）
 */
export interface SearchResponse {
  hits: SearchHit[]
  total: number
  duration_ms: number
  index_status: SearchIndexStatus
  query: string
  talker: string
  sender: string
  start: string
  end: string
  limit: number
  offset: number
}
