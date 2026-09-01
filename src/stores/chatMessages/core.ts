/**
 * chatMessages store - core 子模块
 *
 * State + 基础 getters + 辅助函数 + 简单查询方法
 */
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Message } from '@/types/message'
import { useAppStore } from '../app'
import { useMessageCacheStore } from '../messageCache'
import { useAutoRefreshStore } from '../autoRefresh'
import {
  assertChronologicalOrder,
  getMessageTimestamp,
  isRealMessage,
  normalizeBatchToChronological,
  mergeChronologicalMessages,
} from '../chat/utils'

export interface ChatMessagesCore {
  // State
  messages: Ref<Message[]>
  currentTalker: Ref<string>
  totalMessages: Ref<number>
  currentPage: Ref<number>
  pageSize: ComputedRef<number>
  hasMore: Ref<boolean>
  loading: Ref<boolean>
  loadingTalker: Ref<string | null>
  error: Ref<Error | null>
  loadingHistory: Ref<boolean>
  historyLoadMessage: Ref<string>

  // Getters
  currentMessages: ComputedRef<Message[]>

  // 辅助函数
  normalizeAndAssertBatch: (batch: Message[], label: string) => Message[]
  mergeWithCurrentMessages: (incomingBatch: Message[], label: string) => void
  getFirstRealMessage: (list: Message[]) => Message | undefined
  getLastRealMessage: (list: Message[]) => Message | undefined

  // 简单查询
  getMessageById: (id: number) => Message | undefined
  getMessageIndex: (id: number) => number
  clearError: () => void

  // 依赖 store（供子模块使用）
  appStore: ReturnType<typeof useAppStore>
  cacheStore: ReturnType<typeof useMessageCacheStore>
  refreshStore: ReturnType<typeof useAutoRefreshStore>

  // $reset core 部分
  $resetCore: () => void
}

export function useChatMessagesCore(): ChatMessagesCore {
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
  const loading = ref(false)
  const loadingTalker = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const loadingHistory = ref(false)
  const historyLoadMessage = ref('')

  // ==================== Getters ====================

  const currentMessages = computed(() => {
    if (!currentTalker.value) return []
    return messages.value.filter(msg => msg.talker === currentTalker.value)
  })

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

  // ==================== 简单查询 ====================

  function getMessageById(id: number): Message | undefined {
    return messages.value.find(msg => msg.id === id)
  }

  function getMessageIndex(id: number): number {
    return currentMessages.value.findIndex(msg => msg.id === id)
  }

  function clearError() {
    error.value = null
  }

  function $resetCore() {
    messages.value = []
    currentTalker.value = ''
    totalMessages.value = 0
    currentPage.value = 1
    hasMore.value = true
    loading.value = false
    error.value = null
    loadingHistory.value = false
    historyLoadMessage.value = ''
  }

  return {
    messages,
    currentTalker,
    totalMessages,
    currentPage,
    pageSize,
    hasMore,
    loading,
    loadingTalker,
    error,
    loadingHistory,
    historyLoadMessage,
    currentMessages,
    normalizeAndAssertBatch,
    mergeWithCurrentMessages,
    getFirstRealMessage,
    getLastRealMessage,
    getMessageById,
    getMessageIndex,
    clearError,
    appStore,
    cacheStore,
    refreshStore,
    $resetCore,
  }
}

