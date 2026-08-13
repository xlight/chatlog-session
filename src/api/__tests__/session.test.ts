import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessionAPI } from '@/api/session'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
    all: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendSession = (overrides: Record<string, unknown> = {}) => ({
  userName: 'wxid_a',
  nickName: '会话A',
  content: '最后一条消息',
  nTime: 1723075200,
  nUnReadCount: 0,
  nOrder: 1,
  parentRef: 'wxid_a',
  ...overrides,
})

const sessionResponse = (items: unknown[]) => ({ items, total: items.length })

describe('SessionAPI - API 客户端对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSessionDetail 用 keyword 精确搜索而非 /session/:talker（后端无此路由）', async () => {
    mockGet.mockResolvedValueOnce(sessionResponse([backendSession({ userName: 'wxid_a' })]))

    const session = await sessionAPI.getSessionDetail('wxid_a')

    expect(mockGet).toHaveBeenCalledWith('/api/v1/session', { keyword: 'wxid_a', limit: 0 })
    expect(session?.talker).toBe('wxid_a')
  })

  it('getSessionDetail 未命中返回 null', async () => {
    mockGet.mockResolvedValueOnce(sessionResponse([backendSession({ userName: 'wxid_b' })]))

    const session = await sessionAPI.getSessionDetail('wxid_a')

    expect(session).toBeNull()
  })

  it('getSessionsByType 后端忽略 type 参数：拉全量后按前端 type 过滤', async () => {
    mockGet.mockResolvedValueOnce(
      sessionResponse([
        backendSession({ userName: 'wxid_private', parentRef: '' }),
        backendSession({ userName: 'room@chatroom', parentRef: 'wxid_group' }),
      ])
    )

    const privateSessions = await sessionAPI.getSessionsByType('private', 50)

    expect(mockGet).toHaveBeenCalledWith('/api/v1/session', { limit: 0 })
    expect(privateSessions).toHaveLength(1)
    expect(privateSessions[0].talker).toBe('wxid_private')
  })

  it('getSessionStats 与未读/置顶统计走全量拉取', async () => {
    mockGet.mockResolvedValueOnce(
      sessionResponse([
        backendSession({ userName: 'wxid_1', nUnReadCount: 3 }),
        backendSession({ userName: 'wxid_2', nUnReadCount: 0 }),
      ])
    )

    const stats = await sessionAPI.getSessionStats()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/session', { limit: 0 })
    expect(stats.total).toBe(2)
    expect(stats.unread).toBe(1)
  })
})
