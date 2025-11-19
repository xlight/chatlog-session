/**
 * 聊天消息状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatlogAPI, mediaAPI } from '@/api'
import type { Message } from '@/types/message'
import type { SearchParams } from '@/types/api'
import { useAppStore } from './app'

export const useChatStore = defineStore('chat', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /**
   * 消息列表
   */
  const messages = ref<Message[]>([])

  /**
   * 当前会话 ID
   */
  const currentTalker = ref<string>('')

  /**
   * 消息总数
   */
  const totalMessages = ref(0)

  /**
   * 当前页码
   */
  const currentPage = ref(1)

  /**
   * 每页大小
   */
  const pageSize = ref(appStore.config.pageSize)

  /**
   * 是否还有更多消息
   */
  const hasMore = ref(true)

  /**
   * 搜索关键词
   */
  const searchKeyword = ref('')

  /**
   * 搜索结果
   */
  const searchResults = ref<Message[]>([])

  /**
   * 选中的消息 ID 列表
   */
  const selectedMessageIds = ref<Set<number>>(new Set())

  /**
   * 正在播放的语音消息 ID
   */
  const playingVoiceId = ref<number | null>(null)

  /**
   * 消息加载状态
   */
  const loading = ref(false)

  /**
   * 搜索加载状态
   */
  const searchLoading = ref(false)

  /**
   * 错误信息
   */
  const error = ref<Error | null>(null)

  // ==================== Getters ====================

  /**
   * 当前会话的消息列表
   */
  const currentMessages = computed(() => {
    if (!currentTalker.value) return []
    return messages.value.filter(msg => msg.talker === currentTalker.value)
  })

  /**
   * 按日期分组的消息
   */
  const messagesByDate = computed(() => {
    const grouped: Record<string, Message[]> = {}
    
    currentMessages.value.forEach(message => {
      // 优先使用 time（ISO 字符串），回退到 createTime（Unix 秒）
      const timestamp = message.time || message.createTime
      
      // 调试日志
      if (appStore.isDebug && (!message.time && !message.createTime)) {
        console.warn('⚠️ Message missing time fields:', {
          id: message.id,
          seq: message.seq,
          time: message.time,
          createTime: message.createTime,
        })
      }
      
      const date = formatMessageDate(timestamp)
      
      if (appStore.isDebug && date === '未知日期') {
        console.warn('⚠️ Invalid date format:', {
          timestamp,
          message,
        })
      }
      
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(message)
    })
    
    return grouped
  })

  /**
   * 是否有选中的消息
   */
  const hasSelectedMessages = computed(() => selectedMessageIds.value.size > 0)

  /**
   * 选中的消息数量
   */
  const selectedCount = computed(() => selectedMessageIds.value.size)

  /**
   * 是否有搜索结果
   */
  const hasSearchResults = computed(() => searchResults.value.length > 0)

  /**
   * 媒体消息列表
   */
  const mediaMessages = computed(() => {
    return currentMessages.value.filter(msg => mediaAPI.isMediaMessage(msg.type))
  })

  /**
   * 图片消息列表
   */
  const imageMessages = computed(() => {
    return currentMessages.value.filter(msg => msg.type === 3)
  })

  /**
   * 视频消息列表
   */
  const videoMessages = computed(() => {
    return currentMessages.value.filter(msg => msg.type === 43)
  })

  /**
   * 文件消息列表
   */
  const fileMessages = computed(() => {
    return currentMessages.value.filter(msg => msg.type === 49)
  })

  // ==================== Actions ====================

  /**
   * 加载消息列表
   */
  async function loadMessages(talker: string, page = 1, append = false) {
    try {
      loading.value = true
      error.value = null
      appStore.setLoading('messages', true)

      const offset = (page - 1) * pageSize.value
      const limit = pageSize.value

      const result = await chatlogAPI.getSessionMessages(talker, undefined, limit, offset)

      if (append) {
        messages.value = [...messages.value, ...result]
      } else {
        messages.value = result
        currentTalker.value = talker
      }

      currentPage.value = page
      hasMore.value = result.length >= limit

      if (appStore.isDebug) {
        console.log('💬 Messages loaded', {
          talker,
          page,
          count: result.length,
          hasMore: hasMore.value,
        })
        
        // 调试：输出第一条消息的时间信息
        if (result.length > 0) {
          const firstMsg = result[0]
          console.log('📝 First message debug:', {
            id: firstMsg.id,
            seq: firstMsg.seq,
            time: firstMsg.time,
            createTime: firstMsg.createTime,
            timeType: typeof firstMsg.time,
            createTimeType: typeof firstMsg.createTime,
            timeValid: firstMsg.time ? !isNaN(new Date(firstMsg.time).getTime()) : false,
            createTimeValid: firstMsg.createTime ? !isNaN(new Date(firstMsg.createTime * 1000).getTime()) : false,
          })
        }
      }

      return result
    } catch (err) {
      error.value = err as Error
      appStore.setError(err as Error)
      throw err
    } finally {
      loading.value = false
      appStore.setLoading('messages', false)
    }
  }

  /**
   * 加载更多消息
   */
  async function loadMoreMessages() {
    if (!hasMore.value || loading.value || !currentTalker.value) {
      return
    }

    const nextPage = currentPage.value + 1
    await loadMessages(currentTalker.value, nextPage, true)
  }

  /**
   * 刷新消息列表
   */
  async function refreshMessages() {
    if (!currentTalker.value) return
    await loadMessages(currentTalker.value, 1, false)
  }

  /**
   * 切换会话
   */
  async function switchSession(talker: string) {
    if (talker === currentTalker.value) return

    // 清空当前消息
    messages.value = []
    currentPage.value = 1
    hasMore.value = true
    clearSelection()

    // 加载新会话的消息
    await loadMessages(talker)
  }

  /**
   * 搜索消息
   */
  async function searchMessages(keyword: string, params?: Partial<SearchParams>) {
    try {
      searchLoading.value = true
      searchKeyword.value = keyword
      appStore.setLoading('search', true)

      const searchParams: SearchParams = {
        keyword,
        talker: currentTalker.value || undefined,
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        ...params,
      }

      const result = await chatlogAPI.searchMessages(searchParams)
      searchResults.value = result.items || []

      if (appStore.isDebug) {
        console.log('🔍 Search completed', {
          keyword,
          count: searchResults.value.length,
        })
      }

      return searchResults.value
    } catch (err) {
      error.value = err as Error
      appStore.setError(err as Error)
      throw err
    } finally {
      searchLoading.value = false
      appStore.setLoading('search', false)
    }
  }

  /**
   * 清除搜索
   */
  function clearSearch() {
    searchKeyword.value = ''
    searchResults.value = []
  }

  /**
   * 获取指定 ID 的消息
   */
  function getMessageById(id: number): Message | undefined {
    return messages.value.find(msg => msg.id === id)
  }

  /**
   * 获取消息索引
   */
  function getMessageIndex(id: number): number {
    return currentMessages.value.findIndex(msg => msg.id === id)
  }

  /**
   * 跳转到指定消息
   */
  async function jumpToMessage(messageId: number) {
    const message = getMessageById(messageId)
    if (!message) {
      // 如果消息不在当前列表中，需要加载包含该消息的页面
      // TODO: 实现按消息 ID 定位并加载
      console.warn('Message not found in current list:', messageId)
      return
    }

    // 滚动到消息位置
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 高亮显示
      element.classList.add('highlight')
      setTimeout(() => {
        element.classList.remove('highlight')
      }, 2000)
    }
  }

  /**
   * 选择消息
   */
  function selectMessage(id: number) {
    selectedMessageIds.value.add(id)
  }

  /**
   * 取消选择消息
   */
  function deselectMessage(id: number) {
    selectedMessageIds.value.delete(id)
  }

  /**
   * 切换消息选择状态
   */
  function toggleMessageSelection(id: number) {
    if (selectedMessageIds.value.has(id)) {
      deselectMessage(id)
    } else {
      selectMessage(id)
    }
  }

  /**
   * 全选消息
   */
  function selectAllMessages() {
    currentMessages.value.forEach(msg => {
      selectedMessageIds.value.add(msg.id)
    })
  }

  /**
   * 清除选择
   */
  function clearSelection() {
    selectedMessageIds.value.clear()
  }

  /**
   * 获取选中的消息
   */
  function getSelectedMessages(): Message[] {
    return currentMessages.value.filter(msg => selectedMessageIds.value.has(msg.id))
  }

  /**
   * 删除选中的消息（本地）
   */
  function deleteSelectedMessages() {
    const selectedIds = Array.from(selectedMessageIds.value)
    messages.value = messages.value.filter(msg => !selectedIds.includes(msg.id))
    clearSelection()
  }

  /**
   * 导出选中的消息
   */
  async function exportSelectedMessages(format: 'json' | 'csv' | 'text' = 'json') {
    const selected = getSelectedMessages()
    if (selected.length === 0) return

    const ids = selected.map(msg => msg.id).join(',')
    
    // TODO: 根据格式导出消息
    console.log('Exporting messages:', format, ids)
  }

  /**
   * 设置正在播放的语音
   */
  function setPlayingVoice(id: number | null) {
    playingVoiceId.value = id
  }

  /**
   * 获取消息统计
   */
  function getMessageStats() {
    const stats = {
      total: currentMessages.value.length,
      text: 0,
      image: 0,
      voice: 0,
      video: 0,
      file: 0,
      other: 0,
    }

    currentMessages.value.forEach(msg => {
      switch (msg.type) {
        case 1:
          stats.text++
          break
        case 3:
          stats.image++
          break
        case 34:
          stats.voice++
          break
        case 43:
          stats.video++
          break
        case 49:
          stats.file++
          break
        default:
          stats.other++
      }
    })

    return stats
  }

  /**
   * 格式化消息日期
   * @param timestamp Unix 时间戳（秒）或 ISO 8601 字符串
   */
  function formatMessageDate(timestamp: number | string): string {
    // 处理无效值
    if (!timestamp) {
      return '未知日期'
    }

    // 如果是字符串，解析为 Date；如果是数字，假设是秒级时间戳
    const date = typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : new Date(timestamp * 1000)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '未知日期'
    }
    
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (isSameDay(date, today)) {
      return '今天'
    } else if (isSameDay(date, yesterday)) {
      return '昨天'
    } else if (date.getFullYear() === today.getFullYear()) {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
  }

  /**
   * 判断是否为同一天
   */
  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  /**
   * 重置状态
   */
  function $reset() {
    messages.value = []
    currentTalker.value = ''
    totalMessages.value = 0
    currentPage.value = 1
    hasMore.value = true
    searchKeyword.value = ''
    searchResults.value = []
    selectedMessageIds.value.clear()
    playingVoiceId.value = null
    loading.value = false
    searchLoading.value = false
    error.value = null
  }

  // ==================== Return ====================

  return {
    // State
    messages,
    currentTalker,
    totalMessages,
    currentPage,
    pageSize,
    hasMore,
    searchKeyword,
    searchResults,
    selectedMessageIds,
    playingVoiceId,
    loading,
    searchLoading,
    error,

    // Getters
    currentMessages,
    messagesByDate,
    hasSelectedMessages,
    selectedCount,
    hasSearchResults,
    mediaMessages,
    imageMessages,
    videoMessages,
    fileMessages,

    // Actions
    loadMessages,
    loadMoreMessages,
    refreshMessages,
    switchSession,
    searchMessages,
    clearSearch,
    getMessageById,
    getMessageIndex,
    jumpToMessage,
    selectMessage,
    deselectMessage,
    toggleMessageSelection,
    selectAllMessages,
    clearSelection,
    getSelectedMessages,
    deleteSelectedMessages,
    exportSelectedMessages,
    setPlayingVoice,
    getMessageStats,
    formatMessageDate,
    clearError,
    $reset,
  }
})