/**
 * IndexedDB Web Worker（Dexie 实现）
 *
 * 在后台线程中执行 IndexedDB 写入操作，避免阻塞主线程导致 UI 卡顿。
 * Worker 内直接 new Dexie(name) 使用 Worker 全局 indexedDB（与原 indexedDB.open 模式一致）。
 *
 * 支持的操作：
 * - clearAndSaveMany: 在单事务中清空 + 批量写入
 * - saveMany: 批量写入
 * - clear: 清空对象存储
 */
import Dexie, { type Dexie as DexieInstance } from 'dexie'

// ==================== 类型定义 ====================

interface DBStoreConfig {
  name: string
  keyPath: string | string[]
  autoIncrement?: boolean
  indexes?: {
    name: string
    keyPath: string | string[]
    unique?: boolean
  }[]
}

interface DBConfig {
  name: string
  version: number
  stores: DBStoreConfig[]
}

/** 主线程 → Worker 的消息 */
interface WorkerRequest {
  id: string
  action: 'init' | 'clearAndSaveMany' | 'saveMany' | 'clear'
  dbConfig?: DBConfig
  storeName?: string
  items?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Worker → 主线程的消息 */
interface WorkerResponse {
  id: string
  success: boolean
  error?: string
  /** 消息类型：progress 表示中间进度报告，complete/undefined 表示最终结果 */
  type?: 'progress' | 'complete'
  /** 当前已完成的块序号（从 1 开始） */
  currentChunk?: number
  /** 总块数 */
  totalChunks?: number
}

// ==================== 常量 ====================

/** 每个事务的最大写入条数，避免单事务刷盘数据量过大导致提交极慢 */
const CHUNK_SIZE = 2000

// ==================== Worker 实现 ====================

let dexie: DexieInstance | null = null

/**
 * 构建 Dexie schema 字符串
 */
function buildSchema(config: DBConfig): Record<string, string> {
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
        if (idx.name === idxKeyPath) {
          indexParts.push(`${prefix}${idx.name}`)
        } else {
          indexParts.push(`${prefix}${idx.name}->${idxKeyPath}`)
        }
      }
    }
    schema[store.name] = indexParts.join(',')
  }
  return schema
}

/**
 * 打开/初始化数据库（Dexie）
 */
function openDB(config: DBConfig): Promise<DexieInstance> {
  if (dexie) {
    return Promise.resolve(dexie)
  }

  const instance = new Dexie(config.name)
  instance.version(config.version).stores(buildSchema(config))
  dexie = instance
  console.log(`✅ Worker DB [${config.name}] 初始化成功（Dexie）`)
  return Promise.resolve(dexie)
}

/**
 * 确保数据库已初始化
 */
async function ensureDB(dbConfig?: DBConfig): Promise<DexieInstance> {
  if (dexie) {
    return dexie
  }
  if (!dbConfig) {
    throw new Error('数据库未初始化，需要 dbConfig')
  }
  return await openDB(dbConfig)
}

/**
 * 清空 + 批量写入（分块）
 */
async function clearAndSaveMany(
  database: DexieInstance,
  storeName: string,
  items: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  requestId: string
): Promise<void> {
  const table = database.table(storeName)

  // 先清空
  await table.clear()

  // 分块写入
  const totalChunks = Math.ceil(items.length / CHUNK_SIZE)
  for (let i = 0; i < totalChunks; i++) {
    const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await table.bulkPut(chunk)

    // 报告进度
    const progress: WorkerResponse = {
      id: requestId,
      success: true,
      type: 'progress',
      currentChunk: i + 1,
      totalChunks,
    }
    self.postMessage(progress)
  }
}

/**
 * 批量写入（分块）
 */
async function saveMany(
  database: DexieInstance,
  storeName: string,
  items: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  requestId: string
): Promise<void> {
  const table = database.table(storeName)
  const totalChunks = Math.ceil(items.length / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await table.bulkPut(chunk)

    const progress: WorkerResponse = {
      id: requestId,
      success: true,
      type: 'progress',
      currentChunk: i + 1,
      totalChunks,
    }
    self.postMessage(progress)
  }
}

/**
 * 清空 store
 */
async function clear(database: DexieInstance, storeName: string): Promise<void> {
  const table = database.table(storeName)
  await table.clear()
}

// ==================== 消息处理 ====================

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, action, dbConfig, storeName, items } = event.data

  const respond = (success: boolean, error?: string) => {
    const response: WorkerResponse = { id, success, error }
    self.postMessage(response)
  }

  try {
    switch (action) {
      case 'init': {
        if (!dbConfig) throw new Error('init 需要 dbConfig')
        await openDB(dbConfig)
        respond(true)
        break
      }

      case 'clearAndSaveMany': {
        if (!storeName) throw new Error('clearAndSaveMany 需要 storeName')
        const database = await ensureDB(dbConfig)
        await clearAndSaveMany(database, storeName, items || [], id)
        respond(true)
        break
      }

      case 'saveMany': {
        if (!storeName) throw new Error('saveMany 需要 storeName')
        const database = await ensureDB(dbConfig)
        await saveMany(database, storeName, items || [], id)
        respond(true)
        break
      }

      case 'clear': {
        if (!storeName) throw new Error('clear 需要 storeName')
        const database = await ensureDB(dbConfig)
        await clear(database, storeName)
        respond(true)
        break
      }

      default:
        respond(false, `未知操作: ${action}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    respond(false, message)
  }
}
