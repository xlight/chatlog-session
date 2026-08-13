import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactAPI } from '@/api/contact'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
    all: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendContact = (overrides: Record<string, unknown> = {}) => ({
  userName: 'wxid_a',
  alias: '',
  remark: '',
  nickName: '联系人A',
  isFriend: true,
  isPinned: false,
  isMinimized: false,
  ...overrides,
})

const contactResponse = (items: unknown[]) => ({ items, total: items.length })

describe('ContactAPI - API 客户端对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getContactDetail 用 keyword 精确搜索而非 /contact/:wxid（后端无此路由）', async () => {
    mockGet.mockResolvedValueOnce(contactResponse([backendContact({ userName: 'wxid_a' })]))

    const contact = await contactAPI.getContactDetail('wxid_a')

    expect(mockGet).toHaveBeenCalledWith('/api/v1/contact', { keyword: 'wxid_a', limit: 0 })
    expect(contact?.wxid).toBe('wxid_a')
  })

  it('getContactDetail 未命中返回 null', async () => {
    mockGet.mockResolvedValueOnce(contactResponse([backendContact({ userName: 'wxid_b' })]))

    const contact = await contactAPI.getContactDetail('wxid_a')

    expect(contact).toBeNull()
  })

  it('getAllContacts 显式 limit=0（规避拦截器 200 截断）', async () => {
    mockGet.mockResolvedValueOnce(contactResponse([backendContact()]))

    await contactAPI.getAllContacts()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/contact', { limit: 0 })
  })

  it('transformContact 基于 verifyFlag 判断公众号（8/24）与服务号（29），@chatroom 优先', async () => {
    mockGet.mockResolvedValueOnce(
      contactResponse([
        backendContact({ userName: 'gh_xxx', verifyFlag: 0 }),
        backendContact({ userName: 'official_no_prefix', verifyFlag: 8 }),
        backendContact({ userName: 'service_account', verifyFlag: 29 }),
        backendContact({ userName: 'room@chatroom', verifyFlag: 0 }),
        backendContact({ userName: 'plain_friend', verifyFlag: 0 }),
      ])
    )

    const contacts = await contactAPI.getAllContacts()
    const byWxid = Object.fromEntries(contacts.map(c => [c.wxid, c.type]))

    // gh_ 前缀回落仍为公众号
    expect(byWxid['gh_xxx']).toBe('official')
    // verifyFlag=8 无 gh_ 前缀也能识别公众号
    expect(byWxid['official_no_prefix']).toBe('official')
    // verifyFlag=29 服务号归公众号
    expect(byWxid['service_account']).toBe('official')
    // @chatroom 优先于 verifyFlag
    expect(byWxid['room@chatroom']).toBe('chatroom')
    expect(byWxid['plain_friend']).toBe('friend')
  })

  it('getChatroomMembers 改走 chatroom 数据源（contact 无 memberList）', async () => {
    const { chatroomAPI } = await import('@/api/chatroom')
    vi.spyOn(chatroomAPI, 'getChatroomDetail').mockResolvedValueOnce({
      chatroomId: 'room@chatroom',
      name: '群聊A',
      avatar: '',
      memberCount: 2,
      owner: 'wxid_o',
      members: [
        { wxid: 'wxid_m1', nickname: '成员1', displayName: '成员1' },
        { wxid: 'wxid_m2', nickname: '成员2', displayName: '成员2' },
      ],
    })

    const members = await contactAPI.getChatroomMembers('room@chatroom')

    expect(chatroomAPI.getChatroomDetail).toHaveBeenCalledWith('room@chatroom')
    expect(members).toHaveLength(2)
    expect(members[0].wxid).toBe('wxid_m1')
    expect(members[0].type).toBe('friend')
  })

  it('getChatroomMembers 群聊不存在返回空数组', async () => {
    const { chatroomAPI } = await import('@/api/chatroom')
    vi.spyOn(chatroomAPI, 'getChatroomDetail').mockResolvedValueOnce(null)

    const members = await contactAPI.getChatroomMembers('unknown@chatroom')

    expect(members).toEqual([])
  })
})
