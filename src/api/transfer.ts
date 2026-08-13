/**
 * 转账记录 API
 * GET /api/v1/transfer
 */

import { request } from '@/utils/request'
import type { Transfer, TransferResponse, TransferParams } from '@/types/social'

/**
 * 后端原始转账记录（swagger model.Transfer，snake_case）
 */
interface BackendTransfer {
  transfer_id: string
  transcation_id: string
  message_server_id: number
  second_message_server_id: number
  session_name: string
  pay_sub_type: number
  pay_receiver: string
  pay_payer: string
  begin_transfer_time: number
  last_modified_time: number
  invalid_time: number
  last_update_time: number
  delay_confirm_flag: number
  amount?: number
}

/**
 * 转换后端转账到前端格式（snake_case → camelCase）
 * isSender 由后端 direction 推导：sent=全部发出、received=全部收到、all=中性（false）
 */
function transformTransfer(backend: BackendTransfer, isSender: boolean): Transfer {
  return {
    transferId: backend.transfer_id,
    transcationId: backend.transcation_id,
    messageServerId: backend.message_server_id,
    secondMessageServerId: backend.second_message_server_id,
    sessionName: backend.session_name,
    paySubType: backend.pay_sub_type,
    payReceiver: backend.pay_receiver,
    payPayer: backend.pay_payer,
    beginTransferTime: backend.begin_transfer_time,
    lastModifiedTime: backend.last_modified_time,
    invalidTime: backend.invalid_time,
    lastUpdateTime: backend.last_update_time,
    delayConfirmFlag: backend.delay_confirm_flag,
    amount: backend.amount ?? 0,
    isSender,
  }
}

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
    if (params?.talker) {
      queryParams.talker = params.talker
    }
    // time 原样透传（后端 TimeRangeOf 解析），与 year 并存两者都传（后端 time 优先）
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
      items: BackendTransfer[]
      total: number
    }>(this.basePath, queryParams)
    const isSender = params?.direction === 'sent'

    return {
      items: (response.items || []).map(item => transformTransfer(item, isSender)),
      total: response.total,
    }
  }
}

export const transferAPI = new TransferAPI()
export default transferAPI
