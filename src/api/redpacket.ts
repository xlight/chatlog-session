/**
 * 红包记录 API
 * GET /api/v1/redpacket
 */

import { request } from '@/utils/request'
import type { RedPacketResponse, RedPacketParams } from '@/types/social'

/**
 * 红包记录 API 单例
 */
class RedPacketAPI {
  private basePath = '/api/v1/redpacket'

  /**
   * 获取红包记录列表
   */
  async getRedPackets(params?: RedPacketParams): Promise<RedPacketResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.direction && params.direction !== 'all') {
      queryParams.direction = params.direction
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    return request.get<RedPacketResponse>(this.basePath, queryParams)
  }
}

export const redPacketAPI = new RedPacketAPI()
export default redPacketAPI
