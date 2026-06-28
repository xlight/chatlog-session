/**
 * 本地存储工具
 * 提供统一的 localStorage 和 sessionStorage 操作方法
 */

/**
 * 存储类型
 */
export type StorageType = 'local' | 'session'

/**
 * 存储选项
 */
export interface StorageOptions {
  type?: StorageType
  expire?: number
}

/**
 * 存储数据结构
 */
interface StorageData<T = any> {
  value: T
  expire?: number
  timestamp: number
}

/**
 * 存储类
 */
class Storage {
  private prefix = 'chatlog_'

  /**
   * 获取存储实例
   */
  private getStorage(type: StorageType): globalThis.Storage {
    return type === 'local' ? localStorage : sessionStorage
  }

  /**
   * 获取完整的键名
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  /**
   * 设置值
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): void {
    try {
      const { type = 'local', expire } = options
      const storage = this.getStorage(type)
      const fullKey = this.getKey(key)

      const data: StorageData<T> = {
        value,
        timestamp: Date.now(),
        expire: expire ? Date.now() + expire * 1000 : undefined,
      }

      storage.setItem(fullKey, JSON.stringify(data))
    } catch (error) {
      console.error(`Failed to set storage ${key}:`, error)
    }
  }

  /**
   * 获取值
   */
  get<T>(key: string, options: StorageOptions = {}): T | null {
    try {
      const { type = 'local' } = options
      const storage = this.getStorage(type)
      const fullKey = this.getKey(key)

      const stringValue = storage.getItem(fullKey)
      if (!stringValue) return null

      const data: StorageData<T> = JSON.parse(stringValue)

      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        this.remove(key, options)
        return null
      }

      return data.value
    } catch (error) {
      console.error(`Failed to get storage ${key}:`, error)
      return null
    }
  }

  /**
   * 移除值
   */
  remove(key: string, options: StorageOptions = {}): void {
    try {
      const { type = 'local' } = options
      const storage = this.getStorage(type)
      const fullKey = this.getKey(key)
      storage.removeItem(fullKey)
    } catch (error) {
      console.error(`Failed to remove storage ${key}:`, error)
    }
  }

  /**
   * 清空存储
   */
  clear(type: StorageType = 'local'): void {
    try {
      const storage = this.getStorage(type)
      const keys = Object.keys(storage)

      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          storage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }

}

/**
 * 创建存储实例
 */
const storage = new Storage()

/**
 * 导出便捷方法
 */

/**
 * 设置 localStorage
 */
export function setLocal<T>(key: string, value: T, expire?: number): void {
  storage.set(key, value, { type: 'local', expire })
}

/**
 * 获取 localStorage
 */
export function getLocal<T>(key: string): T | null {
  return storage.get<T>(key, { type: 'local' })
}

/**
 * 移除 localStorage
 */
export function removeLocal(key: string): void {
  storage.remove(key, { type: 'local' })
}

/**
 * 清空 localStorage
 */
export function clearLocal(): void {
  storage.clear('local')
}

/**
 * 设置 sessionStorage
 */
export function setSession<T>(key: string, value: T, expire?: number): void {
  storage.set(key, value, { type: 'session', expire })
}

/**
 * 获取 sessionStorage
 */
export function getSession<T>(key: string): T | null {
  return storage.get<T>(key, { type: 'session' })
}

/**
 * 移除 sessionStorage
 */
export function removeSession(key: string): void {
  storage.remove(key, { type: 'session' })
}

/**
 * 清空 sessionStorage
 */
export function clearSession(): void {
  storage.clear('session')
}

export default storage