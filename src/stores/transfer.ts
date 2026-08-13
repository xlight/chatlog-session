/**
 * 转账记录状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transferAPI } from '@/api/transfer'
import type { Transfer, TransferParams } from '@/types/social'
import { useAppStore } from './app'

export const useTransferStore = defineStore('transfer', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /** 转账记录列表 */
  const items = ref<Transfer[]>([])

  /** 总数 */
  const total = ref(0)

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<Error | null>(null)

  /** 当前查询参数 */
  const currentParams = ref<TransferParams>({
    direction: 'all',
    limit: 20,
    offset: 0,
  })

  // ==================== Getters ====================

  /** 是否有更多数据 */
  const hasMore = computed(() => items.value.length < total.value)

  // ==================== Actions ====================

  /**
   * 获取转账记录
   */
  async function fetch(params?: Partial<TransferParams>) {
    loading.value = true
    error.value = null

    if (params) {
      currentParams.value = { ...currentParams.value, ...params }
    }

    try {
      const response = await transferAPI.getTransfers(currentParams.value)
      items.value = response.items
      total.value = response.total

      if (appStore.isDebug) {
        console.log(`📦 转账: 获取 ${response.items.length}/${response.total} 条`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      if (appStore.isDebug) {
        console.log('❌ 转账请求失败:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置方向过滤
   */
  function setDirection(direction: 'all' | 'sent' | 'received') {
    currentParams.value.direction = direction
  }

  /**
   * 设置年份过滤
   */
  function setYear(year?: number) {
    currentParams.value.year = year
  }

  /**
   * 设置分页
   */
  function setPage(limit: number, offset: number) {
    currentParams.value.limit = limit
    currentParams.value.offset = offset
  }

  /** 重置状态 */
  function $reset() {
    items.value = []
    total.value = 0
    loading.value = false
    error.value = null
    currentParams.value = { direction: 'all', limit: 20, offset: 0 }
  }

  return {
    items, total, loading, error, currentParams,
    hasMore,
    fetch, setDirection, setYear, setPage, $reset,
  }
})
