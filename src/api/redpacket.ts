/**
 * 红包记录 API
 * GET /api/v1/redpacket
 */

import { request } from '@/utils/request'
import type { RedPacket, RedPacketResponse, RedPacketParams } from '@/types/social'

/**
 * 后端原始红包记录（swagger model.RedPacket，snake_case）
 */
interface BackendRedPacket {
  message_server_id: number
  session_name: string
  sender_user_name: string
  native_url: string
  send_id: string
  scene_id: number
  hb_status: number
  hb_type: number
  receive_status: number
  total_num?: number
  blessing?: string
}

/**
 * 转换后端红包到前端格式（snake_case → camelCase）
 * isSender 由后端 direction 推导：sent=全部发出、received=全部收到、all=中性（false）
 */
function transformRedPacket(backend: BackendRedPacket, isSender: boolean): RedPacket {
  return {
    messageServerId: backend.message_server_id,
    sessionName: backend.session_name,
    senderUserName: backend.sender_user_name,
    nativeUrl: backend.native_url,
    sendId: backend.send_id,
    sceneId: backend.scene_id,
    hbStatus: backend.hb_status,
    hbType: backend.hb_type,
    receiveStatus: backend.receive_status,
    totalNum: backend.total_num ?? 0,
    blessing: backend.blessing ?? '',
    isSender,
  }
}

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
    const response = await request.get<{
      items: BackendRedPacket[]
      total: number
    }>(this.basePath, queryParams)
    const isSender = params?.direction === 'sent'

    return {
      items: (response.items || []).map(item => transformRedPacket(item, isSender)),
      total: response.total,
    }
  }
}

export const redPacketAPI = new RedPacketAPI()
export default redPacketAPI
