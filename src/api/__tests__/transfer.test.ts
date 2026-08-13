import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transferAPI } from '@/api/transfer'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendTransfer = (overrides: Record<string, unknown> = {}) => ({
  transfer_id: 'T1001',
  transcation_id: 'TR2001',
  message_server_id: 1000000001,
  second_message_server_id: 1000000002,
  session_name: 'wxid_b',
  pay_sub_type: 3,
  pay_receiver: 'wxid_b',
  pay_payer: 'wxid_a',
  begin_transfer_time: 1723075200,
  last_modified_time: 1723075260,
  invalid_time: 1723078800,
  last_update_time: 1723075260,
  delay_confirm_flag: 0,
  amount: 40,
  ...overrides,
})

describe('TransferAPI - 数据层对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transform snake_case 到 camelCase，金额为元', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendTransfer()], total: 1 })

    const response = await transferAPI.getTransfers({ direction: 'sent', limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/transfer', { direction: 'sent', limit: 20 })
    const item = response.items[0]
    expect(item.transferId).toBe('T1001')
    expect(item.transcationId).toBe('TR2001')
    expect(item.sessionName).toBe('wxid_b')
    expect(item.payReceiver).toBe('wxid_b')
    expect(item.payPayer).toBe('wxid_a')
    expect(item.beginTransferTime).toBe(1723075200)
    expect(item.delayConfirmFlag).toBe(0)
    expect(item.amount).toBe(40)
    // direction=sent → 全部为发出
    expect(item.isSender).toBe(true)
  })

  it('direction=received 时 isSender 为 false；direction=all 时为中性（false）且不传 direction', async () => {
    mockGet
      .mockResolvedValueOnce({ items: [backendTransfer()], total: 1 })
      .mockResolvedValueOnce({ items: [backendTransfer()], total: 1 })

    const received = await transferAPI.getTransfers({ direction: 'received', limit: 20 })
    expect(received.items[0].isSender).toBe(false)

    const all = await transferAPI.getTransfers({ limit: 20 })
    expect(mockGet).toHaveBeenLastCalledWith('/api/v1/transfer', { limit: 20 })
    expect(all.items[0].isSender).toBe(false)
  })

  it('amount 缺失（omitempty）时兜底为 0', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendTransfer({ amount: undefined })], total: 1 })

    const response = await transferAPI.getTransfers({ limit: 20 })

    expect(response.items[0].amount).toBe(0)
  })

  it('透传 talker/time 参数（time 原样传递，与 year 并存两者都传）', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendTransfer()], total: 1 })

    await transferAPI.getTransfers({
      talker: 'wxid_b',
      time: '2026-01-01~2026-01-31',
      year: 2026,
      limit: 20,
    })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/transfer', {
      direction: undefined,
      year: 2026,
      talker: 'wxid_b',
      time: '2026-01-01~2026-01-31',
      limit: 20,
      offset: undefined,
    })
  })
})
