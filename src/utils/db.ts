/**
 * IndexedDB 工具类
 * 用于缓存联系人和群聊数据
 */

import type { Contact, Chatroom } from '@/types/contact'
import { ensureContactIndex } from './contact-grouping'

const DB_NAME = 'ChatlogSessionDB'
const DB_VERSION = 3  // 升级版本以支持群聊存储
const CONTACT_STORE = 'contacts'
const CHATROOM_STORE = 'chatrooms'

/**
 * IndexedDB 数据库类
 */
class Database {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    // 如果已经初始化，直接返回
    if (this.db) {
      return this.db
    }

    // 如果正在初始化，返回初始化 Promise
    if (this.initPromise) {
      return this.initPromise
    }

    // 开始初始化
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB 初始化成功')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        // 如果是旧版本升级，直接删除旧的对象存储重建
        if (oldVersion > 0 && oldVersion < 3) {
          console.log(`数据库升级 v${oldVersion} → v${DB_VERSION}，清空旧数据`)
          if (db.objectStoreNames.contains(CONTACT_STORE)) {
            db.deleteObjectStore(CONTACT_STORE)
          }
          if (db.objectStoreNames.contains(CHATROOM_STORE)) {
            db.deleteObjectStore(CHATROOM_STORE)
          }
        }

        // 创建联系人对象存储
        if (!db.objectStoreNames.contains(CONTACT_STORE)) {
          const contactStore = db.createObjectStore(CONTACT_STORE, { keyPath: 'wxid' })
          
          // 创建索引
          contactStore.createIndex('nickname', 'nickname', { unique: false })
          contactStore.createIndex('remark', 'remark', { unique: false })
          contactStore.createIndex('type', 'type', { unique: false })
          contactStore.createIndex('alias', 'alias', { unique: false })
          contactStore.createIndex('pinyinInitial', 'pinyinInitial', { unique: false })
          contactStore.createIndex('isStarred', 'isStarred', { unique: false })
        }

        // 创建群聊对象存储
        if (!db.objectStoreNames.contains(CHATROOM_STORE)) {
          const chatroomStore = db.createObjectStore(CHATROOM_STORE, { keyPath: 'chatroomId' })
          
          // 创建索引
          chatroomStore.createIndex('name', 'name', { unique: false })
          chatroomStore.createIndex('owner', 'owner', { unique: false })
          chatroomStore.createIndex('memberCount', 'memberCount', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 获取数据库实例
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  /**
   * 保存单个联系人
   */
  async saveContact(contact: Contact): Promise<void> {
    const db = await this.getDB()
    
    // 确保联系人有索引信息
    ensureContactIndex(contact)
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readwrite')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.put(contact)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 批量保存联系人
   */
  async saveContacts(contacts: Contact[]): Promise<void> {
    const db = await this.getDB()
    
    // 批量计算索引信息
    contacts.forEach(contact => {
      ensureContactIndex(contact)
    })
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readwrite')
      const store = transaction.objectStore(CONTACT_STORE)

      let completed = 0
      const total = contacts.length

      if (total === 0) {
        resolve()
        return
      }

      contacts.forEach(contact => {
        const request = store.put(contact)
        
        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }
        
        request.onerror = () => {
          console.error('保存联系人失败:', contact.wxid, request.error)
          completed++
          if (completed === total) {
            resolve() // 即使有错误也继续
          }
        }
      })

      transaction.oncomplete = () => {
        // 批量保存完成
      }

      transaction.onerror = () => {
        console.error('批量保存事务失败:', transaction.error)
        reject(transaction.error)
      }
    })
  }

  /**
   * 根据 wxid 获取联系人
   */
  async getContact(wxid: string): Promise<Contact | null> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.get(wxid)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('获取联系人失败:', wxid, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 批量获取联系人
   */
  async getContacts(wxids: string[]): Promise<Map<string, Contact>> {
    const db = await this.getDB()
    const result = new Map<string, Contact>()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)

      let completed = 0
      const total = wxids.length

      if (total === 0) {
        resolve(result)
        return
      }

      wxids.forEach(wxid => {
        const request = store.get(wxid)
        
        request.onsuccess = () => {
          if (request.result) {
            result.set(wxid, request.result)
          }
          completed++
          if (completed === total) {
            resolve(result)
          }
        }
        
        request.onerror = () => {
          completed++
          if (completed === total) {
            resolve(result)
          }
        }
      })

      transaction.onerror = () => {
        reject(transaction.error)
      }
    })
  }

  /**
   * 获取所有联系人
   */
  async getAllContacts(): Promise<Contact[]> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('获取所有联系人失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 根据类型获取联系人
   */
  async getContactsByType(type: string): Promise<Contact[]> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)
      const index = store.index('type')
      const request = index.getAll(type)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('根据类型获取联系人失败:', type, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 搜索联系人
   */
  async searchContacts(keyword: string): Promise<Contact[]> {
    const allContacts = await this.getAllContacts()
    const lowerKeyword = keyword.toLowerCase()
    
    return allContacts.filter(contact => {
      const nickname = (contact.nickname || '').toLowerCase()
      const remark = (contact.remark || '').toLowerCase()
      const wxid = (contact.wxid || '').toLowerCase()
      const alias = (contact.alias || '').toLowerCase()
      
      return nickname.includes(lowerKeyword) ||
             remark.includes(lowerKeyword) ||
             wxid.includes(lowerKeyword) ||
             alias.includes(lowerKeyword)
    })
  }

  /**
   * 删除联系人
   */
  async deleteContact(wxid: string): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readwrite')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.delete(wxid)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清空联系人数据
   */
  async clearContacts(): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readwrite')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ 已清空联系人缓存')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取联系人数量
   */
  async getContactCount(): Promise<number> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTACT_STORE], 'readonly')
      const store = transaction.objectStore(CONTACT_STORE)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 检查联系人是否存在
   */
  async hasContact(wxid: string): Promise<boolean> {
    const contact = await this.getContact(wxid)
    return contact !== null
  }

  /**
   * 获取联系人显示名称（带缓存）
   */
  async getContactDisplayName(wxid: string): Promise<string> {
    const contact = await this.getContact(wxid)
    if (!contact) return wxid
    return contact.remark || contact.nickname || contact.alias || wxid
  }

  /**
   * 批量获取联系人显示名称
   */
  async getContactDisplayNames(wxids: string[]): Promise<Map<string, string>> {
    const contacts = await this.getContacts(wxids)
    const result = new Map<string, string>()
    
    wxids.forEach(wxid => {
      const contact = contacts.get(wxid)
      if (contact) {
        result.set(wxid, contact.remark || contact.nickname || contact.alias || wxid)
      } else {
        result.set(wxid, wxid)
      }
    })
    
    return result
  }

  /**
   * 保存单个群聊
   */
  async saveChatroom(chatroom: Chatroom): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readwrite')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.put(chatroom)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 批量保存群聊
   */
  async saveChatrooms(chatrooms: Chatroom[]): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readwrite')
      const store = transaction.objectStore(CHATROOM_STORE)

      let completed = 0
      const total = chatrooms.length

      if (total === 0) {
        resolve()
        return
      }

      chatrooms.forEach(chatroom => {
        const request = store.put(chatroom)
        
        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }
        
        request.onerror = () => {
          console.error('保存群聊失败:', chatroom.chatroomId, request.error)
          completed++
          if (completed === total) {
            resolve()
          }
        }
      })

      transaction.onerror = () => {
        console.error('批量保存群聊事务失败:', transaction.error)
        reject(transaction.error)
      }
    })
  }

  /**
   * 根据 chatroomId 获取群聊
   */
  async getChatroom(chatroomId: string): Promise<Chatroom | null> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readonly')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.get(chatroomId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('获取群聊失败:', chatroomId, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 批量获取群聊
   */
  async getChatrooms(chatroomIds: string[]): Promise<Map<string, Chatroom>> {
    const db = await this.getDB()
    const result = new Map<string, Chatroom>()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readonly')
      const store = transaction.objectStore(CHATROOM_STORE)

      let completed = 0
      const total = chatroomIds.length

      if (total === 0) {
        resolve(result)
        return
      }

      chatroomIds.forEach(chatroomId => {
        const request = store.get(chatroomId)
        
        request.onsuccess = () => {
          if (request.result) {
            result.set(chatroomId, request.result)
          }
          completed++
          if (completed === total) {
            resolve(result)
          }
        }
        
        request.onerror = () => {
          completed++
          if (completed === total) {
            resolve(result)
          }
        }
      })

      transaction.onerror = () => {
        reject(transaction.error)
      }
    })
  }

  /**
   * 获取所有群聊
   */
  async getAllChatrooms(): Promise<Chatroom[]> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readonly')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('获取所有群聊失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 搜索群聊
   */
  async searchChatrooms(keyword: string): Promise<Chatroom[]> {
    const allChatrooms = await this.getAllChatrooms()
    const lowerKeyword = keyword.toLowerCase()
    
    return allChatrooms.filter(chatroom => {
      const name = (chatroom.name || '').toLowerCase()
      const chatroomId = (chatroom.chatroomId || '').toLowerCase()
      
      return name.includes(lowerKeyword) || chatroomId.includes(lowerKeyword)
    })
  }

  /**
   * 删除群聊
   */
  async deleteChatroom(chatroomId: string): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readwrite')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.delete(chatroomId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清空群聊数据
   */
  async clearChatrooms(): Promise<void> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readwrite')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ 已清空群聊缓存')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取群聊数量
   */
  async getChatroomCount(): Promise<number> {
    const db = await this.getDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CHATROOM_STORE], 'readonly')
      const store = transaction.objectStore(CHATROOM_STORE)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 检查群聊是否存在
   */
  async hasChatroom(chatroomId: string): Promise<boolean> {
    const chatroom = await this.getChatroom(chatroomId)
    return chatroom !== null
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      console.log('🔒 IndexedDB 已关闭')
    }
  }
}

/**
 * 导出单例
 */
export const db = new Database()

/**
 * 默认导出
 */
export default db