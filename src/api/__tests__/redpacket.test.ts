import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redPacketAPI } from '@/api/redpacket'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendRedPacket = (overrides: Record<string, unknown> = {}) => ({
  message_server_id: 1000000003,
  session_name: 'room@chatroom',
  sender_user_name: 'wxid_a',
  native_url: 'https://wx.qq.com/cgi-bin/mmbizhonghong?sendid=10000',
  send_id: '10000',
  scene_id: 2001,
  hb_status: 3,
  hb_type: 1,
  receive_status: 2,
  total_num: 10,
  blessing: '新年快乐',
  ...overrides,
})

describe('RedPacketAPI - 数据层对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transform snake_case 到 camelCase，total_num/blessing 兜底', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendRedPacket()], total: 1 })

    const response = await redPacketAPI.getRedPackets({ direction: 'sent', limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/redpacket', { direction: 'sent', limit: 20 })
    const item = response.items[0]
    expect(item.messageServerId).toBe(1000000003)
    expect(item.sessionName).toBe('room@chatroom')
    expect(item.senderUserName).toBe('wxid_a')
    expect(item.nativeUrl).toBe('https://wx.qq.com/cgi-bin/mmbizhonghong?sendid=10000')
    expect(item.hbStatus).toBe(3)
    expect(item.hbType).toBe(1)
    expect(item.receiveStatus).toBe(2)
    expect(item.totalNum).toBe(10)
    expect(item.blessing).toBe('新年快乐')
    // direction=sent → 全部为发出
    expect(item.isSender).toBe(true)
  })

  it('omitempty 字段缺失时兜底；direction=received 时 isSender 为 false', async () => {
    mockGet.mockResolvedValueOnce({
      items: [backendRedPacket({ total_num: undefined, blessing: undefined })],
      total: 1,
    })

    const response = await redPacketAPI.getRedPackets({ direction: 'received', limit: 20 })

    expect(response.items[0].totalNum).toBe(0)
    expect(response.items[0].blessing).toBe('')
    expect(response.items[0].isSender).toBe(false)
  })
})
