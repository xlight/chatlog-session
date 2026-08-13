/**
 * 洞察 API
 * GET /api/v1/insight/contact|emoticon|resource|revoke
 */

import { request } from '@/utils/request'
import type {
  InsightContactStats,
  InsightEmoticonStats,
  InsightResourceStats,
  InsightRevokeParams,
  InsightRevokeResponse,
  RevokeRecord,
} from '@/types/insight'

/**
 * 后端原始联系人标签（snake_case）
 */
interface BackendContactLabel {
  label_id: number
  label_name: string
  sort_order: number
}

/**
 * 后端原始群规模（snake_case）
 */
interface BackendChatRoomSize {
  user_name: string
  members: number
}

/**
 * 后端原始资源类型统计（snake_case）
 */
interface BackendResourceTypeStat {
  type: string
  media_type: string
  count: number
  total_size: number
}

/**
 * 后端原始资源发送者统计（snake_case）
 */
interface BackendResourceSenderStat {
  user_name: string
  count: number
  total_size: number
}

/**
 * 后端原始月度趋势（month/count 无 snake_case 字段）
 */
interface BackendResourceMonthlyStat {
  month: string
  count: number
}

/**
 * 后端原始撤回记录（snake_case）
 */
interface BackendRevokeRecord {
  sender_nickname: string
  content: string
  revoke_time: number
  session_name: string
  seq: number
  create_time: number
}

/**
 * 转换后端撤回记录到前端格式（snake_case → camelCase）
 */
function transformRevokeRecord(backend: BackendRevokeRecord): RevokeRecord {
  return {
    senderNickname: backend.sender_nickname,
    content: backend.content,
    revokeTime: backend.revoke_time,
    sessionName: backend.session_name,
    seq: backend.seq,
    createTime: backend.create_time,
  }
}

/**
 * 洞察 API 单例
 */
class InsightAPI {
  /**
   * 获取联系人洞察
   * verify_flag 为 {中文标签: count} map 透传；labels/room_sizes 元素做 camelCase transform
   */
  async getContactStats(): Promise<InsightContactStats> {
    const response = await request.get<{
      verify_flag: Record<string, number>
      labels: BackendContactLabel[]
      room_sizes: BackendChatRoomSize[]
    }>('/api/v1/insight/contact')
    return {
      verifyFlag: response.verify_flag || {},
      labels: (response.labels || []).map(label => ({
        labelId: label.label_id,
        labelName: label.label_name,
        sortOrder: label.sort_order,
      })),
      roomSizes: (response.room_sizes || []).map(room => ({
        userName: room.user_name,
        members: room.members,
      })),
    }
  }

  /**
   * 获取表情洞察
   * stats 为 map[string]int64 透传（key 为表情标识，非数组）
   */
  async getEmoticonStats(): Promise<InsightEmoticonStats> {
    const response = await request.get<{ stats: Record<string, number> }>('/api/v1/insight/emoticon')
    return { stats: response.stats || {} }
  }

  /**
   * 获取资源洞察
   * types/senders 元素做 camelCase transform；monthly 透传（无 snake_case 字段）
   */
  async getResourceStats(): Promise<InsightResourceStats> {
    const response = await request.get<{
      types: BackendResourceTypeStat[]
      senders: BackendResourceSenderStat[]
      monthly: BackendResourceMonthlyStat[]
    }>('/api/v1/insight/resource')
    return {
      types: (response.types || []).map(item => ({
        type: item.type,
        mediaType: item.media_type,
        count: item.count,
        totalSize: item.total_size,
      })),
      senders: (response.senders || []).map(item => ({
        userName: item.user_name,
        count: item.count,
        totalSize: item.total_size,
      })),
      monthly: (response.monthly || []).map(item => ({
        month: item.month,
        count: item.count,
      })),
    }
  }

  /**
   * 获取撤回记录列表
   * time 原样透传（后端 TimeRangeOf 解析）；items 做 snake_case → camelCase transform
   */
  async getRevokeRecords(params?: InsightRevokeParams): Promise<InsightRevokeResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.time) {
      queryParams.time = params.time
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{
      items: BackendRevokeRecord[]
      total: number
    }>('/api/v1/insight/revoke', queryParams)
    return {
      items: (response.items || []).map(transformRevokeRecord),
      total: response.total,
    }
  }
}

export const insightAPI = new InsightAPI()
export default insightAPI
