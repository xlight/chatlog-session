/**
 * 收藏内容状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { favoriteAPI } from '@/api/favorite'
import type { Favorite, FavoriteTag, FavoriteParams } from '@/types/social'
import { useAppStore } from './app'

export const useFavoriteStore = defineStore('favorite', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /** 收藏列表 */
  const items = ref<Favorite[]>([])

  /** 总数 */
  const total = ref(0)

  /** 标签列表 */
  const tags = ref<FavoriteTag[]>([])

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<Error | null>(null)

  /** 当前查询参数 */
  const currentParams = ref<FavoriteParams>({
    limit: 20,
    offset: 0,
  })

  // ==================== Getters ====================

  /** 是否有更多数据 */
  const hasMore = computed(() => items.value.length < total.value)

  // ==================== Actions ====================

  /**
   * 获取收藏列表
   */
  async function fetch(params?: Partial<FavoriteParams>) {
    loading.value = true
    error.value = null

    if (params) {
      currentParams.value = { ...currentParams.value, ...params }
    }

    try {
      const response = await favoriteAPI.getFavorites(currentParams.value)
      items.value = response.items
      total.value = response.total
      tags.value = response.tags

      if (appStore.isDebug) {
        console.log(`⭐ 收藏: 获取 ${response.items.length}/${response.total} 条, ${response.tags.length} 个标签`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      if (appStore.isDebug) {
        console.log('❌ 收藏请求失败:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置标签过滤
   */
  function setTag(tag?: string) {
    currentParams.value.tag = tag || undefined
  }

  /**
   * 设置类型过滤
   */
  function setType(type?: number) {
    currentParams.value.type = type || undefined
  }

  /**
   * 设置关键词搜索
   */
  function setKeyword(keyword?: string) {
    currentParams.value.keyword = keyword || undefined
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
    tags.value = []
    loading.value = false
    error.value = null
    currentParams.value = { limit: 20, offset: 0 }
  }

  return {
    items, total, tags, loading, error, currentParams,
    hasMore,
    fetch, setTag, setType, setKeyword, setPage, $reset,
  }
})
