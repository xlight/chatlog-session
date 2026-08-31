import type { Contact, Chatroom } from '@/types'
import { ContactType } from '@/types/contact'
import { BaseDatabase, type DBConfig } from './base-db'

const CONTACT_STORE = 'contacts'
const CHATROOM_STORE = 'chatrooms'

interface WorkerRequest {
  id: string
  action: 'init' | 'clearAndSaveMany' | 'saveMany' | 'clear'
  dbConfig?: DBConfig
  storeName?: string
  items?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface WorkerResponse {
  id: string
  success: boolean
  error?: string
  type?: 'progress' | 'complete'
  currentChunk?: number
  totalChunks?: number
}

class Database extends BaseDatabase {
  protected config: DBConfig = {
    name: 'ChatlogSessionDB',
    version: 3,
    stores: [
      {
        name: CONTACT_STORE,
        keyPath: 'wxid',
        indexes: [
          { name: 'nickname', keyPath: 'nickname', unique: false },
          { name: 'remark', keyPath: 'remark', unique: false },
          { name: 'alias', keyPath: 'alias', unique: false },
          { name: 'type', keyPath: 'type', unique: false },
          { name: 'verifyFlag', keyPath: 'verifyFlag', unique: false },
          { name: 'reserved1', keyPath: 'reserved1', unique: false },
        ],
      },
      {
        name: CHATROOM_STORE,
        keyPath: 'chatroomId',
        indexes: [
          { name: 'name', keyPath: 'name', unique: false },
          { name: 'memberCount', keyPath: 'memberCount', unique: false },
          { name: 'reserved1', keyPath: 'reserved1', unique: false },
        ],
      },
    ],
  }

  private worker: Worker | null = null
  private workerReady = false
  private workerFailed = false
  private pendingRequests = new Map<
    string,
    {
      resolve: () => void
      reject: (err: Error) => void
      onProgress?: (currentChunk: number, totalChunks: number) => void
    }
  >()
  private requestCounter = 0

  private getWorker(): Worker | null {
    if (this.workerFailed) return null
    if (this.worker) return this.worker

    try {
      this.worker = new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' })

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, error, type, currentChunk, totalChunks } = event.data
        const pending = this.pendingRequests.get(id)
        if (!pending) return

        if (type === 'progress') {
          if (pending.onProgress && currentChunk != null && totalChunks != null) {
            pending.onProgress(currentChunk, totalChunks)
          }
          return
        }

        this.pendingRequests.delete(id)
        if (success) {
          pending.resolve()
        } else {
          pending.reject(new Error(error || 'Worker 操作失败'))
        }
      }

      this.worker.onerror = event => {
        console.error('❌ DB Worker 错误:', event.message)
      }

      this.sendToWorker('init', { dbConfig: this.config })
        .then(() => {
          this.workerReady = true
          console.log('✅ DB Worker 初始化成功')
        })
        .catch(err => {
          console.warn('⚠️ DB Worker 初始化失败，将降级到主线程:', err)
          this.workerFailed = true
          this.worker?.terminate()
          this.worker = null
        })

      return this.worker
    } catch (err) {
      console.warn('⚠️ 无法创建 DB Worker，将降级到主线程:', err)
      this.workerFailed = true
      return null
    }
  }

  private sendToWorker(
    action: WorkerRequest['action'],
    params: Omit<WorkerRequest, 'id' | 'action'> = {},
    onProgress?: (currentChunk: number, totalChunks: number) => void
  ): Promise<void> {
    const worker = this.worker || this.getWorker()
    if (!worker) {
      return Promise.reject(new Error('Worker 不可用'))
    }

    const id = `req_${++this.requestCounter}`
    const message: WorkerRequest = { id, action, ...params }
    const itemCount = params.items?.length || 0
    const t0 = performance.now()
    console.log(`⏱️ [sendToWorker] ${action} id=${id}，数据量: ${itemCount}`)

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress })
      worker.postMessage(message)
      const t1 = performance.now()
      console.log(`⏱️ [sendToWorker] postMessage 完成，耗时: ${(t1 - t0).toFixed(1)}ms`)
    })
  }

  /**
   * 通过 Worker 执行写入操作（失败时降级到主线程）
   */
  private async writeViaWorker(
    action: 'clearAndSaveMany' | 'saveMany' | 'clear',
    storeName: string,
    items?: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    onProgress?: (currentChunk: number, totalChunks: number) => void
  ): Promise<void> {
    const t0 = performance.now()
    const itemCount = items?.length || 0
    console.log(`⏱️ [writeViaWorker] 开始 ${action}，数据量: ${itemCount}，store: ${storeName}`)

    const worker = this.getWorker()
    if (worker) {
      try {
        if (!this.workerReady && !this.workerFailed) {
          console.log(`⏱️ [writeViaWorker] Worker 未就绪，等待初始化...`)
          await this.sendToWorker('init', { dbConfig: this.config })
          this.workerReady = true
          console.log(
            `⏱️ [writeViaWorker] Worker 初始化完成，耗时: ${(performance.now() - t0).toFixed(1)}ms`
          )
        }

        const tSend = performance.now()
        console.log(`⏱️ [writeViaWorker] 准备 postMessage 给 Worker，数据量: ${itemCount}`)
        await this.sendToWorker(
          action,
          {
            storeName,
            items,
            dbConfig: this.workerReady ? undefined : this.config,
          },
          onProgress
        )
        const tDone = performance.now()
        console.log(
          `⏱️ [writeViaWorker] Worker 完成 ${action}，Worker 耗时: ${(tDone - tSend).toFixed(1)}ms，总耗时: ${(tDone - t0).toFixed(1)}ms`
        )
        return
      } catch (err) {
        console.warn(`⚠️ Worker ${action} 失败，降级到主线程:`, err)
      }
    }

    console.log(`⏱️ [writeViaWorker] 降级到主线程执行 ${action}`)
    const tFallback = performance.now()
    switch (action) {
      case 'clearAndSaveMany':
        await this.clearAndSaveMany(storeName, items || [])
        break
      case 'saveMany':
        await this.saveMany(storeName, items || [])
        break
      case 'clear':
        await this.clear(storeName)
        break
    }
    console.log(
      `⏱️ [writeViaWorker] 主线程 ${action} 完成，耗时: ${(performance.now() - tFallback).toFixed(1)}ms`
    )
  }

  // ==================== 联系人相关方法 ====================

  async saveContact(contact: Contact): Promise<string> {
    return (await this.save(CONTACT_STORE, contact)) as string
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    if (!contacts || contacts.length === 0) {
      console.warn('批量保存联系人：数组为空')
      return
    }

    const t0 = performance.now()
    console.log(`⏱️ [db.saveContacts] 开始，数据量: ${contacts.length}`)
    await this.writeViaWorker('saveMany', CONTACT_STORE, contacts)
    console.log(`⏱️ [db.saveContacts] 完成，耗时: ${(performance.now() - t0).toFixed(1)}ms`)
  }

  async getContact(wxid: string): Promise<Contact | null> {
    return await this.get<Contact>(CONTACT_STORE, wxid)
  }

  /**
   * 分页获取联系人（使用 Dexie getPaginated，total 语义已修正）
   */
  async getContacts(
    offset: number = 0,
    limit: number = 100
  ): Promise<{
    contacts: Contact[]
    total: number
    hasMore: boolean
  }> {
    const result = await this.getPaginated<Contact>(CONTACT_STORE, offset, limit)
    return {
      contacts: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  }

  async getBatchContacts(wxids: string[]): Promise<Map<string, Contact>> {
    const result = new Map<string, Contact>()

    await Promise.all(
      wxids.map(async wxid => {
        const contact = await this.getContact(wxid)
        if (contact) {
          result.set(wxid, contact)
        }
      })
    )

    return result
  }

  async getAllContacts(): Promise<Contact[]> {
    const t0 = performance.now()
    console.log('⏱️ [db.getAllContacts] 开始')
    const result = await this.getAll<Contact>(CONTACT_STORE)
    console.log(
      `⏱️ [db.getAllContacts] 完成，${result.length} 条，耗时: ${(performance.now() - t0).toFixed(1)}ms`
    )
    return result
  }

  async getContactsByType(type: ContactType): Promise<Contact[]> {
    return await this.getByIndex<Contact>(CONTACT_STORE, 'type', type)
  }

  /**
   * 搜索联系人（Dexie 索引查询，替代全表扫描）
   *
   * 使用 Dexie where('nickname').startsWithIgnoreCase 等 4 个索引并行查询，
   * 合并去重后返回。空关键词返回全部。
   */
  async searchContacts(keyword: string): Promise<Contact[]> {
    if (!keyword) {
      return await this.getAllContacts()
    }

    const table = await this.getTable<Contact>(CONTACT_STORE)
    const lowerKeyword = keyword.toLowerCase()

    // 4 个字段并行索引查询
    const [byNickname, byRemark, byWxid, byAlias] = await Promise.all([
      table.where('nickname').startsWithIgnoreCase(keyword).toArray(),
      table.where('remark').startsWithIgnoreCase(keyword).toArray(),
      table.filter(c => (c.wxid || '').toLowerCase().includes(lowerKeyword)).toArray(),
      table.where('alias').startsWithIgnoreCase(keyword).toArray(),
    ])

    // 合并去重（按 wxid）
    const seen = new Set<string>()
    const results: Contact[] = []
    for (const contact of [...byNickname, ...byRemark, ...byWxid, ...byAlias]) {
      if (!seen.has(contact.wxid)) {
        seen.add(contact.wxid)
        results.push(contact)
      }
    }

    return results
  }

  async deleteContact(wxid: string): Promise<void> {
    await this.delete(CONTACT_STORE, wxid)
  }

  async clearContacts(): Promise<void> {
    await this.clear(CONTACT_STORE)
  }

  async clearAndSaveContacts(
    contacts: Contact[],
    onProgress?: (currentChunk: number, totalChunks: number) => void
  ): Promise<void> {
    if (!contacts || contacts.length === 0) {
      await this.writeViaWorker('clear', CONTACT_STORE)
      return
    }

    await this.writeViaWorker('clearAndSaveMany', CONTACT_STORE, contacts, onProgress)
  }

  async getContactCount(): Promise<number> {
    return await this.count(CONTACT_STORE)
  }

  async hasContact(wxid: string): Promise<boolean> {
    const contact = await this.getContact(wxid)
    return contact !== null
  }

  // ==================== 群聊相关方法 ====================

  async saveChatroom(chatroom: Chatroom): Promise<string> {
    return (await this.save(CHATROOM_STORE, chatroom)) as string
  }

  async saveChatrooms(chatrooms: Chatroom[]): Promise<void> {
    if (!chatrooms || chatrooms.length === 0) {
      console.warn('批量保存群聊：数组为空')
      return
    }

    const t0 = performance.now()
    console.log(`⏱️ [db.saveChatrooms] 开始，数据量: ${chatrooms.length}`)
    await this.writeViaWorker('saveMany', CHATROOM_STORE, chatrooms)
    console.log(`⏱️ [db.saveChatrooms] 完成，耗时: ${(performance.now() - t0).toFixed(1)}ms`)
  }

  async getChatroom(chatroomId: string): Promise<Chatroom | null> {
    return await this.get<Chatroom>(CHATROOM_STORE, chatroomId)
  }

  async getChatrooms(
    offset: number = 0,
    limit: number = 100
  ): Promise<{
    chatrooms: Chatroom[]
    total: number
    hasMore: boolean
  }> {
    const result = await this.getPaginated<Chatroom>(CHATROOM_STORE, offset, limit)
    return {
      chatrooms: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  }

  async getBatchChatrooms(chatroomIds: string[]): Promise<Map<string, Chatroom>> {
    const result = new Map<string, Chatroom>()

    await Promise.all(
      chatroomIds.map(async chatroomId => {
        const chatroom = await this.getChatroom(chatroomId)
        if (chatroom) {
          result.set(chatroomId, chatroom)
        }
      })
    )

    return result
  }

  async getAllChatrooms(): Promise<Chatroom[]> {
    return await this.getAll<Chatroom>(CHATROOM_STORE)
  }

  /**
   * 搜索群聊（Dexie 索引查询，替代全表扫描）
   */
  async searchChatrooms(keyword: string): Promise<Chatroom[]> {
    if (!keyword) {
      return await this.getAllChatrooms()
    }

    const table = await this.getTable<Chatroom>(CHATROOM_STORE)
    const lowerKeyword = keyword.toLowerCase()

    const [byName, byChatroomId] = await Promise.all([
      table.where('name').startsWithIgnoreCase(keyword).toArray(),
      table.filter(c => (c.chatroomId || '').toLowerCase().includes(lowerKeyword)).toArray(),
    ])

    const seen = new Set<string>()
    const results: Chatroom[] = []
    for (const chatroom of [...byName, ...byChatroomId]) {
      if (!seen.has(chatroom.chatroomId)) {
        seen.add(chatroom.chatroomId)
        results.push(chatroom)
      }
    }

    return results
  }

  async deleteChatroom(chatroomId: string): Promise<void> {
    await this.delete(CHATROOM_STORE, chatroomId)
  }

  async clearChatrooms(): Promise<void> {
    await this.clear(CHATROOM_STORE)
  }

  async getChatroomCount(): Promise<number> {
    return await this.count(CHATROOM_STORE)
  }

  async hasChatroom(chatroomId: string): Promise<boolean> {
    const chatroom = await this.getChatroom(chatroomId)
    return chatroom !== null
  }
}

export const db = new Database()
