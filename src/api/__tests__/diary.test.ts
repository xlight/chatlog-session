import { describe, it, expect, vi, beforeEach } from 'vitest'
import { diaryAPI } from '@/api/diary'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendMessage = (overrides: Record<string, unknown> = {}) => ({
  seq: 1000000000001,
  time: '2026-01-01T10:00:00+08:00',
  talker: 'wxid_a',
  talkerName: '',
  isChatRoom: false,
  sender: 'wxid_a',
  senderName: '',
  isSelf: true,
  type: 1,
  subType: 0,
  content: '你好',
  ...overrides,
})

const backendDiaryEntry = (overrides: Record<string, unknown> = {}) => ({
  talker: 'wxid_a',
  talker_name: '联系人A',
  messages: [backendMessage()],
  ...overrides,
})

describe('DiaryAPI - 端点接入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDiary 显式传 limit 0（不限制，规避拦截器 200 截断）并透传 date/talker/keyword', async () => {
    mockGet.mockResolvedValueOnce([backendDiaryEntry()])

    const response = await diaryAPI.getDiary({ date: '2026-01-01', talker: 'wxid_a', keyword: '你好' })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/diary', {
      date: '2026-01-01',
      talker: 'wxid_a',
      keyword: '你好',
      limit: 0,
    })
    expect(response.length).toBe(1)
  })

  it('返回按会话分组的数组（非 items 包装），messages 复用 transformMessage', async () => {
    mockGet.mockResolvedValueOnce([backendDiaryEntry()])

    const response = await diaryAPI.getDiary({ date: '2026-01-01' })

    expect(Array.isArray(response)).toBe(true)
    const entry = response[0]
    expect(entry.talker).toBe('wxid_a')
    expect(entry.talkerName).toBe('联系人A')
    expect(entry.messages[0].id).toBe(1000000000001)
    expect(entry.messages[0].content).toBe('你好')
  })

  it('messages 缺失时兜底为空数组', async () => {
    mockGet.mockResolvedValueOnce([backendDiaryEntry({ messages: undefined })])

    const response = await diaryAPI.getDiary({ date: '2026-01-01' })

    expect(response[0].messages).toEqual([])
  })
})
