/**
 * 全文搜索 API
 * 对应后端 GET /api/v1/search
 */

import { request } from '@/utils/request'
import { transformMessage } from './chatlog'
import type { MessageResponse } from '@/types/message'
import type { SearchHit, SearchIndexStatus, SearchParams, SearchResponse } from '@/types/search'

/**
 * 默认返回条数（后端默认 500；显式传入覆盖拦截器注入的 200）
 */
const DEFAULT_LIMIT = 500

/**
 * 后端原始命中结构
 */
interface BackendSearchHit {
  message: MessageResponse
  snippet: string
  score: number
}

/**
 * 后端原始响应结构（swagger model.SearchResponse）
 */
interface BackendSearchResponse {
  hits: BackendSearchHit[]
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

/**
 * 转换单条命中：message 复用 chatlog 的 transformMessage
 */
function transformHit(hit: BackendSearchHit): SearchHit {
  return {
    message: transformMessage(hit.message),
    snippet: hit.snippet,
    score: hit.score,
  }
}

/**
 * 转换搜索响应（hits 为空时兜底空数组）
 */
function transformSearchResponse(response: BackendSearchResponse): SearchResponse {
  return {
    ...response,
    hits: Array.isArray(response.hits) ? response.hits.map(transformHit) : [],
  }
}

/**
 * 全文搜索 API 单例
 */
class SearchAPI {
  private resourceUrl = '/api/v1/search'

  /**
   * 全文搜索
   * GET /api/v1/search
   *
   * @param params 搜索参数（q 必填）
   * @returns 搜索结果（含 hits/total/index_status）
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const query: Record<string, unknown> = {
      q: params.q,
      scope: params.scope ?? 'messages',
      // 显式注入默认 limit，避免被拦截器压到 200
      limit: params.limit ?? DEFAULT_LIMIT,
    }

    if (params.talker !== undefined) query.talker = params.talker
    if (params.sender !== undefined) query.sender = params.sender
    if (params.time !== undefined) query.time = params.time
    if (params.start !== undefined) query.start = params.start
    if (params.end !== undefined) query.end = params.end
    if (params.offset !== undefined) query.offset = params.offset
    if (params.skip_total !== undefined) query.skip_total = params.skip_total

    const response = await request.get<BackendSearchResponse>(this.resourceUrl, query)
    return transformSearchResponse(response)
  }
}

export const searchAPI = new SearchAPI()
export default searchAPI
