/**
 * 收藏内容 API
 * GET /api/v1/favorite
 */

import { request } from '@/utils/request'
import type { FavoriteResponse, FavoriteParams } from '@/types/social'

/**
 * 收藏内容 API 单例
 */
class FavoriteAPI {
  private basePath = '/api/v1/favorite'

  /**
   * 获取收藏列表
   */
  async getFavorites(params?: FavoriteParams): Promise<FavoriteResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.tag) {
      queryParams.tag = params.tag
    }
    if (params?.type) {
      queryParams.type = params.type
    }
    if (params?.keyword) {
      queryParams.keyword = params.keyword
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    return request.get<FavoriteResponse>(this.basePath, queryParams)
  }
}

export const favoriteAPI = new FavoriteAPI()
export default favoriteAPI
