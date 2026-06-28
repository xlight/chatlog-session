/**
 * IndexedDB 基础类
 * 提供通用的数据库操作方法
 */

export interface DBStoreConfig {
  name: string
  keyPath: string | string[]
  autoIncrement?: boolean
  indexes?: {
    name: string
    keyPath: string | string[]
    unique?: boolean
  }[]
}

export interface DBConfig {
  name: string
  version: number
  stores: DBStoreConfig[]
}

/**
 * IndexedDB 基础操作类
 */
export abstract class BaseDatabase {
  protected db: IDBDatabase | null = null
  protected initPromise: Promise<IDBDatabase> | null = null
  protected abstract config: DBConfig

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    if (this.initPromise) {
      return this.initPromise
    }

    const config = this.config

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(config.name, config.version)

      request.onerror = () => {
        console.error(`❌ IndexedDB [${config.name}] 打开失败:`, request.error)
        this.initPromise = null
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log(`✅ IndexedDB [${config.name}] 初始化成功`)
        console.log('📦 对象存储:', Array.from(this.db.objectStoreNames))
        resolve(this.db)
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        console.log(`🔄 数据库 [${config.name}] 升级 v${oldVersion} → v${config.version}`)

        // 创建对象存储
        config.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const objectStoreParams: IDBObjectStoreParameters = {
              keyPath: storeConfig.keyPath,
            }

            if (storeConfig.autoIncrement !== undefined) {
              objectStoreParams.autoIncrement = storeConfig.autoIncrement
            }

            const store = db.createObjectStore(storeConfig.name, objectStoreParams)

            // 创建索引
            if (storeConfig.indexes) {
              storeConfig.indexes.forEach(index => {
                store.createIndex(index.name, index.keyPath, {
                  unique: index.unique || false,
                })
              })
            }

            console.log(`✅ 创建对象存储: ${storeConfig.name}`)
          }
        })

        console.log('✅ 数据库升级完成')
      }

      request.onblocked = () => {
        console.warn(`⚠️ IndexedDB [${config.name}] 升级被阻止，请关闭其他标签页`)
      }
    })

    return this.initPromise
  }

  /**
   * 获取数据库实例
   */
  protected async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.init()
    }
    return this.db
  }

  /**
   * 通用保存方法（添加或更新）
   */
  protected async save<T = any>(storeName: string, data: T): Promise<number | string> {
    try {
      const db = await this.getDB()

      // 检查对象存储是否存在
      if (!db.objectStoreNames.contains(storeName)) {
        console.error('❌ 对象存储不存在:', storeName)
        throw new Error(`Object store "${storeName}" not found`)
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        const hasId = data && typeof data === 'object' && 'id' in data && data.id !== undefined
        const request = hasId ? store.put(data) : store.add(data)

        request.onsuccess = () => {
          resolve(request.result as number | string)
        }

        request.onerror = () => {
          console.error(`❌ 保存失败 [${storeName}]:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`❌ save 错误 [${storeName}]:`, error)
      throw error
    }
  }

  /**
   * 在单个事务中写入一批数据（内部辅助方法）
   * 使用 relaxed durability 跳过 fsync，适用于可重建的缓存数据
   */
  protected writeChunk<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite', { durability: 'relaxed' })
      const store = transaction.objectStore(storeName)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => {
        console.error(`❌ 批量保存失败 [${storeName}]:`, transaction.error)
        reject(transaction.error)
      }
      transaction.onabort = () => {
        console.error(`❌ 批量保存事务中止 [${storeName}]:`, transaction.error)
        reject(transaction.error || new Error('Transaction aborted'))
      }

      for (const item of items) {
        store.put(item as any)
      }
    })
  }

  /**
   * 通用批量保存方法
   *
   * 将数据分块写入（每块 chunkSize 条），避免单事务提交时刷盘数据量过大。
   */
  protected async saveMany<T>(storeName: string, items: T[], chunkSize = 2000): Promise<void> {
    if (items.length === 0) return

    const t0 = performance.now()
    const totalChunks = Math.ceil(items.length / chunkSize)
    console.log(`⏱️ [saveMany] 开始写入 ${items.length} 条到 [${storeName}]，分 ${totalChunks} 块`)

    const db = await this.getDB()

    for (let i = 0; i < totalChunks; i++) {
      const tChunk = performance.now()
      const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize)
      await this.writeChunk(db, storeName, chunk)
      console.log(
        `⏱️ [saveMany] 块 ${i + 1}/${totalChunks} 完成（${chunk.length} 条），耗时: ${(performance.now() - tChunk).toFixed(1)}ms`
      )
    }

    console.log(
      `⏱️ [saveMany] 全部完成，总耗时: ${(performance.now() - t0).toFixed(1)}ms (${items.length} 条)`
    )
  }

  /**
   * 清空对象存储并分块批量写入新数据
   *
   * 第一个事务负责 clear + 写入第一块，后续事务只写入。
   * 分块可以显著减少单次事务提交的刷盘数据量。
   */
  protected async clearAndSaveMany<T>(storeName: string, items: T[], chunkSize = 2000): Promise<void> {
    const t0 = performance.now()
    const totalChunks = Math.ceil(items.length / chunkSize)
    console.log(
      `⏱️ [clearAndSaveMany] 开始清空并写入 ${items.length} 条到 [${storeName}]，分 ${totalChunks} 块`
    )

    const db = await this.getDB()

    // 第一个事务：clear + 写入第一块
    await new Promise<void>((resolve, reject) => {
      const firstChunk = items.slice(0, chunkSize)
      const transaction = db.transaction([storeName], 'readwrite', { durability: 'relaxed' })
      const store = transaction.objectStore(storeName)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => {
        console.error(`❌ 清空并保存失败 [${storeName}]:`, transaction.error)
        reject(transaction.error)
      }
      transaction.onabort = () => {
        console.error(`❌ 清空并保存事务中止 [${storeName}]:`, transaction.error)
        reject(transaction.error || new Error('Transaction aborted'))
      }

      store.clear()
      for (const item of firstChunk) {
        store.put(item as any)
      }
    })
    console.log(
      `⏱️ [clearAndSaveMany] 块 1/${totalChunks} 完成（含 clear），耗时: ${(performance.now() - t0).toFixed(1)}ms`
    )

    // 后续事务
    for (let i = 1; i < totalChunks; i++) {
      const tChunk = performance.now()
      const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize)
      await this.writeChunk(db, storeName, chunk)
      console.log(
        `⏱️ [clearAndSaveMany] 块 ${i + 1}/${totalChunks} 完成（${chunk.length} 条），耗时: ${(performance.now() - tChunk).toFixed(1)}ms`
      )
    }

    console.log(
      `⏱️ [clearAndSaveMany] 全部完成，总耗时: ${(performance.now() - t0).toFixed(1)}ms (${items.length} 条)`
    )
  }

  /**
   * 通用获取方法（按主键）
   */
  protected async get<T>(storeName: string, key: number | string): Promise<T | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error(`❌ 获取失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用获取所有方法
   */
  protected async getAll<T>(storeName: string): Promise<T[]> {
    const t0 = performance.now()
    console.log(`⏱️ [getAll] 开始从 [${storeName}] 读取全部数据`)

    const db = await this.getDB()
    const t1 = performance.now()
    console.log(`⏱️ [getAll] getDB 耗时: ${(t1 - t0).toFixed(1)}ms`)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const t2 = performance.now()
        const count = request.result?.length || 0
        console.log(
          `⏱️ [getAll] onsuccess 回调触发，${count} 条数据，耗时: ${(t2 - t1).toFixed(1)}ms`
        )
        resolve(request.result || [])
        const t3 = performance.now()
        console.log(
          `⏱️ [getAll] resolve 后耗时: ${(t3 - t2).toFixed(1)}ms，总耗时: ${(t3 - t0).toFixed(1)}ms`
        )
      }

      request.onerror = () => {
        console.error(`❌ 获取所有失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用按索引查询方法
   */
  protected async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error(`❌ 按索引查询失败 [${storeName}.${indexName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用按索引范围查询方法
   */
  protected async getByIndexRange<T>(
    storeName: string,
    indexName: string,
    range?: IDBKeyRange,
    direction: IDBCursorDirection = 'next'
  ): Promise<T[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.openCursor(range, direction)
      const results: T[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => {
        console.error(`❌ 按索引范围查询失败 [${storeName}.${indexName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用删除方法
   */
  protected async delete(storeName: string, key: number | string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error(`❌ 删除失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用清空方法
   */
  protected async clear(storeName: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log(`🗑️ 已清空 [${storeName}]`)
        resolve()
      }

      request.onerror = () => {
        console.error(`❌ 清空失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用计数方法
   */
  protected async count(storeName: string): Promise<number> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error(`❌ 计数失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 通用游标分页方法
   */
  protected async getPaginated<T = any>(
    storeName: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<{ items: T[]; total: number; hasMore: boolean }> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const result: T[] = []
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)

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
            resolve({ items: result, total: completed, hasMore: true })
          }
        } else {
          resolve({ items: result, total: completed, hasMore: false })
        }
      }

      request.onerror = () => {
        console.error(`❌ 分页查询失败 [${storeName}]:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      console.log(`🔒 数据库 [${this.config.name}] 已关闭`)
    }
  }
}
