/**
 * 朋友圈 API
 * GET /api/v1/moments
 */

import { request } from '@/utils/request'
import type { MomentsResponse, MomentsParams } from '@/types/social'

/**
 * 朋友圈 API 单例
 */
class MomentsAPI {
  private basePath = '/api/v1/moments'

  /**
   * 获取朋友圈时间线
   */
  async getMoments(params?: MomentsParams): Promise<MomentsResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.username) {
      queryParams.username = params.username
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    return request.get<MomentsResponse>(this.basePath, queryParams)
  }
}

export const momentsAPI = new MomentsAPI()
export default momentsAPI
