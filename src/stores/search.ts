/**
 * 搜索状态管理
 * 支持三类资源搜索：群聊、联系人、聊天记录
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contactAPI, searchAPI } from '@/api'
import type { Contact, Message } from '@/types'
import type { SearchHit, SearchIndexStatus } from '@/types/search'
import { useAppStore } from './app'

export type SearchType = 'chatroom' | 'contact' | 'message'

/**
 * 搜索范围：
 * - 'session'：会话内搜索（talker 必填），映射后端 scope=messages
 * - 'all'：全局搜索（无需 talker），映射后端 scope=all
 */
export type SearchScope = 'session' | 'all'

export interface SearchOptions {
  keyword: string
  type?: SearchType
  scope?: SearchScope
  talker?: string
  sender?: string
  timeRange?: [Date, Date] | null
  limit?: number
  offset?: number
}

export interface SearchResults {
  chatrooms: Contact[]
  contacts: Contact[]
  messages: Message[]
  total: number
  loading: boolean
  error: Error | null
}

export const useSearchStore = defineStore('search', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /**
   * 搜索关键词
   */
  const keyword = ref('')

  /**
   * 搜索类型
   */
  const searchType = ref<SearchType>('chatroom')

  /**
   * 搜索范围（session=会话内必选 talker；all=全局无需 talker）
   */
  const searchScope = ref<SearchScope>('session')

  /**
   * 选中的会话 ID（用于会话内搜索）
   */
  const selectedTalker = ref<string>('')

  /**
   * 时间范围
   */
  const timeRange = ref<[Date, Date] | null>(null)

  /**
   * 群聊搜索结果
   */
  const chatroomResults = ref<Contact[]>([])

  /**
   * 联系人搜索结果
   */
  const contactResults = ref<Contact[]>([])

  /**
   * 消息搜索结果（从全文搜索 hits 提取）
   */
  const messageResults = ref<Message[]>([])

  /**
   * 全文搜索完整命中（含 snippet/score，顺序保持后端相关度排序）
   */
  const searchHits = ref<SearchHit[]>([])

  /**
   * 全文索引状态（ready/in_progress/progress/last_error）
   */
  const indexStatus = ref<SearchIndexStatus | null>(null)

  /**
   * 加载状态
   */
  const loading = ref(false)
  const chatroomLoading = ref(false)
  const contactLoading = ref(false)
  const messageLoading = ref(false)

  /**
   * 错误信息
   */
  const error = ref<Error | null>(null)

  /**
   * 分页信息
   */
  const currentPage = ref(1)
  const pageSize = ref(50)
  const totalCount = ref(0)
  const hasMore = ref(true)

  // ==================== Getters ====================

  /**
   * 所有搜索结果
   */
  const allResults = computed<SearchResults>(() => ({
    chatrooms: chatroomResults.value,
    contacts: contactResults.value,
    messages: messageResults.value,
    total: chatroomResults.value.length + contactResults.value.length + messageResults.value.length,
    loading: loading.value,
    error: error.value,
  }))

  /**
   * 是否有搜索结果
   */
  const hasResults = computed(() => allResults.value.total > 0)

  /**
   * 是否有任何加载中的请求
   */
  const isLoading = computed(() => 
    loading.value || chatroomLoading.value || contactLoading.value || messageLoading.value
  )

  /**
   * 统计信息
   */
  const stats = computed(() => ({
    chatrooms: chatroomResults.value.length,
    contacts: contactResults.value.length,
    messages: messageResults.value.length,
    total: allResults.value.total,
  }))

  /**
   * 过滤后的结果（根据搜索类型）
   */
  const filteredResults = computed(() => {
    switch (searchType.value) {
      case 'chatroom':
        return {
          chatrooms: chatroomResults.value,
          contacts: [],
          messages: [],
          total: chatroomResults.value.length,
        }
      case 'contact':
        return {
          chatrooms: [],
          contacts: contactResults.value,
          messages: [],
          total: contactResults.value.length,
        }
      case 'message':
        return {
          chatrooms: [],
          contacts: [],
          messages: messageResults.value,
          total: messageResults.value.length,
        }
      default:
        return allResults.value
    }
  })

  // ==================== Actions ====================

  /**
   * 搜索群聊
   * GET /api/v1/chatroom?keyword=xxx&format=json
   */
  async function searchChatrooms(searchKeyword: string) {
    if (!searchKeyword.trim()) {
      chatroomResults.value = []
      return []
    }

    try {
      chatroomLoading.value = true
      
      // 获取所有群聊并过滤
      const chatrooms = await contactAPI.getChatrooms()
      const lowerKeyword = searchKeyword.toLowerCase().trim()
      
      chatroomResults.value = chatrooms.filter(chatroom => {
        const name = chatroom.nickname || chatroom.remark || chatroom.wxid || ''
        return name.toLowerCase().includes(lowerKeyword)
      })

      if (appStore.isDebug) {
        console.log('🔍 Chatroom search completed', {
          keyword: searchKeyword,
          count: chatroomResults.value.length,
        })
      }

      return chatroomResults.value
    } catch (err) {
      console.error('搜索群聊失败:', err)
      error.value = err as Error
      throw err
    } finally {
      chatroomLoading.value = false
    }
  }

  /**
   * 搜索联系人
   * GET /api/v1/contact?keyword=xxx&format=json
   */
  async function searchContacts(searchKeyword: string) {
    if (!searchKeyword.trim()) {
      contactResults.value = []
      return []
    }

    try {
      contactLoading.value = true
      
      const contacts = await contactAPI.searchContacts(searchKeyword)
      
      // 过滤掉群聊（群聊在 searchChatrooms 中处理）
      contactResults.value = contacts.filter(contact => !contact.wxid.endsWith('@chatroom'))

      if (appStore.isDebug) {
        console.log('🔍 Contact search completed', {
          keyword: searchKeyword,
          count: contactResults.value.length,
        })
      }

      return contactResults.value
    } catch (err) {
      console.error('搜索联系人失败:', err)
      error.value = err as Error
      throw err
    } finally {
      contactLoading.value = false
    }
  }

  /**
   * 搜索聊天记录（全文索引搜索）
   * GET /api/v1/search?q=xxx&scope=messages|all&talker=xxx&start=...&end=...
   * scope='session' 时 talker 必填；scope='all' 时为无 talker 全局搜索
   */
  async function searchMessages(options: Omit<SearchOptions, 'type'>, appendMode = false) {
    // scope='session'（会话内）时 talker 是必填项
    if (options.scope === 'session' && !options.talker) {
      if (!appendMode) {
        messageResults.value = []
        searchHits.value = []
      }
      return []
    }

    if (!options.keyword.trim()) {
      if (!appendMode) {
        messageResults.value = []
        searchHits.value = []
      }
      return []
    }

    try {
      messageLoading.value = true

      // 时间范围默认最近一年
      let timeRange = options.timeRange
      if (!timeRange || !timeRange[0] || !timeRange[1]) {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setFullYear(endDate.getFullYear() - 1)
        timeRange = [startDate, endDate]
      }

      const startDate = timeRange[0].toISOString().split('T')[0]
      const endDate = timeRange[1].toISOString().split('T')[0]

      const response = await searchAPI.search({
        q: options.keyword.trim(),
        scope: options.scope === 'all' ? 'all' : 'messages',
        talker: options.scope === 'all' ? undefined : options.talker,
        sender: options.sender,
        start: startDate,
        end: endDate,
        limit: options.limit || pageSize.value,
        offset: options.offset || 0,
      })

      indexStatus.value = response.index_status
      const hits = response.hits || []

      if (appendMode) {
        // 追加模式：按消息 id 去重后追加
        const existingIds = new Set(searchHits.value.map(h => h.message.id))
        const uniqueNewHits = hits.filter(h => !existingIds.has(h.message.id))
        searchHits.value.push(...uniqueNewHits)
        messageResults.value = searchHits.value.map(h => h.message)
        hasMore.value = response.offset + response.hits.length < response.total

        if (appStore.isDebug) {
          console.log('🔍 Message search (append) completed', {
            keyword: options.keyword,
            offset: options.offset,
            newCount: uniqueNewHits.length,
            totalCount: searchHits.value.length,
          })
        }

        return uniqueNewHits.map(h => h.message)
      } else {
        // 替换模式
        searchHits.value = hits
        messageResults.value = hits.map(h => h.message)
        totalCount.value = response.total
        hasMore.value = response.offset + response.hits.length < response.total

        if (appStore.isDebug) {
          console.log('🔍 Message search completed', {
            keyword: options.keyword,
            talker: options.talker,
            scope: options.scope,
            timeRange: options.timeRange,
            count: messageResults.value.length,
            total: totalCount.value,
            indexReady: indexStatus.value?.ready,
          })
        }

        return messageResults.value
      }
    } catch (err) {
      console.error('搜索消息失败:', err)
      error.value = err as Error
      throw err
    } finally {
      messageLoading.value = false
    }
  }

  /**
   * 执行搜索
   * 根据搜索类型调用相应的搜索方法
   */
  async function performSearch(options: SearchOptions) {
    if (!options.keyword.trim() && !options.timeRange) {
      clearResults()
      return allResults.value
    }

    try {
      loading.value = true
      error.value = null
      keyword.value = options.keyword
      searchType.value = options.type || 'chatroom'
      searchScope.value = options.scope || 'session'
      selectedTalker.value = options.talker || ''
      timeRange.value = options.timeRange || null

      // 根据搜索类型执行相应的搜索
      if (options.type === 'chatroom') {
        await searchChatrooms(options.keyword)
      } else if (options.type === 'contact') {
        await searchContacts(options.keyword)
      } else if (options.type === 'message') {
        // 会话内搜索（scope=session）必须指定 talker；全局搜索（scope=all）无需
        if (options.scope === 'session' && !options.talker) {
          error.value = new Error('会话内搜索必须选择会话（可切换为全局搜索）')
        } else {
          await searchMessages(options)
        }
      }

      if (appStore.isDebug) {
        console.log('🔍 Search completed', {
          keyword: options.keyword,
          type: options.type,
          scope: options.scope,
          stats: stats.value,
        })
      }

      return allResults.value
    } catch (err) {
      console.error('搜索失败:', err)
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载更多消息（分页，offset 基于 searchHits 数量）
   */
  async function loadMoreMessages() {
    if (!hasMore.value || messageLoading.value) {
      return
    }

    const nextOffset = searchHits.value.length

    try {
      const options: SearchOptions = {
        keyword: keyword.value,
        scope: searchScope.value,
        talker: selectedTalker.value,
        timeRange: timeRange.value,
        limit: pageSize.value,
        offset: nextOffset,
      }

      // 使用追加模式调用 searchMessages
      await searchMessages(options, true)

      currentPage.value++
    } catch (err) {
      console.error('加载更多消息失败:', err)
      throw err
    }
  }

  /**
   * 清空搜索结果
   */
  function clearResults() {
    keyword.value = ''
    chatroomResults.value = []
    contactResults.value = []
    messageResults.value = []
    searchHits.value = []
    indexStatus.value = null
    error.value = null
    currentPage.value = 1
    totalCount.value = 0
    hasMore.value = true
  }

  /**
   * 重置搜索状态
   */
  function reset() {
    clearResults()
    searchType.value = 'chatroom'
    searchScope.value = 'session'
    selectedTalker.value = ''
    timeRange.value = null
  }

  /**
   * 设置搜索类型
   */
  function setSearchType(type: SearchType) {
    searchType.value = type
  }

  /**
   * 设置搜索范围
   */
  function setSearchScope(scope: SearchScope) {
    searchScope.value = scope
  }

  /**
   * 设置选中的会话
   */
  function setSelectedTalker(talker: string) {
    selectedTalker.value = talker
  }

  /**
   * 设置时间范围
   */
  function setTimeRange(range: [Date, Date] | null) {
    timeRange.value = range
  }

  return {
    // State
    keyword,
    searchType,
    searchScope,
    selectedTalker,
    timeRange,
    chatroomResults,
    contactResults,
    messageResults,
    searchHits,
    indexStatus,
    loading,
    chatroomLoading,
    contactLoading,
    messageLoading,
    error,
    currentPage,
    pageSize,
    totalCount,
    hasMore,

    // Getters
    allResults,
    hasResults,
    isLoading,
    stats,
    filteredResults,

    // Actions
    searchChatrooms,
    searchContacts,
    searchMessages,
    performSearch,
    loadMoreMessages,
    clearResults,
    reset,
    setSearchType,
    setSearchScope,
    setSelectedTalker,
    setTimeRange,
  }
})