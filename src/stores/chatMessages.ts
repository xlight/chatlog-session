/**
 * Chat Messages 子 Store
 *
 * 从 chat.ts 积出的消息加载/分页/Gap/EmptyRange/currentTalker 逻辑
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatlogAPI } from '@/api'
import type { Message } from '@/types/message'
import {
  createEmptyRangeMessage,
  createGapMessage,
  parseTimeRangeStart,
  parseTimeRangeEnd,
} from '@/utils/message-factory'
import { useAppStore } from './app'
import { useMessageCacheStore } from './messageCache'
import { useAutoRefreshStore } from './autoRefresh'
import { formatCSTRange } from '@/utils/timezone'
import { formatDateGroup, formatDate } from '@/utils/date'
import {
  assertChronologicalOrder,
  getMessageTimestamp,
  getFirstMessageTime,
  fetchSmartHistoryMessages,
  deduplicateMessages,
  detectTimeGap,
  normalizeBatchToChronological,
  mergeChronologicalMessages,
  getHistoryAnchorBeforeTime,
  isRealMessage,
  loadMessagesInTimeRange,
  handleEmptyResult,
  checkDataConnection,
  estimateMessageCount,
  getGapEstimateConfidence,
  mergeAdjacentGapMessages,
  mergeTopAdjacentEmptyRanges,
} from './chat/utils'

export const useChatMessagesStore = defineStore('chatMessages', () => {
  const appStore = useAppStore()
  const cacheStore = useMessageCacheStore()
  const refreshStore = useAutoRefreshStore()

  // ==================== State ====================

  const messages = ref<Message[]>([])
  const currentTalker = ref<string>('')
  const totalMessages = ref(0)
  const currentPage = ref(1)
  const pageSize = computed(() => appStore.config.pageSize)
  const hasMore = ref(true)
  const playingVoiceId = ref<number | null>(null)
  const loading = ref(false)
  const loadingTalker = ref<string | null>(null)  // 并发保护：当前哪个 talker 正在加载
  const error = ref<Error | null>(null)
  const loadingHistory = ref(false)
  const historyLoadMessage = ref('')
  const scrollTargetId = ref<number | null>(null)
  const isBatchRendering = ref(false)  // 分批渲染状态
  const batchRenderAbort = ref<AbortController | null>(null)  // 分批渲染中止控制器

  // ==================== Getters ====================

  const currentMessages = computed(() => {
    if (!currentTalker.value) return []
    return messages.value.filter(msg => msg.talker === currentTalker.value)
  })

  const messagesByDate = computed(() => {
    if (appStore.isDebug) console.time(`[Perf] messagesByDate (${currentMessages.value.length} msgs)`)
    const grouped: Record<string, { formattedDate: string; messages: Message[] }> = {}

    currentMessages.value.forEach(message => {
      const timestamp = message.time || message.createTime

      if (appStore.isDebug && !timestamp) {
        console.warn('⚠️ Message missing time fields:', {
          id: message.id,
          seq: message.seq,
          time: message.time,
          createTime: message.createTime,
        })
        return
      }

      const dateObj =
        typeof timestamp === 'string'
          ? new Date(timestamp)
          : new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp)

      if (isNaN(dateObj.getTime())) {
        if (appStore.isDebug) {
          console.warn('⚠️ Invalid date format:', { timestamp, message })
        }
        return
      }

      const canonicalDate = formatDate(dateObj)
      const formattedDate = formatDateGroup(timestamp)

      if (!grouped[canonicalDate]) {
        grouped[canonicalDate] = {
          formattedDate,
          messages: [],
        }
      }
      grouped[canonicalDate].messages.push(message)
    })

    const result = Object.entries(grouped).map(([date, data]) => ({
      date,
      formattedDate: data.formattedDate,
      messages: data.messages,
    }))
    if (appStore.isDebug) console.timeEnd(`[Perf] messagesByDate (${currentMessages.value.length} msgs)`)
    return result
  })

  /**
   * 消息分类（单遍计算，避免四个 filter computed 独立全量遍历）
   */
  const classifiedMessages = computed(() => {
    const msgs = currentMessages.value
    const media: Message[] = []
    const image: Message[] = []
    const video: Message[] = []
    const file: Message[] = []
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i]
      const t = msg.type
      if (t === 3) {
        image.push(msg)
        media.push(msg)
      } else if (t === 43) {
        video.push(msg)
        media.push(msg)
      } else if (t === 49) {
        file.push(msg)
        media.push(msg)
      } else if (t === 34 || t === 47) {
        media.push(msg)
      }
    }
    return { media, image, video, file }
  })

  const mediaMessages = computed(() => classifiedMessages.value.media)

  const imageMessages = computed(() => classifiedMessages.value.image)

  const videoMessages = computed(() => classifiedMessages.value.video)

  const fileMessages = computed(() => classifiedMessages.value.file)

  // ==================== 消息顺序辅助 ====================

  const normalizeAndAssertBatch = (batch: Message[], label: string) => {
    const normalized = normalizeBatchToChronological(batch, appStore.isDebug)
    assertChronologicalOrder(normalized, appStore.isDebug, `${label}:normalized`)
    return normalized
  }

  const mergeWithCurrentMessages = (incomingBatch: Message[], label: string) => {
    const mergeLabel = `[Perf] mergeWithCurrentMessages(${label}, incoming=${incomingBatch.length})`
    if (appStore.isDebug) console.time(mergeLabel)
    const current = normalizeBatchToChronological(messages.value, appStore.isDebug)
    const incoming = normalizeBatchToChronological(incomingBatch, appStore.isDebug)

    const currentFirst = getFirstRealMessage(current)
    const currentLast = getLastRealMessage(current)
    const incomingFirst = getFirstRealMessage(incoming)
    const incomingLast = getLastRealMessage(incoming)

    if (!currentFirst || !currentLast || !incomingFirst || !incomingLast) {
      messages.value = mergeChronologicalMessages(current, incoming)
      assertChronologicalOrder(messages.value, appStore.isDebug, `${label}:merged`)
      if (appStore.isDebug) console.timeEnd(mergeLabel)
      return
    }

    const currentFirstTs = getMessageTimestamp(currentFirst)
    const currentLastTs = getMessageTimestamp(currentLast)
    const incomingFirstTs = getMessageTimestamp(incomingFirst)
    const incomingLastTs = getMessageTimestamp(incomingLast)

    if (incomingLastTs <= currentFirstTs) {
      messages.value = [...incoming, ...current]
      assertChronologicalOrder(messages.value, appStore.isDebug, `${label}:prepend`)
      if (appStore.isDebug) console.timeEnd(mergeLabel)
      return
    }

    if (incomingFirstTs >= currentLastTs) {
      messages.value = [...current, ...incoming]
      assertChronologicalOrder(messages.value, appStore.isDebug, `${label}:append`)
      if (appStore.isDebug) console.timeEnd(mergeLabel)
      return
    }

    messages.value = mergeChronologicalMessages(current, incoming)
    assertChronologicalOrder(messages.value, appStore.isDebug, `${label}:merged`)
    if (appStore.isDebug) console.timeEnd(mergeLabel)
  }

  const getFirstRealMessage = (list: Message[]) => list.find(isRealMessage)

  const getLastRealMessage = (list: Message[]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (isRealMessage(list[i])) return list[i]
    }
    return undefined
  }

  const assertHistoryAnchorProgress = (
    previousBeforeTime: string | number,
    nextBeforeTime: string | number | undefined,
    label: string
  ) => {
    if (!appStore.isDebug || !nextBeforeTime) return

    const prevTs =
      typeof previousBeforeTime === 'string'
        ? new Date(previousBeforeTime).getTime()
        : previousBeforeTime < 10000000000
          ? previousBeforeTime * 1000
          : previousBeforeTime
    const nextTs =
      typeof nextBeforeTime === 'string'
        ? new Date(nextBeforeTime).getTime()
        : nextBeforeTime < 10000000000
          ? nextBeforeTime * 1000
          : nextBeforeTime

    if (!isNaN(prevTs) && !isNaN(nextTs) && nextTs >= prevTs) {
      console.warn('⚠️ History anchor did not move earlier', {
        label,
        previousBeforeTime,
        nextBeforeTime,
      })
    }
  }

  // ==================== Actions ====================

  async function loadMessages(
    talker: string,
    page = 1,
    append = false,
    timeRange?: string,
    bottom = 0
  ) {
    // 并发保护：同一 talker 正在加载时跳过重复调用
    if (loadingTalker.value === talker && loading.value) {
      if (appStore.isDebug) {
        console.log(`⏭️ loadMessages: skip concurrent load for ${talker}`)
      }
      return
    }

    const loadLabel = `[Perf] loadMessages(${talker}, page=${page}, append=${append})`
    if (appStore.isDebug) console.time(loadLabel)
    if (timeRange && !timeRange.includes('~')) {
      const beforeDate =
        typeof timeRange === 'string' ? new Date(timeRange) : new Date(timeRange * 1000)
      const startOfDay = new Date(
        beforeDate.getFullYear(),
        beforeDate.getMonth(),
        beforeDate.getDate()
      )
      // 从 lastTime 所在天的 0 点到当前时间，避免 session.lastTime 过时导致漏掉新消息
      timeRange = formatCSTRange(startOfDay, new Date())
    }
    try {
      loading.value = true
      loadingTalker.value = talker
      error.value = null
      appStore.setLoading('messages', true)

      let result: Message[] = []
      const limit = pageSize.value

      if (page === 1 && !append) {
        const cacheGetLabel = `[Perf] loadMessages:cacheStore.get(${talker})`
        if (appStore.isDebug) console.time(cacheGetLabel)
        const cached = cacheStore.get(talker)
        if (appStore.isDebug) console.timeEnd(cacheGetLabel)
        if (cached) {
          result = cached
          if (appStore.isDebug) {
            console.log('📦 Loaded from cache', { talker, count: result.length })
          }

          // if (refreshStore.config.enabled) {
          //   const startFromTime = getLatestMessageTime(cached)
          //   {
          //     if (appStore.isDebug) {
          //       console.log('⏳ Triggering background refresh for talker:', talker)
          //       console.log('📅 Start from time:', startFromTime)
          //     }

          //     refreshStore.refreshOne(talker, 1, startFromTime).catch(err => {
          //       console.error('Background refresh failed:', err)
          //     })
          //   }
          // }
        }
      }

      if (result.length === 0) {
        const offset = (page - 1) * limit
        result = await chatlogAPI.getSessionMessages(talker, timeRange, limit, offset, bottom)
        const normalizeLabel = `[Perf] loadMessages:normalize(${talker})`
        if (appStore.isDebug) console.time(normalizeLabel)
        result = normalizeAndAssertBatch(result, 'loadMessages:api')
        if (appStore.isDebug) console.timeEnd(normalizeLabel)

        if (page === 1 && !append) {
          cacheStore.set(talker, result)
        }
      }

      if (result.length > 0) {
        const firstMsg = result[0]
        const lastMsg = result[result.length - 1]
        if (appStore.isDebug) {
          console.log('📝 Batch order debug:', {
            count: result.length,
            first: {
              id: firstMsg.id,
              seq: firstMsg.seq,
              time: firstMsg.time,
              timestamp: getMessageTimestamp(firstMsg),
            },
            last: {
              id: lastMsg.id,
              seq: lastMsg.seq,
              time: lastMsg.time,
              timestamp: getMessageTimestamp(lastMsg),
            },
          })
        }
      }

      if (timeRange && page === 1 && !append) {
        const suggestedBeforeTime = parseTimeRangeStart(timeRange)
        const newestMsgTime = getFirstMessageTime(result)

        const emptyRangeMessage = createEmptyRangeMessage(
          talker,
          timeRange,
          newestMsgTime,
          0,
          suggestedBeforeTime
        )

        if (appStore.isDebug) {
          console.log('📝 EmptyRange message created for empty load:', {
            talker,
            timeRange: timeRange,
            suggestedBeforeTime: new Date(suggestedBeforeTime).toISOString(),
          })
        }

        result = [emptyRangeMessage, ...result]
      }

      if (append) {
        const mergeLabel = `[Perf] loadMessages:mergeWithCurrent(${talker})`
        if (appStore.isDebug) console.time(mergeLabel)
        mergeWithCurrentMessages(result, 'loadMessages:append')
        if (appStore.isDebug) console.timeEnd(mergeLabel)
      } else {
        const replaceLabel = `[Perf] loadMessages:replaceMessages(${talker})`
        if (appStore.isDebug) console.time(replaceLabel)
        messages.value = normalizeAndAssertBatch(result, 'loadMessages:replace')
        assertChronologicalOrder(messages.value, appStore.isDebug, 'loadMessages:replace')
        if (appStore.isDebug) console.timeEnd(replaceLabel)
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

      if (appStore.isDebug) console.timeEnd(loadLabel)
      return result
    } catch (err) {
      if (appStore.isDebug) console.timeEnd(loadLabel)
      error.value = err as Error
      appStore.setError(err as Error)
      throw err
    } finally {
      loading.value = false
      loadingTalker.value = null
      appStore.setLoading('messages', false)
    }
  }

  async function loadMessagesWithBatchRender(talker: string) {
    const timerLabel = `[Perf] loadMessagesWithBatchRender(${talker})`
    if (appStore.isDebug) console.time(timerLabel)

    try {
      loading.value = true
      loadingTalker.value = talker
      error.value = null
      appStore.setLoading('messages', true)

      let result: Message[] = []
      const limit = pageSize.value

      const cached = cacheStore.get(talker)

      if (cached) {
        result = cached
        if (appStore.isDebug) {
          console.log('📦 Loaded from cache (batch render)', { talker, count: result.length })
        }
      }

      if (result.length === 0) {
        result = await chatlogAPI.getSessionMessages(talker, undefined, limit, 0, 1)
        result = normalizeAndAssertBatch(result, 'loadMessagesWithBatchRender:api')
        cacheStore.set(talker, result)
      }

      await batchRenderMessages(result, 10)

      currentTalker.value = talker
      assertChronologicalOrder(messages.value, appStore.isDebug, 'loadMessagesWithBatchRender:done')
    } catch (err) {
      if (appStore.isDebug) {
        console.error('❌ loadMessagesWithBatchRender error:', err)
      }
      error.value = err instanceof Error ? err : new Error(String(err))
      appStore.setError(err as Error)
      throw err
    } finally {
      loading.value = false
      loadingTalker.value = null
      appStore.setLoading('messages', false)
      if (appStore.isDebug) console.timeEnd(timerLabel)
    }
  }

  async function loadMoreMessages() {
    if (!hasMore.value || loading.value || !currentTalker.value) {
      return
    }
    const nextPage = currentPage.value + 1
    await loadMessages(currentTalker.value, nextPage, true)
  }

  async function loadHistoryMessages(
    talker: string,
    beforeTime: string | number
  ): Promise<{ messages: Message[]; hasMore: boolean; timeRange: string; offset: number }> {
    if (loadingHistory.value) {
      return { messages: [], hasMore: false, timeRange: '', offset: 0 }
    }

    try {
      loadingHistory.value = true
      historyLoadMessage.value = ''
      appStore.setLoading('history', true)

      const limit = pageSize.value

      let result: Message[] = []
      let finalTimeRange = ''
      let retryCount = 0

      const smartResult = await fetchSmartHistoryMessages(
        messages.value,
        talker,
        beforeTime,
        limit,
        0,
        appStore.isDebug
      )
      result = smartResult.result
      result = normalizeAndAssertBatch(result, 'loadHistoryMessages:api')
      finalTimeRange = smartResult.finalTimeRange
      retryCount = smartResult.retryCount

      if (result.length === 0) {
        const emptyResult = handleEmptyResult(
          messages.value,
          talker,
          finalTimeRange,
          0,
          retryCount,
          appStore.isDebug
        )
        if (emptyResult.newMessages && emptyResult.newMessages.length > 0) {
          const normalizedEmptyMessages = normalizeAndAssertBatch(
            emptyResult.messages,
            'loadHistoryMessages:empty'
          )
          messages.value = mergeTopAdjacentEmptyRanges(
            normalizedEmptyMessages,
            talker,
            appStore.isDebug
          )
          assertChronologicalOrder(messages.value, appStore.isDebug, 'loadHistoryMessages:empty')
        }
        return {
          messages: emptyResult.newMessages,
          hasMore: emptyResult.hasMore,
          timeRange: emptyResult.timeRange,
          offset: 0,
        }
      }

      if (appStore.isDebug) {
        console.log('✅ History messages loaded:', {
          count: result.length,
          timeRange: finalTimeRange,
        })
      }

      const uniqueNewMessages = deduplicateMessages(messages.value, result, appStore.isDebug)
      const normalizedUniqueMessages = normalizeAndAssertBatch(
        uniqueNewMessages,
        'loadHistoryMessages:dedup'
      )

      const hasMoreHistory = result.length >= limit

      let gapToInsert: Message | null = null
      let emptyRangeToInsert: Message | null = null

      if (hasMoreHistory && normalizedUniqueMessages.length > 0) {
        const isConnected = checkDataConnection(result, messages.value)

        if (!isConnected) {
          const requestedEndTime = parseTimeRangeEnd(finalTimeRange)
          const newestLoadedMsg = normalizedUniqueMessages[normalizedUniqueMessages.length - 1]
          const newestLoadedTime = getMessageTimestamp(newestLoadedMsg)

          const estimatedCount = estimateMessageCount(
            messages.value,
            talker,
            newestLoadedTime,
            requestedEndTime
          )
          const estimateConfidence = getGapEstimateConfidence(
            messages.value,
            talker,
            newestLoadedTime,
            requestedEndTime
          )

          gapToInsert = createGapMessage(
            talker,
            newestLoadedTime,
            requestedEndTime,
            estimatedCount,
            estimateConfidence
          )

          if (appStore.isDebug) {
            console.log('📌 Creating Gap message at bottom for newer data:', {
              newestLoaded: new Date(newestLoadedTime).toISOString(),
              requestedEnd: new Date(requestedEndTime).toISOString(),
              estimatedCount,
              estimateConfidence,
              actualLoaded: result.length,
            })
          }
        } else {
          if (appStore.isDebug) {
            console.log('✅ New data is connected to existing data, no Gap needed')
          }
        }
      } else {
        emptyRangeToInsert = detectTimeGap(
          talker,
          finalTimeRange,
          0,
          normalizedUniqueMessages,
          appStore.isDebug
        )
      }

      const messagesToInsert: Message[] = []
      if (emptyRangeToInsert) {
        messagesToInsert.push(emptyRangeToInsert)
      }
      messagesToInsert.push(...normalizedUniqueMessages)
      if (gapToInsert) {
        messagesToInsert.push(gapToInsert)
      }
      mergeWithCurrentMessages(messagesToInsert, 'loadHistoryMessages:merge')
      messages.value = mergeAdjacentGapMessages(messages.value, talker, appStore.isDebug)
      messages.value = mergeTopAdjacentEmptyRanges(messages.value, talker, appStore.isDebug)

      const nextAnchor = getHistoryAnchorBeforeTime(messages.value)
      assertHistoryAnchorProgress(beforeTime, nextAnchor, 'loadHistoryMessages')

      historyLoadMessage.value = ''

      if (appStore.isDebug) {
        const gapCount = messages.value.filter(
          m => m.isGap && m.talker === talker
        ).length
        const emptyRangeCount = messages.value.filter(
          m => m.isEmptyRange && m.talker === talker
        ).length
        console.log('📊 History loading result:', {
          loaded: result.length,
          unique: uniqueNewMessages.length,
          normalizedUnique: normalizedUniqueMessages.length,
          hasMore: hasMoreHistory,
          gapInserted: !!gapToInsert,
          emptyRangeInserted: !!emptyRangeToInsert,
          gapCount,
          emptyRangeCount,
        })
      }

      return {
        messages: normalizedUniqueMessages,
        hasMore: hasMoreHistory,
        timeRange: finalTimeRange,
        offset: 0,
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

  async function loadGapMessages(
    gapMessage: Message
  ): Promise<{ success: boolean; hasMore: boolean }> {
    if (!gapMessage.isGap || !gapMessage.gapData) {
      return { success: false, hasMore: false }
    }

    const { timeRange } = gapMessage.gapData
    const limit = pageSize.value

    if (appStore.isDebug) {
      console.log('🔄 Loading Gap messages:', {
        timeRange,
        gapId: gapMessage.id,
        limit,
      })
    }

    try {
      removeGapMessage(gapMessage.id)

      const result = normalizeAndAssertBatch(
        await loadMessagesInTimeRange(gapMessage.talker, timeRange, limit, 0),
        'loadGapMessages:api'
      )

      if (appStore.isDebug) {
        console.log('✅ Gap messages loaded:', {
          count: result.length,
          limit,
        })
      }

      if (result.length === 0) {
        return { success: false, hasMore: false }
      }

      const uniqueNewMessages = deduplicateMessages(messages.value, result, appStore.isDebug)
      const normalizedUniqueMessages = normalizeAndAssertBatch(
        uniqueNewMessages,
        'loadGapMessages:dedup'
      )

      const hasMoreInGap = result.length >= limit
      const isConnected = checkDataConnection(result, messages.value)

      let newGapToInsert: Message | null = null
      if (!isConnected && normalizedUniqueMessages.length > 0) {
        const requestedEndTime = parseTimeRangeEnd(timeRange)
        const newestLoadedMsg = normalizedUniqueMessages[normalizedUniqueMessages.length - 1]
        const newestLoadedTime = getMessageTimestamp(newestLoadedMsg)

        const estimatedCount = estimateMessageCount(
          messages.value,
          gapMessage.talker,
          newestLoadedTime,
          requestedEndTime
        )
        const estimateConfidence = getGapEstimateConfidence(
          messages.value,
          gapMessage.talker,
          newestLoadedTime,
          requestedEndTime
        )

        newGapToInsert = createGapMessage(
          gapMessage.talker,
          newestLoadedTime,
          requestedEndTime,
          estimatedCount,
          estimateConfidence
        )

        if (appStore.isDebug) {
          console.log('📌 Keep/update Gap after load (no explicit overlap):', {
            newestLoaded: new Date(newestLoadedTime).toISOString(),
            requestedEnd: new Date(requestedEndTime).toISOString(),
            estimatedCount,
            estimateConfidence,
            actualLoaded: result.length,
            hasMoreInGap,
            isConnected,
          })
        }
      } else if (appStore.isDebug) {
        console.log('✅ Gap resolved by explicit duplicate overlap', {
          hasMoreInGap,
          isConnected,
          loaded: result.length,
        })
      }

      const messagesToInsert: Message[] = []
      messagesToInsert.push(...normalizedUniqueMessages)
      if (newGapToInsert) {
        messagesToInsert.push(newGapToInsert)
      }
      mergeWithCurrentMessages(messagesToInsert, 'loadGapMessages:merge')
      messages.value = mergeAdjacentGapMessages(messages.value, gapMessage.talker, appStore.isDebug)

      const nextAnchor = getHistoryAnchorBeforeTime(messages.value)
      assertHistoryAnchorProgress(gapMessage.gapData.beforeTime, nextAnchor, 'loadGapMessages')

      if (appStore.isDebug) {
        const gapCount = messages.value.filter(
          m => m.isGap && m.talker === gapMessage.talker
        ).length
        console.log('📊 Gap load metrics:', {
          talker: gapMessage.talker,
          loaded: result.length,
          unique: normalizedUniqueMessages.length,
          isConnected,
          hasMoreInGap,
          gapCount,
        })
      }

      return {
        success: result.length > 0,
        hasMore: hasMoreInGap,
      }
    } catch (err) {
      console.error('Gap messages loading failed:', err)
      const gapIndex = messages.value.findIndex(m => !m.isGap && !m.isEmptyRange)
      if (gapIndex !== -1) {
        messages.value.splice(gapIndex, 0, gapMessage)
      } else {
        messages.value.unshift(gapMessage)
      }
      return { success: false, hasMore: false }
    }
  }

  function removeGapMessages(talker: string) {
    messages.value = messages.value.filter(msg => !(msg.isGap && msg.talker === talker))
  }

  function removeGapMessage(gapId: number) {
    messages.value = messages.value.filter(msg => msg.id !== gapId)
  }

  function hasGapMessage(talker: string): boolean {
    return messages.value.some(msg => msg.isGap && msg.talker === talker)
  }

  async function refreshMessages() {
    if (!currentTalker.value) return
    await loadMessages(currentTalker.value, 1, false)
  }

  function abortBatchRender() {
    if (batchRenderAbort.value) {
      batchRenderAbort.value.abort()
      batchRenderAbort.value = null
    }
    isBatchRendering.value = false
  }

  async function batchRenderMessages(newMessages: Message[], batchSize: number = 20): Promise<void> {
    abortBatchRender()

    if (newMessages.length <= batchSize) {
      messages.value = newMessages
      return
    }

    const controller = new AbortController()
    batchRenderAbort.value = controller
    isBatchRendering.value = true

    try {
      let index = 0

      while (index < newMessages.length && !controller.signal.aborted) {
        const end = Math.min(index + batchSize, newMessages.length)
        const batch = newMessages.slice(0, end)

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            if (controller.signal.aborted) {
              resolve()
              return
            }
            messages.value = batch
            resolve()
          })
        })

        index = end
      }
    } finally {
      if (batchRenderAbort.value === controller) {
        batchRenderAbort.value = null
        isBatchRendering.value = false
      }
    }
  }

  async function switchSession(talker: string) {
    if (talker === currentTalker.value) return

    abortBatchRender()

    currentPage.value = 1
    hasMore.value = true
    messages.value = []

    const { useChatSelectionStore } = await import('./chatSelection')
    const selectionStore = useChatSelectionStore()
    selectionStore.clearSelection()

    await loadMessagesWithBatchRender(talker)
  }

  function getMessageById(id: number): Message | undefined {
    return messages.value.find(msg => msg.id === id)
  }

  function getMessageIndex(id: number): number {
    return currentMessages.value.findIndex(msg => msg.id === id)
  }

  async function jumpToMessage(messageId: number) {
    const message = getMessageById(messageId)
    if (!message) {
      return
    }
    scrollTargetId.value = messageId
  }

  function setPlayingVoice(id: number | null) {
    playingVoiceId.value = id
  }

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

  function clearError() {
    error.value = null
  }

  // 封装方法：替代直接暴露 cacheStore/refreshStore
  function getCacheMetadata() {
    return cacheStore.metadata
  }

  function removeCache(talker: string) {
    cacheStore.remove(talker)
  }

  function getCache(talker: string) {
    return cacheStore.get(talker)
  }

  function isAutoRefreshEnabled() {
    return refreshStore.config.enabled
  }

  function triggerRefresh(talker: string, count: number, startFromTime?: string) {
    return refreshStore.refreshOne(talker, count, startFromTime)
  }

  // 缓存更新处理（由 autoRefresh store 直接调用）
  function handleCacheUpdateData(talker: string, newMessages: Message[]) {
    const updateLabel = `[Perf] handleCacheUpdateData(${talker}, new=${newMessages.length})`
    if (appStore.isDebug) console.time(updateLabel)
    if (appStore.isDebug) {
      console.log('🛎️ Chatlog cache updated:', { talker })
    }

    if (talker === currentTalker.value) {
      const existingIds = new Set(messages.value.map(m => `${m.id}_${m.seq}`))
      const actualNewMessages = newMessages.filter(
        (m: Message) => !existingIds.has(`${m.id}_${m.seq}`)
      )

      if (actualNewMessages.length > 0) {
        mergeWithCurrentMessages(actualNewMessages, 'cacheUpdate')

        if (appStore.isDebug) {
          console.log(`🔄 Auto-updated messages for current session: ${talker}`, {
            existingCount: messages.value.length - actualNewMessages.length,
            newMessagesCount: actualNewMessages.length,
          })
        }
      }
    }
    if (appStore.isDebug) console.timeEnd(updateLabel)
  }

  function init() {
    if (!cacheStore.metadata.length) {
      cacheStore.init()
    }
    if (refreshStore.config.enabled && !refreshStore.timer) {
      refreshStore.init()
    }
  }

  function cleanup() {}

  function $reset() {
    abortBatchRender()
    messages.value = []
    currentTalker.value = ''
    totalMessages.value = 0
    currentPage.value = 1
    hasMore.value = true
    playingVoiceId.value = null
    loading.value = false
    error.value = null
    loadingHistory.value = false
    historyLoadMessage.value = ''
    scrollTargetId.value = null
  }

  return {
    // State
    messages,
    currentTalker,
    totalMessages,
    currentPage,
    pageSize,
    hasMore,
    playingVoiceId,
    loading,
    error,
    loadingHistory,
    historyLoadMessage,
    scrollTargetId,
    isBatchRendering,

    // Getters
    currentMessages,
    messagesByDate,
    mediaMessages,
    imageMessages,
    videoMessages,
    fileMessages,

    // Cache & Refresh 封装方法
    getCacheMetadata,
    removeCache,
    getCache,
    isAutoRefreshEnabled,
    triggerRefresh,
    handleCacheUpdateData,

    // Actions
    init,
    loadMessages,
    loadMessagesWithBatchRender,
    loadMoreMessages,
    loadHistoryMessages,
    loadGapMessages,
    removeGapMessages,
    removeGapMessage,
    hasGapMessage,
    refreshMessages,
    switchSession,
    batchRenderMessages,
    abortBatchRender,
    getMessageById,
    getMessageIndex,
    jumpToMessage,
    setPlayingVoice,
    getMessageStats,
    clearError,
    $reset,
    cleanup,
  }
})
