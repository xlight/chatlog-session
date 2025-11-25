/**
 * 聊天消息状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatlogAPI, mediaAPI } from '@/api'
import type { Message } from '@/types/message'
import { createEmptyRangeMessage, parseTimeRangeStart } from '@/types/message'
import type { SearchParams } from '@/types/api'
import { useAppStore } from './app'
import { useMessageCacheStore } from './messageCache'
import { useAutoRefreshStore } from './autoRefresh'
import { toCST, formatCSTRange, subtractDays, formatCSTDate } from '@/utils/timezone'

/**
 * 获取消息列表中最新消息的东八区时间
 */
function getLatestMessageTime(messages: Message[]): string | undefined {
  if (!messages || messages.length === 0) return undefined

  const latest = messages[messages.length - 1]

  return latest.time
}

/**
 * 获取消息列表中最老消息的东八区时间
 */
function getFirstMessageTime(messages: Message[]): string | undefined {
  if (!messages || messages.length === 0) return undefined

  const newest = messages[0]

  return newest.time
}

export const useChatStore = defineStore('chat', () => {
  const appStore = useAppStore()
  const cacheStore = useMessageCacheStore()
  const refreshStore = useAutoRefreshStore()

  // 初始化缓存和自动刷新
  if (!cacheStore.metadata.length) {
    cacheStore.init()
  }
  if (refreshStore.config.enabled && !refreshStore.timer) {
    refreshStore.init()
  }

  // 监听缓存更新事件
  const handleCacheUpdate = (event: CustomEvent) => {
    const { talker, messages: newMessages } = event.detail

    // 如果是当前打开的会话，更新消息列表
    if (talker === currentTalker.value) {
      const oldCount = messages.value.length
      const newCount = newMessages.length

      if (newCount > oldCount) {
        // 找出新增的消息（基于 id 和 seq）
        const existingIds = new Set(messages.value.map(m => `${m.id}_${m.seq}`))
        const actualNewMessages = newMessages.filter((m: Message) => !existingIds.has(`${m.id}_${m.seq}`))

        if (actualNewMessages.length > 0) {
          // 只添加新消息到末尾
          messages.value = [...messages.value, ...actualNewMessages]

          if (appStore.isDebug) {
            console.log(`🔄 Auto-updated messages for current session: ${talker}`, {
              oldCount,
              newCount,
              newMessagesCount: actualNewMessages.length
            })
          }
        } else if (newCount !== oldCount) {
          // 如果数量不同但没有新消息，说明可能有消息被删除或修改，全量更新
          messages.value = newMessages

          if (appStore.isDebug) {
            console.log(`🔄 Full refresh messages for current session: ${talker}`, {
              oldCount,
              newCount
            })
          }
        }
      }
    }
  }

  // 添加事件监听器
  if (typeof window !== 'undefined') {
    window.addEventListener('chatlog-cache-updated', handleCacheUpdate as EventListener)
  }

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

  /**
   * 历史消息加载状态
   */
  const loadingHistory = ref(false)

  /**
   * 历史消息加载提示信息
   */
  const historyLoadMessage = ref('')

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
   * 优先从缓存加载，如果没有缓存则从 API 加载并缓存
   */
  async function loadMessages(talker: string, page = 1, append = false, beforeTime?: string) {
    //如果 beforeTime 不包含 ~ , 则说明不是时间范围， 则需要补充成一个时间范围
    if (beforeTime && !beforeTime.includes('~')) {
      // 获取beforeTime 当天的 0 点
      const beforeDate = typeof beforeTime === 'string'
        ? new Date(beforeTime)
        : new Date(beforeTime * 1000)
      const startOfDay = (new Date(beforeDate.getFullYear(), beforeDate.getMonth(), beforeDate.getDate()))
      // 获取beforeTime 当天的 23:59:59
      const endOfDay = beforeTime

      beforeTime = formatCSTRange(startOfDay, new Date(endOfDay))
    }
    try {
      loading.value = true
      error.value = null
      appStore.setLoading('messages', true)

      let result: Message[] = []
      const limit = pageSize.value

      // 第一页且没有时间过滤时，尝试从缓存加载
      if (page === 1 && !append) {
        const cached = cacheStore.get(talker)
        if (cached) {
          result = cached
          if (appStore.isDebug) {
            console.log('📦 Loaded from cache', { talker, count: result.length })
          }

          // 后台触发刷新（如果启用）
          if (refreshStore.config.enabled) {
            // 获取缓存中最新消息的时间（东八区 ISO 格式）
            const startFromTime = getLatestMessageTime(cached)
            if(!beforeTime || !startFromTime || beforeTime > startFromTime){

              if (appStore.isDebug) {
                console.log('⏳ Triggering background refresh for talker:', talker)
                console.log('📅 Start from time:', startFromTime)
              }

              refreshStore.refreshOne(talker, 1, startFromTime).catch(err => {
                console.error('Background refresh failed:', err)
              })
            }
          }
        }
      }

      // 如果没有缓存，从 API 加载
      if (result.length === 0) {
        const offset = (page - 1) * limit

        // 直接使用传入的时间字符串参数
        result = await chatlogAPI.getSessionMessages(talker, beforeTime, limit, offset)

        // 第一页时保存到缓存
        if (page === 1 && !append) {
          cacheStore.set(talker, result)
        }
      }

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

      // 插入 EmptyRange 消息
      if ( beforeTime && page === 1 && !append) {
        const suggestedBeforeTime = parseTimeRangeStart(beforeTime)
        const newestMsgTime = getFirstMessageTime(result)

        const emptyRangeMessage = createEmptyRangeMessage(
          talker,
          beforeTime,
          newestMsgTime,
          0, // triedTimes
          suggestedBeforeTime
        )

        if (appStore.isDebug) {
          console.log('📝 EmptyRange message created for empty load:', {
            talker,
            timeRange: beforeTime,
            suggestedBeforeTime: new Date(suggestedBeforeTime).toISOString()
          })
        }

        result = [emptyRangeMessage, ...result ]
      }

      if (append) {
        messages.value = [...messages.value, ...result]
      } else {
        messages.value = result
        currentTalker.value = talker
      }

      currentPage.value = page
      hasMore.value = result.length >= limit && result.every(m => !m.isEmptyRange)

      if (appStore.isDebug) {
        console.log('💬 Messages loaded', {
          talker,
          page,
          count: result.length,
          hasMore: hasMore.value,
        })

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
   * 加载历史消息（下拉加载）
   * @param talker 会话 ID
   * @param beforeTime 最早消息的时间（ISO 8601 字符串或 Unix 秒时间戳）
   * @param offset 偏移量，用于同一时间范围内的分页
   * @returns 加载的历史消息列表和元数据
   */
  async function loadHistoryMessages(
    talker: string,
    beforeTime: string | number,
    offset: number = 0,
    existingTimeRange?: string
  ): Promise<{ messages: Message[], hasMore: boolean, timeRange: string, offset: number }> {
    if (loadingHistory.value) {
      console.warn('History loading already in progress')
      return { messages: [], hasMore: false, timeRange: '', offset: 0 }
    }

    try {
      loadingHistory.value = true
      historyLoadMessage.value = ''
      appStore.setLoading('history', true)

      const limit = pageSize.value  // 使用配置的 pageSize

      let result: Message[] = []
      let finalTimeRange = ''

      // 如果传入了 existingTimeRange（分页加载），直接使用该时间范围
      if (existingTimeRange && offset > 0) {
        finalTimeRange = existingTimeRange

        if (appStore.isDebug) {
          console.log('📄 Continue loading in existing time range:', {
            timeRange: existingTimeRange,
            offset,
            limit
          })
        }

        // 直接调用 API
        result = await chatlogAPI.getSessionMessages(talker, existingTimeRange, limit, offset)
      } else {
        // 首次加载：需要计算时间范围
        // 将 beforeTime 转换为 Date 对象
        const beforeDate = typeof beforeTime === 'string'
          ? new Date(beforeTime)
          : new Date(beforeTime * 1000)

        // 计算消息密度
        /**
         * 计算消息密度（条/天）
         * 基于已加载的消息分析时间分布
         */
        const calculateMessageDensity = (): number => {
          const msgs = messages.value.filter(m => m.talker === talker)
          if (msgs.length < 2) return 0 // 无法计算密度

          const oldest = msgs[0]
          const newest = msgs[msgs.length - 1]
          const oldestTime = oldest.time ? new Date(oldest.time).getTime() : oldest.createTime * 1000
          const newestTime = newest.time ? new Date(newest.time).getTime() : newest.createTime * 1000

          const timeSpanDays = (newestTime - oldestTime) / (1000 * 60 * 60 * 24)
          if (timeSpanDays < 0.01) return msgs.length * 100 // 消息集中在很短时间内，认为超高密度

          const density = msgs.length / timeSpanDays
          return density
        }

        /**
         * 根据消息密度和 pageSize 确定初始时间范围（天数）
         * 目标：时间范围内的消息数接近 pageSize，但不超过太多
         *
         * 计算公式：daysRange = pageSize / density
         * 例如：pageSize=50, density=10条/天 → daysRange=5天
         */
        const getInitialDaysRange = (): number => {
          const density = calculateMessageDensity()

          if (density <= 0) {
            // 无法计算密度，使用默认值
            // 默认假设中等密度（5条/天），返回 pageSize/5 天
            return Math.max(Math.ceil(limit / 5), 7) // 至少 7 天
          }

          // 基于密度和 pageSize 计算理想的天数
          // 目标：daysRange * density ≈ pageSize
          let daysRange = Math.ceil(limit / density)

          // 设置合理的边界
          const minDays = 0.5   // 最少半天
          const maxDays = 90  // 最多 90 天

          // 确保在合理范围内
          daysRange = Math.max(minDays, Math.min(maxDays, daysRange))

          if (appStore.isDebug) {
            console.log('📐 Calculate days range:', {
              density: density.toFixed(2),
              pageSize: limit,
              calculatedDays: Math.ceil(limit / density),
              finalDays: daysRange,
              estimatedMessages: Math.round(daysRange * density)
            })
          }

          return daysRange
        }

        const density = calculateMessageDensity()
        let daysRange = getInitialDaysRange()
        let retryCount = 0
        const maxRetries = 3

        if (appStore.isDebug) {
          console.log('🔍 Load new time range:', {
            density: density.toFixed(2),
            initialDaysRange: daysRange,
            beforeTime,
            beforeDate: toCST(beforeDate),
            offset
          })
        }

        // 智能加倍策略：最多重试 3 次
        while (result.length === 0 && retryCount < maxRetries) {
          const startDate = subtractDays(beforeDate, daysRange)

          // 使用东八区（UTC+8）格式
          const timeRange = formatCSTRange(startDate, beforeDate)
          finalTimeRange = timeRange

          if (appStore.isDebug) {
            console.log(`🔄 Loading history attempt ${retryCount + 1}/${maxRetries}:`, {
              timeRange,
              daysRange,
              density: density.toFixed(2),
              offset,
              limit
            })
          }

          // 调用 API
          result = await chatlogAPI.getSessionMessages(talker, timeRange, limit, offset)

          if (result.length === 0) {
            daysRange *= 2  // 加倍：0.5→1→2→4, 7→14→28
            retryCount++
          }
        }
      }

      // 如果返回空结果
      if (result.length === 0) {
        if (offset === 0) {
          // 首次加载（offset=0）且重试后仍然没有消息，显示提示
          const beforeDate = typeof beforeTime === 'string'
            ? new Date(beforeTime)
            : new Date(beforeTime * 1000)
          const message = `${formatDateYMD(beforeDate)} 附近没有消息，再次下拉尝试加载更早信息`
          historyLoadMessage.value = message

          if (appStore.isDebug) {
            console.log('ℹ️ No messages found after retries:', message)
          }

          return { messages: [], hasMore: true, timeRange: finalTimeRange, offset: 0 }
        } else {
          // 分页加载（offset>0）返回空结果，说明当前时间范围已加载完
          if (appStore.isDebug) {
            console.log('✅ Current time range completed, no more messages at offset:', offset)
          }
          return { messages: [], hasMore: false, timeRange: finalTimeRange, offset }
        }
      }

      // 成功加载到消息
      if (appStore.isDebug) {
        console.log('✅ History messages loaded:', {
          count: result.length,
          timeRange: finalTimeRange,
          offset,
          nextOffset: offset + result.length
        })
      }

      // 使用 Map 索引已有消息，提升去重性能从 O(n*m) 到 O(n)
      const existingMessagesMap = new Map<string, Message>()
      messages.value.forEach(msg => {
        // 使用复合键：seq + time + talker，确保唯一性
        const key = `${msg.seq}_${msg.time}_${msg.talker}`
        existingMessagesMap.set(key, msg)
      })

      // O(n) 复杂度去重
      const uniqueNewMessages = result.filter(newMsg => {
        const key = `${newMsg.seq}_${newMsg.time}_${newMsg.talker}`
        if (existingMessagesMap.has(key)) {
          // 如果键存在，进一步比较内容确保完全一致
          const existingMsg = existingMessagesMap.get(key)!
          return !(
            existingMsg.sender === newMsg.sender &&
            existingMsg.type === newMsg.type &&
            existingMsg.content === newMsg.content &&
            JSON.stringify(existingMsg.contents) === JSON.stringify(newMsg.contents)
          )
        }
        return true
      })

      if (appStore.isDebug && uniqueNewMessages.length < result.length) {
        console.log('🔍 Duplicate messages removed:', {
          total: result.length,
          unique: uniqueNewMessages.length,
          duplicates: result.length - uniqueNewMessages.length
        })
      }

      // 追加到消息列表头部（历史消息在前）
      messages.value = [...uniqueNewMessages, ...messages.value]

      // 清除提示信息
      historyLoadMessage.value = ''

      // 判断是否还有更多历史消息
      // 如果返回的消息数等于 limit，说明可能还有更多（在同一时间范围内）
      const hasMoreHistory = result.length >= limit

      if (appStore.isDebug) {
        console.log('📊 History loading result:', {
          loaded: result.length,
          limit: limit,
          hasMore: hasMoreHistory,
          currentOffset: offset,
          nextOffset: offset + result.length
        })
      }

      // 注意：不修改 hasMore 状态，因为它是用于分页加载的
      // 历史消息加载的状态由组件层的 hasMoreHistory 管理

      return {
        messages: result,
        hasMore: hasMoreHistory,
        timeRange: finalTimeRange,
        offset: offset + result.length  // 返回下一页的 offset
      }
    } catch (err) {
      error.value = err as Error
      appStore.setError(err as Error)
      historyLoadMessage.value = '加载历史消息失败，请重试'
      return { messages: [], hasMore: false, timeRange: '', offset: 0 }
    } finally {
      loadingHistory.value = false
      appStore.setLoading('history', false)
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD（东八区）
   */
  function formatDateYMD(date: Date): string {
    return formatCSTDate(date)
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
      searchResults.value = result || []

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
    loadingHistory.value = false
    historyLoadMessage.value = ''
  }

  // 清理函数：移除事件监听器
  function cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('chatlog-cache-updated', handleCacheUpdate as EventListener)
    }
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
    loadingHistory,
    historyLoadMessage,

    // Cache & Refresh stores
    cacheStore,
    refreshStore,

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
    loadHistoryMessages,
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
    cleanup,
  }
})
