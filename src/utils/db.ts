import type { Contact, Chatroom } from '@/types'
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
    return new Promise((resolve, reject) => {
      const worker = this.worker || this.getWorker()
      if (!worker) {
        reject(new Error('Worker 不可用'))
        return
      }

      const id = `req_${++this.requestCounter}`
      this.pendingRequests.set(id, { resolve, reject, onProgress })

      const message: WorkerRequest = { id, action, ...params }
      const itemCount = params.items?.length || 0
      const t0 = performance.now()
      worker.postMessage(message)
      const t1 = performance.now()
      if (itemCount > 0) {
        console.log(
          `⏱️ [sendToWorker] postMessage 序列化耗时: ${(t1 - t0).toFixed(1)}ms (${itemCount} 条, action=${action})`
        )
      }
    })
  }

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

  async getContacts(
    offset: number = 0,
    limit: number = 100
  ): Promise<{
    contacts: Contact[]
    total: number
    hasMore: boolean
  }> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const result: Contact[] = []
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)

      let completed = 0
      const total = offset + limit

      const request = store.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (completed >= offset && completed < total) {
            result.push(cursor.value)
          }
          completed++
          if (completed < total) {
            cursor.continue()
          } else {
            resolve({
              contacts: result,
              total: completed,
              hasMore: true,
            })
          }
        } else {
          resolve({
            contacts: result,
            total: completed,
            hasMore: false,
          })
        }
      }

      request.onerror = () => reject(request.error)
    })
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

  async getContactsByType(type: number): Promise<Contact[]> {
    return await this.getByIndex<Contact>(CONTACT_STORE, 'type', type)
  }

  async searchContacts(keyword: string): Promise<Contact[]> {
    const allContacts = await this.getAllContacts()
    const lowerKeyword = keyword.toLowerCase()

    return allContacts.filter(contact => {
      const nickname = (contact.nickname || '').toLowerCase()
      const remark = (contact.remark || '').toLowerCase()
      const wxid = (contact.wxid || '').toLowerCase()
      const alias = (contact.alias || '').toLowerCase()

      return (
        nickname.includes(lowerKeyword) ||
        remark.includes(lowerKeyword) ||
        wxid.includes(lowerKeyword) ||
        alias.includes(lowerKeyword)
      )
    })
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

    const t0 = performance.now()
    console.log(`⏱️ [db.clearAndSaveContacts] 开始，数据量: ${contacts.length}`)
    await this.writeViaWorker('clearAndSaveMany', CONTACT_STORE, contacts, onProgress)
    console.log(`⏱️ [db.clearAndSaveContacts] 完成，耗时: ${(performance.now() - t0).toFixed(1)}ms`)
  }

  async getContactCount(): Promise<number> {
    return await this.count(CONTACT_STORE)
  }

  async hasContact(wxid: string): Promise<boolean> {
    const contact = await this.getContact(wxid)
    return contact !== null
  }

  async getContactDisplayName(wxid: string): Promise<string> {
    const contact = await this.getContact(wxid)
    return contact?.remark || contact?.nickname || wxid
  }

  async getContactDisplayNames(wxids: string[]): Promise<Record<string, string>> {
    const contacts = await Promise.all(wxids.map(wxid => this.getContact(wxid)))

    const result: Record<string, string> = {}
    wxids.forEach((wxid, index) => {
      const contact = contacts[index]
      result[wxid] = contact?.remark || contact?.nickname || wxid
    })

    return result
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

    console.log(`开始批量保存 ${chatrooms.length} 个群聊...`)
    await this.writeViaWorker('saveMany', CHATROOM_STORE, chatrooms)
    console.log('✅ 批量保存群聊完成')
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
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const result: Chatroom[] = []
      const transaction = db.transaction([CHATROOM_STORE], 'readonly')
      const store = transaction.objectStore(CHATROOM_STORE)

      let completed = 0
      const total = offset + limit

      const request = store.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (completed >= offset && completed < total) {
            result.push(cursor.value)
          }
          completed++
          if (completed < total) {
            cursor.continue()
          } else {
            resolve({
              chatrooms: result,
              total: completed,
              hasMore: true,
            })
          }
        } else {
          resolve({
            chatrooms: result,
            total: completed,
            hasMore: false,
          })
        }
      }

      request.onerror = () => reject(request.error)
    })
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

  async searchChatrooms(keyword: string): Promise<Chatroom[]> {
    const allChatrooms = await this.getAllChatrooms()
    const lowerKeyword = keyword.toLowerCase()

    return allChatrooms.filter(chatroom => {
      const name = (chatroom.name || '').toLowerCase()
      const chatroomId = (chatroom.chatroomId || '').toLowerCase()

      return name.includes(lowerKeyword) || chatroomId.includes(lowerKeyword)
    })
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
