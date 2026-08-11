/**
 * 朋友圈状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { momentsAPI } from '@/api/moments'
import type { Moment, MomentsParams } from '@/types/social'
import { useAppStore } from './app'

export const useMomentsStore = defineStore('moments', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /** 朋友圈列表 */
  const items = ref<Moment[]>([])

  /** 总数 */
  const total = ref(0)

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<Error | null>(null)

  /** 当前查询参数 */
  const currentParams = ref<MomentsParams>({
    limit: 20,
    offset: 0,
  })

  // ==================== Getters ====================

  /** 是否有更多数据 */
  const hasMore = computed(() => items.value.length < total.value)

  // ==================== Actions ====================

  /**
   * 获取朋友圈时间线
   */
  async function fetch(params?: Partial<MomentsParams>) {
    loading.value = true
    error.value = null

    if (params) {
      currentParams.value = { ...currentParams.value, ...params }
    }

    try {
      const response = await momentsAPI.getMoments(currentParams.value)
      items.value = response.items
      total.value = response.total

      if (appStore.isDebug) {
        console.log(`📱 朋友圈: 获取 ${response.items.length}/${response.total} 条`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      if (appStore.isDebug) {
        console.log('❌ 朋友圈请求失败:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置用户名过滤
   */
  function setUsername(username?: string) {
    currentParams.value.username = username || undefined
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
    currentParams.value = { limit: 20, offset: 0 }
  }

  return {
    items, total, loading, error, currentParams,
    hasMore,
    fetch, setUsername, setPage, $reset,
  }
})
