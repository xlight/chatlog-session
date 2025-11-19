/**
 * 后台任务加载器
 * 用于分批逐步加载大量数据，避免阻塞主线程
 */

export interface BackgroundLoaderOptions<T> {
  /**
   * 批次大小（每次加载的数量）
   */
  batchSize?: number

  /**
   * 批次间延迟（毫秒）
   */
  batchDelay?: number

  /**
   * 是否使用 requestIdleCallback（优先使用空闲时间）
   */
  useIdleCallback?: boolean

  /**
   * 最大并发批次数
   */
  maxConcurrent?: number

  /**
   * 加载函数
   */
  loadFn: (offset: number, limit: number) => Promise<T[]>

  /**
   * 每批次加载完成回调
   */
  onBatchLoaded?: (batch: T[], progress: LoadProgress) => void

  /**
   * 全部加载完成回调
   */
  onCompleted?: (items: T[]) => void

  /**
   * 错误回调
   */
  onError?: (error: Error) => void

  /**
   * 进度更新回调
   */
  onProgress?: (progress: LoadProgress) => void
}

export interface LoadProgress {
  /**
   * 已加载数量
   */
  loaded: number

  /**
   * 总数量（如果已知）
   */
  total?: number

  /**
   * 进度百分比（0-100）
   */
  percentage: number

  /**
   * 当前批次
   */
  currentBatch: number

  /**
   * 总批次数（如果已知）
   */
  totalBatches?: number

  /**
   * 是否完成
   */
  completed: boolean

  /**
   * 加载速度（项/秒）
   */
  itemsPerSecond: number

  /**
   * 已用时间（毫秒）
   */
  elapsedTime: number

  /**
   * 预计剩余时间（毫秒）
   */
  estimatedTimeRemaining?: number
}

export interface BackgroundLoaderState {
  /**
   * 是否正在运行
   */
  running: boolean

  /**
   * 是否已暂停
   */
  paused: boolean

  /**
   * 是否已取消
   */
  cancelled: boolean

  /**
   * 是否已完成
   */
  completed: boolean

  /**
   * 错误信息
   */
  error: Error | null
}

/**
 * 后台任务加载器类
 */
export class BackgroundLoader<T = any> {
  private options: Required<BackgroundLoaderOptions<T>>
  private state: BackgroundLoaderState
  private items: T[] = []
  private offset = 0
  private startTime = 0
  private pauseResolve: (() => void) | null = null
  private abortController: AbortController | null = null

  constructor(options: BackgroundLoaderOptions<T>) {
    this.options = {
      batchSize: options.batchSize || 50,
      batchDelay: options.batchDelay || 100,
      useIdleCallback: options.useIdleCallback ?? true,
      maxConcurrent: options.maxConcurrent || 1,
      loadFn: options.loadFn,
      onBatchLoaded: options.onBatchLoaded || (() => {}),
      onCompleted: options.onCompleted || (() => {}),
      onError: options.onError || (() => {}),
      onProgress: options.onProgress || (() => {}),
    }

    this.state = {
      running: false,
      paused: false,
      cancelled: false,
      completed: false,
      error: null,
    }
  }

  /**
   * 开始加载
   */
  async start(total?: number): Promise<T[]> {
    if (this.state.running) {
      console.warn('BackgroundLoader 已经在运行')
      return this.items
    }

    this.reset()
    this.state.running = true
    this.startTime = Date.now()
    this.abortController = new AbortController()

    try {
      await this.loadBatches(total)
      this.state.completed = true
      this.options.onCompleted(this.items)
      return this.items
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        this.state.error = error
        this.options.onError(error)
      }
      throw error
    } finally {
      this.state.running = false
    }
  }

  /**
   * 暂停加载
   */
  pause(): void {
    if (!this.state.running || this.state.paused) {
      return
    }
    this.state.paused = true
    console.log('⏸️ 后台加载已暂停')
  }

  /**
   * 恢复加载
   */
  resume(): void {
    if (!this.state.paused) {
      return
    }
    this.state.paused = false
    if (this.pauseResolve) {
      this.pauseResolve()
      this.pauseResolve = null
    }
    console.log('▶️ 后台加载已恢复')
  }

  /**
   * 取消加载
   */
  cancel(): void {
    if (!this.state.running) {
      return
    }
    this.state.cancelled = true
    if (this.abortController) {
      this.abortController.abort()
    }
    console.log('⏹️ 后台加载已取消')
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.items = []
    this.offset = 0
    this.state = {
      running: false,
      paused: false,
      cancelled: false,
      completed: false,
      error: null,
    }
  }

  /**
   * 批量加载
   */
  private async loadBatches(total?: number): Promise<void> {
    let currentBatch = 0
    let totalBatches = total ? Math.ceil(total / this.options.batchSize) : undefined

    while (!this.state.cancelled) {
      // 检查暂停状态
      if (this.state.paused) {
        await new Promise<void>((resolve) => {
          this.pauseResolve = resolve
        })
      }

      // 加载一批数据
      const batch = await this.loadBatch()

      if (batch.length === 0) {
        // 没有更多数据，结束加载
        break
      }

      // 添加到结果集
      this.items.push(...batch)
      currentBatch++

      // 计算进度
      const progress = this.calculateProgress(currentBatch, totalBatches, total)

      // 触发回调
      this.options.onBatchLoaded(batch, progress)
      this.options.onProgress(progress)

      // 如果返回的数据少于批次大小，说明已经加载完成
      if (batch.length < this.options.batchSize) {
        break
      }

      // 延迟下一批
      await this.delay(this.options.batchDelay)
    }

    if (this.state.cancelled) {
      throw new Error('加载已取消')
    }
  }

  /**
   * 加载一批数据
   */
  private async loadBatch(): Promise<T[]> {
    try {
      const batch = await this.options.loadFn(this.offset, this.options.batchSize)
      this.offset += this.options.batchSize
      return batch
    } catch (error) {
      console.error('加载批次失败:', error)
      throw error
    }
  }

  /**
   * 延迟执行
   */
  private delay(ms: number): Promise<void> {
    if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
      return new Promise((resolve) => {
        requestIdleCallback(() => {
          setTimeout(resolve, ms)
        })
      })
    } else {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  }

  /**
   * 计算加载进度
   */
  private calculateProgress(
    currentBatch: number,
    totalBatches?: number,
    total?: number
  ): LoadProgress {
    const loaded = this.items.length
    const elapsedTime = Date.now() - this.startTime
    const itemsPerSecond = loaded / (elapsedTime / 1000)

    let percentage = 0
    let estimatedTimeRemaining: number | undefined

    if (total) {
      percentage = Math.min((loaded / total) * 100, 100)
      const remaining = total - loaded
      estimatedTimeRemaining = (remaining / itemsPerSecond) * 1000
    } else if (totalBatches) {
      percentage = Math.min((currentBatch / totalBatches) * 100, 100)
    }

    return {
      loaded,
      total,
      percentage,
      currentBatch,
      totalBatches,
      completed: false,
      itemsPerSecond,
      elapsedTime,
      estimatedTimeRemaining,
    }
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<BackgroundLoaderState> {
    return { ...this.state }
  }

  /**
   * 获取已加载的数据
   */
  getItems(): Readonly<T[]> {
    return [...this.items]
  }

  /**
   * 获取已加载的数量
   */
  getLoadedCount(): number {
    return this.items.length
  }
}

/**
 * 创建后台加载器
 */
export function createBackgroundLoader<T>(
  options: BackgroundLoaderOptions<T>
): BackgroundLoader<T> {
  return new BackgroundLoader(options)
}

/**
 * 默认导出
 */
export default BackgroundLoader