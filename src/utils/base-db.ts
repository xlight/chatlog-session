/**
 * IndexedDB 基础类（Dexie 实现）
 *
 * 用 Dexie 声明式 schema 替代手写 Promise 包装。
 * 保留 DBConfig/DBStoreConfig 类型以兼容 db.ts 现有配置。
 */
import Dexie, { type Dexie as DexieInstance, type Table } from 'dexie'

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
 * IndexedDB 基础操作类（Dexie 实现）
 *
 * 子类声明 config，BaseDatabase 负责创建 Dexie 实例并提供通用 CRUD 方法。
 */
export abstract class BaseDatabase {
  protected dexie: DexieInstance | null = null
  protected initPromise: Promise<DexieInstance> | null = null
  protected abstract config: DBConfig

  /**
   * 初始化数据库（创建 Dexie 实例 + 声明式 schema）
   */
  async init(): Promise<DexieInstance> {
    if (this.dexie) {
      return this.dexie
    }

    if (this.initPromise) {
      return this.initPromise
    }

    const config = this.config

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const dexie = new Dexie(config.name)

        // 声明式 schema：每个 store 对应一个 Dexie table
        const schema: Record<string, string> = {}
        for (const store of config.stores) {
          const keyPath = Array.isArray(store.keyPath) ? store.keyPath.join(',') : store.keyPath
          const indexParts: string[] = []
          if (store.autoIncrement) {
            indexParts.push('++')
          }
          indexParts.push(keyPath)
          if (store.indexes) {
            for (const idx of store.indexes) {
              const idxKeyPath = Array.isArray(idx.keyPath) ? idx.keyPath.join(',') : idx.keyPath
              const prefix = idx.unique ? '&' : ''
              indexParts.push(`${prefix}${idx.name}`)
              // Dexie 索引名与 keyPath 不同时用 idxName->keyPath 语法
              if (idx.name !== idxKeyPath) {
                indexParts[indexParts.length - 1] = `${prefix}${idx.name}->${idxKeyPath}`
              }
            }
          }
          schema[store.name] = indexParts.join(',')
        }

        dexie.version(config.version).stores(schema)

        this.dexie = dexie
        console.log(`✅ IndexedDB [${config.name}] 初始化成功（Dexie）`)
        console.log('📦 对象存储:', Object.keys(schema))
        resolve(dexie)
      } catch (err) {
        console.error(`❌ IndexedDB [${config.name}] 打开失败:`, err)
        this.initPromise = null
        reject(err)
      }
    })

    return this.initPromise
  }

  /**
   * 获取已初始化的 Dexie 实例
   */
  protected async getDB(): Promise<DexieInstance> {
    if (this.dexie) {
      return this.dexie
    }
    return await this.init()
  }

  /**
   * 获取指定 store 的 Table
   */
  protected async getTable<T = any>(storeName: string): Promise<Table<T, any>> {
    const dexie = await this.getDB()
    return dexie.table(storeName)
  }

  // ==================== 通用 CRUD 方法 ====================

  /**
   * 保存单条记录（put 语义：存在则更新）
   */
  protected async save<T>(storeName: string, item: T): Promise<any> {
    const table = await this.getTable<T>(storeName)
    return await table.put(item)
  }

  /**
   * 批量保存
   */
  protected async saveMany<T>(storeName: string, items: T[]): Promise<void> {
    const table = await this.getTable<T>(storeName)
    await table.bulkPut(items)
  }

  /**
   * 清空 + 批量保存（单事务）
   */
  protected async clearAndSaveMany<T>(storeName: string, items: T[]): Promise<void> {
    const table = await this.getTable<T>(storeName)
    await table.clear()
    await table.bulkPut(items)
  }

  /**
   * 获取单条记录
   */
  protected async get<T>(storeName: string, key: any): Promise<T | null> {
    const table = await this.getTable<T>(storeName)
    const result = await table.get(key)
    return result ?? null
  }

  /**
   * 获取全部记录
   */
  protected async getAll<T>(storeName: string): Promise<T[]> {
    const table = await this.getTable<T>(storeName)
    return await table.toArray()
  }

  /**
   * 按索引获取记录
   */
  protected async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const table = await this.getTable<T>(storeName)
    return await table.where(indexName).equals(value).toArray()
  }

  /**
   * 删除单条记录
   */
  protected async delete(storeName: string, key: any): Promise<void> {
    const table = await this.getTable(storeName)
    await table.delete(key)
  }

  /**
   * 清空 store
   */
  protected async clear(storeName: string): Promise<void> {
    const table = await this.getTable(storeName)
    await table.clear()
  }

  /**
   * 计数
   */
  protected async count(storeName: string): Promise<number> {
    const table = await this.getTable(storeName)
    return await table.count()
  }

  /**
   * 通用分页方法（Dexie 实现，修正 total 语义）
   *
   * 修正：total 返回真实记录总数（table.count()），而非已遍历数。
   * hasMore 基于 offset + limit < total 判断。
   */
  protected async getPaginated<T = any>(
    storeName: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<{ items: T[]; total: number; hasMore: boolean }> {
    const table = await this.getTable<T>(storeName)
    const total = await table.count()
    const items = await table.offset(offset).limit(limit).toArray()
    const hasMore = offset + limit < total
    return { items, total, hasMore }
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.dexie) {
      this.dexie.close()
      this.dexie = null
      this.initPromise = null
      console.log(`🔒 数据库 [${this.config.name}] 已关闭`)
    }
  }
}
