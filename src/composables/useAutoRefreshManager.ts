import { ref, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAutoRefreshStore } from '@/stores/autoRefresh'

/**
 * 自动刷新管理器 composable
 * 负责自动刷新的定时器管理、设置加载/保存、事件监听
 */
export function useAutoRefreshManager(
  sessionListRef?: { value?: { autoRefresh?: () => Promise<void> } },
  options?: { onTick?: () => void },
) {
  const autoRefreshStore = useAutoRefreshStore()

  // 自动刷新状态
  const autoRefreshTimer = ref<number | null>(null)
  const autoRefreshEnabled = ref(false)
  const autoRefreshInterval = ref(30)
  const isAutoRefreshing = ref(false)

  /**
   * 启动自动刷新定时器
   */
  const startAutoRefresh = () => {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
    }

    if (autoRefreshEnabled.value && autoRefreshInterval.value > 0) {
      console.log(`🔄 启动自动刷新，间隔: ${autoRefreshInterval.value}秒`)
      autoRefreshTimer.value = window.setInterval(async () => {
        if (!isAutoRefreshing.value) {
          isAutoRefreshing.value = true
          try {
            await sessionListRef?.value?.autoRefresh?.()
          } catch (error) {
            console.error('自动刷新失败:', error)
          } finally {
            options?.onTick?.()
            setTimeout(() => {
              isAutoRefreshing.value = false
            }, 1000)
          }
        }
      }, autoRefreshInterval.value * 1000)
    }
  }

  /**
   * 停止自动刷新定时器
   */
  const stopAutoRefresh = () => {
    if (autoRefreshTimer.value) {
      console.log('⏸️ 停止自动刷新')
      clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
    }
  }

  /**
   * 切换自动刷新状态
   */
  const toggleAutoRefresh = () => {
    autoRefreshEnabled.value = !autoRefreshEnabled.value
    saveAutoRefreshSettings()

    if (autoRefreshEnabled.value) {
      ElMessage.success(`已启用自动刷新（${autoRefreshInterval.value}秒）`)
      startAutoRefresh()
    } else {
      ElMessage.info('已停止自动刷新')
      stopAutoRefresh()
    }
  }

  /**
   * 保存自动刷新设置到 localStorage
   */
  const saveAutoRefreshSettings = () => {
    const settings = localStorage.getItem('chatlog-settings')
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        parsed.autoRefresh = autoRefreshEnabled.value
        parsed.autoRefreshInterval = autoRefreshInterval.value
        localStorage.setItem('chatlog-settings', JSON.stringify(parsed))
      } catch (err) {
        console.error('保存自动刷新设置失败:', err)
      }
    }
  }

  /**
   * 从 localStorage 加载自动刷新设置
   */
  const loadAutoRefreshSettings = () => {
    const settings = localStorage.getItem('chatlog-settings')
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        if (parsed.autoRefresh !== undefined) {
          autoRefreshEnabled.value = parsed.autoRefresh
        }
        if (parsed.autoRefreshInterval !== undefined) {
          autoRefreshInterval.value = parsed.autoRefreshInterval
        }
      } catch (err) {
        console.error('加载自动刷新设置失败:', err)
      }
    }
  }

  /**
   * 处理设置更新事件
   */
  const handleSettingsUpdate = (e: Event) => {
    const customEvent = e as CustomEvent
    const newSettings = customEvent.detail

    if (newSettings) {
      const oldEnabled = autoRefreshEnabled.value
      const oldInterval = autoRefreshInterval.value

      if (newSettings.autoRefresh !== undefined) {
        autoRefreshEnabled.value = newSettings.autoRefresh
      }
      if (newSettings.autoRefreshInterval !== undefined) {
        autoRefreshInterval.value = newSettings.autoRefreshInterval
      }

      // 如果设置发生变化，显示提示
      if (oldEnabled !== autoRefreshEnabled.value || oldInterval !== autoRefreshInterval.value) {
        console.log('🔄 自动刷新设置已更新:', {
          enabled: autoRefreshEnabled.value,
          interval: autoRefreshInterval.value
        })
      }
    }
  }

  /**
   * 处理 localStorage 变化（跨标签页同步）
   */
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'chatlog-settings' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        handleSettingsUpdate(new CustomEvent('chatlog-settings-updated', { detail: parsed }))
      } catch (err) {
        console.error('处理 storage 变化失败:', err)
      }
    }
  }

  /**
   * 初始化自动刷新管理器
   */
  const init = () => {
    // 初始化 AutoRefresh Store
    if (!autoRefreshStore.timer) {
      autoRefreshStore.init()
    }

    // 加载自动刷新设置
    loadAutoRefreshSettings()

    // 如果启用了自动刷新，启动定时器
    if (autoRefreshEnabled.value) {
      startAutoRefresh()
    }

    // 监听设置更新事件（同一页面内同步）
    window.addEventListener('chatlog-settings-updated', handleSettingsUpdate)

    // 监听 localStorage 变化（跨标签页同步）
    window.addEventListener('storage', handleStorageChange)
  }

  /**
   * 清理自动刷新管理器
   */
  const cleanup = () => {
    // 组件卸载时停止自动刷新
    stopAutoRefresh()

    // 移除事件监听
    window.removeEventListener('chatlog-settings-updated', handleSettingsUpdate)
    window.removeEventListener('storage', handleStorageChange)
  }

  // 监听设置变化，自动重启定时器
  watch([autoRefreshEnabled, autoRefreshInterval], () => {
    if (autoRefreshEnabled.value) {
      stopAutoRefresh()
      startAutoRefresh()
    }
  })

  // 组件卸载时自动清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 状态
    autoRefreshEnabled,
    autoRefreshInterval,
    isAutoRefreshing,
    
    // 方法
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    saveAutoRefreshSettings,
    loadAutoRefreshSettings,
    handleSettingsUpdate,
    handleStorageChange,
    init,
    cleanup,
  }
}