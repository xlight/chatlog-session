/**
 * 红包记录状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { redPacketAPI } from '@/api/redpacket'
import type { RedPacket, RedPacketStats, RedPacketParams } from '@/types/social'
import { useAppStore } from './app'

export const useRedPacketStore = defineStore('redpacket', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /** 红包记录列表 */
  const items = ref<RedPacket[]>([])

  /** 总数 */
  const total = ref(0)

  /** 统计 */
  const stats = ref<RedPacketStats>({ sentCount: 0, receivedCount: 0 })

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<Error | null>(null)

  /** 当前查询参数 */
  const currentParams = ref<RedPacketParams>({
    direction: 'all',
    limit: 20,
    offset: 0,
  })

  // ==================== Getters ====================

  /** 是否有更多数据 */
  const hasMore = computed(() => items.value.length < total.value)

  /** 发出总金额（元） */
  const sentAmountTotal = computed(() => {
    return items.value
      .filter(r => r.isSender)
      .reduce((sum, r) => sum + r.amount, 0) / 100
  })

  /** 收到总金额（元） */
  const receivedAmountTotal = computed(() => {
    return items.value
      .filter(r => !r.isSender)
      .reduce((sum, r) => sum + r.amount, 0) / 100
  })

  // ==================== Actions ====================

  /**
   * 获取红包记录
   */
  async function fetch(params?: Partial<RedPacketParams>) {
    loading.value = true
    error.value = null

    if (params) {
      currentParams.value = { ...currentParams.value, ...params }
    }

    try {
      const response = await redPacketAPI.getRedPackets(currentParams.value)
      items.value = response.items
      total.value = response.total
      stats.value = response.stats

      if (appStore.isDebug) {
        console.log(`🧧 红包: 获取 ${response.items.length}/${response.total} 条`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      if (appStore.isDebug) {
        console.log('❌ 红包请求失败:', err)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置方向过滤
   */
  function setDirection(direction: 'all' | 'out' | 'in') {
    currentParams.value.direction = direction
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
    stats.value = { sentCount: 0, receivedCount: 0 }
    loading.value = false
    error.value = null
    currentParams.value = { direction: 'all', limit: 20, offset: 0 }
  }

  return {
    items, total, stats, loading, error, currentParams,
    hasMore, sentAmountTotal, receivedAmountTotal,
    fetch, setDirection, setPage, $reset,
  }
})
