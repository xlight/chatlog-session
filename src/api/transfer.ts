/**
 * 转账记录 API
 * GET /api/v1/transfer
 */

import { request } from '@/utils/request'
import type { TransferResponse, TransferParams } from '@/types/social'

/**
 * 转账记录 API 单例
 */
class TransferAPI {
  private basePath = '/api/v1/transfer'

  /**
   * 获取转账记录列表
   */
  async getTransfers(params?: TransferParams): Promise<TransferResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.direction && params.direction !== 'all') {
      queryParams.direction = params.direction
    }
    if (params?.year) {
      queryParams.year = params.year
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    return request.get<TransferResponse>(this.basePath, queryParams)
  }
}

export const transferAPI = new TransferAPI()
export default transferAPI
