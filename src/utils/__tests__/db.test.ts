/**
 * db.ts / base-db.ts 基线测试
 *
 * 迁移到 Dexie 前锁定现有行为，迁移后全量跑通即证明等价。
 * 使用 fake-indexeddb（已在 setup.ts 注入 globalThis.indexedDB）。
 * Worker 在 jsdom 不可用，db.ts 会降级到主线程执行——测试覆盖主线程路径。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../db'
import type { Contact, Chatroom } from '@/types'
import { ContactType } from '@/types/contact'

// ==================== 测试数据 ====================

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    wxid: 'test_001',
    nickname: '测试用户',
    remark: '',
    alias: '',
    type: 1,
    verifyFlag: 0,
    reserved1: 0,
    ...overrides,
  } as Contact
}

function makeChatroom(overrides: Partial<Chatroom> = {}): Chatroom {
  return {
    chatroomId: 'test_room@chatroom',
    name: '测试群聊',
    memberCount: 3,
    reserved1: 0,
    ...overrides,
  } as Chatroom
}

// ==================== 联系人测试 ====================

describe('db.ts 基线测试 — 联系人', () => {
  beforeEach(async () => {
    await db.clearContacts()
    await db.clearChatrooms()
  })

  afterEach(async () => {
    await db.clearContacts()
    await db.clearChatrooms()
  })

  describe('saveContact / getContact', () => {
    it('保存并获取单个联系人', async () => {
      const contact = makeContact({ wxid: 'u1', nickname: '用户1' })
      await db.saveContact(contact)
      const result = await db.getContact('u1')
      expect(result).not.toBeNull()
      expect(result?.wxid).toBe('u1')
      expect(result?.nickname).toBe('用户1')
    })

    it('获取不存在的联系人返回 null', async () => {
      const result = await db.getContact('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('saveContacts（批量保存）', () => {
    it('批量保存多个联系人', async () => {
      const contacts = [
        makeContact({ wxid: 'u1', nickname: '用户1' }),
        makeContact({ wxid: 'u2', nickname: '用户2' }),
        makeContact({ wxid: 'u3', nickname: '用户3' }),
      ]
      await db.saveContacts(contacts)
      const all = await db.getAllContacts()
      expect(all).toHaveLength(3)
    })

    it('空数组不报错', async () => {
      await db.saveContacts([])
      const all = await db.getAllContacts()
      expect(all).toHaveLength(0)
    })
  })

  describe('getAllContacts', () => {
    it('获取全部联系人', async () => {
      await db.saveContacts([
        makeContact({ wxid: 'u1', nickname: 'A' }),
        makeContact({ wxid: 'u2', nickname: 'B' }),
      ])
      const all = await db.getAllContacts()
      expect(all).toHaveLength(2)
      const nicknames = all.map(c => c.nickname).sort()
      expect(nicknames).toEqual(['A', 'B'])
    })

    it('空数据库返回空数组', async () => {
      const all = await db.getAllContacts()
      expect(all).toHaveLength(0)
    })
  })

  describe('getContactsByType', () => {
    it('按类型筛选联系人', async () => {
      await db.saveContacts([
        makeContact({ wxid: 'u1', type: ContactType.Friend }),
        makeContact({ wxid: 'u2', type: ContactType.Chatroom }),
        makeContact({ wxid: 'u3', type: ContactType.Friend }),
      ])
      const type1 = await db.getContactsByType(ContactType.Friend)
      expect(type1).toHaveLength(2)
      const type2 = await db.getContactsByType(ContactType.Chatroom)
      expect(type2).toHaveLength(1)
    })
  })

  describe('searchContacts（全表扫描 — 迁移后改索引查询）', () => {
    beforeEach(async () => {
      await db.saveContacts([
        makeContact({ wxid: 'wxid_abc', nickname: '张三', remark: '老张', alias: 'zhangsan' }),
        makeContact({ wxid: 'wxid_def', nickname: '李四', remark: '', alias: 'lisi' }),
        makeContact({ wxid: 'wxid_xyz', nickname: '王五', remark: '小王', alias: '' }),
      ])
    })

    it('按 nickname 搜索', async () => {
      const results = await db.searchContacts('张')
      expect(results).toHaveLength(1)
      expect(results[0].nickname).toBe('张三')
    })

    it('按 remark 搜索', async () => {
      const results = await db.searchContacts('老张')
      expect(results).toHaveLength(1)
      expect(results[0].remark).toBe('老张')
    })

    it('按 alias 搜索', async () => {
      const results = await db.searchContacts('lisi')
      expect(results).toHaveLength(1)
      expect(results[0].alias).toBe('lisi')
    })

    it('按 wxid 搜索', async () => {
      const results = await db.searchContacts('wxid_abc')
      expect(results).toHaveLength(1)
      expect(results[0].wxid).toBe('wxid_abc')
    })

    it('大小写不敏感', async () => {
      const results = await db.searchContacts('ZHANGSAN')
      expect(results).toHaveLength(1)
    })

    it('空关键词返回全部', async () => {
      const results = await db.searchContacts('')
      expect(results).toHaveLength(3)
    })

    it('无匹配返回空数组', async () => {
      const results = await db.searchContacts('不存在的名字')
      expect(results).toHaveLength(0)
    })
  })

  describe('getContacts（分页）', () => {
    beforeEach(async () => {
      const contacts = Array.from({ length: 10 }, (_, i) =>
        makeContact({ wxid: `u${i}`, nickname: `用户${i}` })
      )
      await db.saveContacts(contacts)
    })

    it('第一页', async () => {
      const { contacts, hasMore } = await db.getContacts(0, 5)
      expect(contacts).toHaveLength(5)
      expect(hasMore).toBe(true)
    })

    it('第二页', async () => {
      // Dexie 迁移后：total 返回真实记录总数，hasMore 基于 offset+limit < total
      const { contacts, hasMore } = await db.getContacts(5, 5)
      expect(contacts).toHaveLength(5)
      expect(hasMore).toBe(false)
    })

    it('超出范围返回空', async () => {
      const { contacts, hasMore } = await db.getContacts(20, 5)
      expect(contacts).toHaveLength(0)
      expect(hasMore).toBe(false)
    })
  })

  describe('getContactCount', () => {
    it('返回准确计数', async () => {
      await db.saveContacts([
        makeContact({ wxid: 'u1' }),
        makeContact({ wxid: 'u2' }),
      ])
      const count = await db.getContactCount()
      expect(count).toBe(2)
    })

    it('空数据库返回 0', async () => {
      const count = await db.getContactCount()
      expect(count).toBe(0)
    })
  })

  describe('deleteContact / clearContacts', () => {
    it('删除单个联系人', async () => {
      await db.saveContact(makeContact({ wxid: 'u1' }))
      await db.deleteContact('u1')
      const result = await db.getContact('u1')
      expect(result).toBeNull()
    })

    it('清空所有联系人', async () => {
      await db.saveContacts([
        makeContact({ wxid: 'u1' }),
        makeContact({ wxid: 'u2' }),
      ])
      await db.clearContacts()
      const all = await db.getAllContacts()
      expect(all).toHaveLength(0)
    })
  })
})

// ==================== 群聊测试 ====================

describe('db.ts 基线测试 — 群聊', () => {
  beforeEach(async () => {
    await db.clearContacts()
    await db.clearChatrooms()
  })

  afterEach(async () => {
    await db.clearContacts()
    await db.clearChatrooms()
  })

  describe('saveChatroom / getChatroom', () => {
    it('保存并获取单个群聊', async () => {
      const room = makeChatroom({ chatroomId: 'r1@chatroom', name: '群1' })
      await db.saveChatroom(room)
      const result = await db.getChatroom('r1@chatroom')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('群1')
    })

    it('获取不存在的群聊返回 null', async () => {
      const result = await db.getChatroom('nonexistent@chatroom')
      expect(result).toBeNull()
    })
  })

  describe('searchChatrooms', () => {
    beforeEach(async () => {
      await db.saveChatrooms([
        makeChatroom({ chatroomId: 'room1@chatroom', name: '开发群' }),
        makeChatroom({ chatroomId: 'room2@chatroom', name: '测试群' }),
      ])
    })

    it('按 name 搜索', async () => {
      const results = await db.searchChatrooms('开发')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('开发群')
    })

    it('按 chatroomId 搜索', async () => {
      const results = await db.searchChatrooms('room1')
      expect(results).toHaveLength(1)
      expect(results[0].chatroomId).toBe('room1@chatroom')
    })

    it('无匹配返回空', async () => {
      const results = await db.searchChatrooms('不存在的群')
      expect(results).toHaveLength(0)
    })
  })

  describe('getChatroomCount', () => {
    it('返回准确计数', async () => {
      await db.saveChatrooms([
        makeChatroom({ chatroomId: 'r1@chatroom' }),
        makeChatroom({ chatroomId: 'r2@chatroom' }),
      ])
      const count = await db.getChatroomCount()
      expect(count).toBe(2)
    })
  })
})
