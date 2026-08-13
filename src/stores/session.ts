/**
 * 会话状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { sessionAPI } from '@/api'
import type { Session } from '@/types/session'
import type { SessionParams } from '@/types/api'
import type { SessionFilterType } from '@/types'
import type { Contact } from '@/types/contact'
import { useAppStore } from './app'
import { useSettingsStore } from './settings'
import { useContactStore } from './contact'
import { useSessionSearch } from './sessionSearch'

export const useSessionStore = defineStore('session', () => {
  const appStore = useAppStore()
  const settingsStore = useSettingsStore()
  const contactStore = useContactStore()

  // ==================== State ====================

  /**
   * 本地置顶会话 ID 集合
   */
  const localPinnedSessions = ref<Set<string>>(new Set())

  /**
   * 保存本地置顶数据
   */
  const saveLocalPinnedSessions = () => {
    localStorage.setItem('local-pinned-sessions', JSON.stringify([...localPinnedSessions.value]))
  }

  /**
   * 会话列表
   */
  const sessions = ref<Session[]>([])

  /**
   * 当前选中的会话 ID
   */
  const currentSessionId = ref<string>('')

  /**
   * 会话总数
   */
  const totalSessions = ref(0)

  /**
   * 当前页码
   */
  const currentPage = ref(1)

  /**
   * 每页大小（直接使用 appStore.config.pageSize，避免不同步）
   */
  const pageSize = computed(() => appStore.config.pageSize)

  /**
   * 是否还有更多会话
   */
  const hasMore = ref(true)

  /**
   * 筛选类型
   */
  const filterType = ref<SessionFilterType>('all')

  /**
   * 搜索关键词
   */
  const searchKeyword = ref('')

  /**
   * 排序方式
   */
  const sortBy = ref<'time' | 'name' | 'unread'>('time')

  /**
   * 排序方向
   */
  const sortOrder = ref<'asc' | 'desc'>('desc')

  /**
   * 加载状态
   */
  const loading = ref(false)

  /**
   * 错误信息
   */
  const error = ref<Error | null>(null)

  // ==================== Search Module ====================

  const contactMap = computed(() => {
    const map = new Map<string, Contact>()
    contactStore.contacts.forEach(contact => {
      map.set(contact.wxid, contact)
    })
    return map
  })

  /**
   * 从 contact 数据补充 session 的 isPinned/isMinimized/avatar
   * session API 不返回这些字段，需要从 contact API 获取
   */
  function enrichSessionsFromContacts(targetSessions: Session[]) {
    for (const session of targetSessions) {
      const contact = contactMap.value.get(session.talker)
      if (!contact) continue
      if (contact.isPinned) session.isPinned = true
      if (contact.isMinimized) session.isMinimized = true
      if (!session.avatar && contact.avatar) session.avatar = contact.avatar
    }
  }

  // contact 数据后续加载时，自动补充已有 sessions
  watch(() => contactMap.value.size, () => {
    if (sessions.value.length > 0) {
      enrichSessionsFromContacts(sessions.value)
    }
  })

  const disableServerPinning = computed(() => !settingsStore.chat.enableServerPinning)

  const search = useSessionSearch({
    sessions,
    searchKeyword,
    filterType,
    sortBy,
    sortOrder,
    contactMap,
    disableServerPinning,
  })

  // ==================== Getters ====================

  /**
   * 当前选中的会话
   */
  const currentSession = computed(() => {
    return sessions.value.find(s => s.talker === currentSessionId.value)
  })

  /**
   * 筛选后的会话列表
   */
  const filteredSessions = computed(() => {
    let result = search.applySessionTypeFilter(sessions.value)

    if (!search.searchKeywordNormalized.value) {
      return [...result].sort(search.compareSessionsBase)
    }

    result = result
      .map(session => ({
        session,
        metadata: search.searchMatchesMap.value.get(session.talker),
      }))
      .filter(item => !!item.metadata)
      .sort((a, b) => {
        const scoreDiff = (b.metadata?.matchScore || 0) - (a.metadata?.matchScore || 0)
        if (scoreDiff !== 0) {
          return scoreDiff
        }

        return search.compareSessionsBase(a.session, b.session)
      })
      .map(item => item.session)

    return result
  })

  const searchResultCount = computed(() => {
    return search.isSearchMode.value ? filteredSessions.value.length : 0
  })

  /**
   * 置顶会话列表
   */
  const pinnedSessions = computed(() => {
    return filteredSessions.value.filter(
      s => s.isLocalPinned || (settingsStore.chat.enableServerPinning && s.isPinned)
    )
  })

  /**
   * 非置顶会话列表
   */
  const unpinnedSessions = computed(() => {
    return filteredSessions.value.filter(
      s => !(s.isLocalPinned || (settingsStore.chat.enableServerPinning && s.isPinned))
    )
  })

  /**
   * 未读会话列表
   */
  const unreadSessions = computed(() => {
    return sessions.value.filter(s => (s.unreadCount || 0) > 0)
  })

  /**
   * 未读消息总数
   */
  const totalUnreadCount = computed(() => {
    return sessions.value.reduce((sum, s) => sum + (s.unreadCount || 0), 0)
  })

  /**
   * 私聊会话列表
   */
  const privateSessions = computed(() => {
    return sessions.value.filter(s => s.type === 'private')
  })

  /**
   * 群聊会话列表
   */
  const groupSessions = computed(() => {
    return sessions.value.filter(s => s.type === 'group')
  })

  /**
   * 公众号会话列表
   */
  const officialSessions = computed(() => {
    return sessions.value.filter(s => s.type === 'official')
  })

  /**
   * 其他类型会话列表
   */
  const unknownSessions = computed(() => {
    return sessions.value.filter(s => s.type === 'unknown')
  })

  /**
   * 是否有会话
   */
  const hasSessions = computed(() => sessions.value.length > 0)

  /**
   * 是否有当前会话
   */
  const hasCurrentSession = computed(() => !!currentSession.value)

  /**
   * 会话统计
   */
  const sessionStats = computed(() => {
    return {
      total: sessions.value.length,
      private: privateSessions.value.length,
      group: groupSessions.value.length,
      official: officialSessions.value.length,
      unknown: unknownSessions.value.length,
      unread: unreadSessions.value.length,
      pinned: pinnedSessions.value.length,
    }
  })

  // ==================== Actions ====================

  /**
   * 加载会话列表
   */
  async function loadSessions(params?: SessionParams, append = false) {
    try {
      loading.value = true
      error.value = null
      appStore.setLoading('sessions', true)

      const queryParams: SessionParams = {
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
        ...params,
      }

      const { items, total } = await sessionAPI.getSessions(queryParams)

      // 注入本地置顶状态
      items.forEach(item => {
        if (localPinnedSessions.value.has(item.talker)) {
          item.isLocalPinned = true
        }
      })

      // 从 contact 数据补充 isPinned/isMinimized/avatar（session API 不返回这些字段）
      enrichSessionsFromContacts(items)

      if (append) {
        sessions.value = [...sessions.value, ...items]
      } else {
        sessions.value = items
      }

      search.hydrateSearchContacts(items).catch(err => {
        console.warn('补全会话搜索索引失败:', err)
      })

      totalSessions.value = total
      hasMore.value = items.length >= pageSize.value

      if (appStore.isDebug) {
        console.log('📋 Sessions loaded', {
          count: items.length,
          total,
          page: currentPage.value,
          hasMore: hasMore.value,
        })
      }

      return items
    } catch (err) {
      error.value = err as Error
      appStore.setError(err as Error)
      throw err
    } finally {
      loading.value = false
      appStore.setLoading('sessions', false)
    }
  }

  /**
   * 加载更多会话
   */
  async function loadMoreSessions() {
    if (!hasMore.value || loading.value) {
      return
    }

    currentPage.value++
    await loadSessions(undefined, true)
  }

  /**
   * 刷新会话列表
   */
  async function refreshSessions() {
    currentPage.value = 1
    await loadSessions(undefined, false)
  }

  /**
   * 获取会话详情
   */
  async function getSessionDetail(talker: string) {
    try {
      const session = await sessionAPI.getSessionDetail(talker)

      // API 未命中（keyword 搜索无结果）时返回 null
      if (!session) {
        return null
      }

      // 注入本地置顶状态
      if (localPinnedSessions.value.has(session.talker)) {
        session.isLocalPinned = true
      }

      // 更新或添加到列表
      const index = sessions.value.findIndex(s => s.talker === talker)
      if (index !== -1) {
        sessions.value[index] = session
      } else {
        sessions.value.unshift(session)
      }

      search.hydrateSearchContacts([session]).catch(err => {
        console.warn('补全会话搜索索引失败:', err)
      })

      return session
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  /**
   * 选择会话
   */
  async function selectSession(talker: string) {
    currentSessionId.value = talker

    // 如果会话不在列表中，获取详情
    if (!sessions.value.find(s => s.talker === talker)) {
      await getSessionDetail(talker)
    }
  }

  /**
   * 设置筛选类型
   */
  function setFilterType(type: SessionFilterType) {
    filterType.value = type
  }

  /**
   * 设置搜索关键词
   */
  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }

  /**
   * 设置排序方式
   */
  function setSortBy(sort: 'time' | 'name' | 'unread') {
    sortBy.value = sort
  }

  /**
   * 切换排序方向
   */
  function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }

  /**
   * 置顶会话
   */
  function pinSession(talker: string) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      localPinnedSessions.value.add(talker)
      session.isLocalPinned = true
      saveLocalPinnedSessions()
    }
  }

  /**
   * 取消置顶会话
   */
  function unpinSession(talker: string) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      localPinnedSessions.value.delete(talker)
      session.isLocalPinned = false
      saveLocalPinnedSessions()
    }
  }

  /**
   * 切换置顶状态
   */
  function togglePinSession(talker: string) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      if (localPinnedSessions.value.has(talker)) {
        localPinnedSessions.value.delete(talker)
        session.isLocalPinned = false
      } else {
        localPinnedSessions.value.add(talker)
        session.isLocalPinned = true
      }
      saveLocalPinnedSessions()
    }
  }

  /**
   * 标记会话为已读
   */
  function markAsRead(talker: string) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      session.unreadCount = 0
    }
  }

  /**
   * 标记所有会话为已读
   */
  function markAllAsRead() {
    sessions.value.forEach(session => {
      session.unreadCount = 0
    })
  }

  /**
   * 删除会话（本地）
   */
  function deleteSession(talker: string) {
    const index = sessions.value.findIndex(s => s.talker === talker)
    if (index !== -1) {
      sessions.value.splice(index, 1)
    }

    // 如果删除的是当前会话，清除选择
    if (currentSessionId.value === talker) {
      currentSessionId.value = ''
    }
  }

  /**
   * 获取会话索引
   */
  function getSessionIndex(talker: string): number {
    return filteredSessions.value.findIndex(s => s.talker === talker)
  }

  /**
   * 获取上一个会话
   */
  function getPreviousSession(): Session | null {
    const currentIndex = getSessionIndex(currentSessionId.value)
    if (currentIndex > 0) {
      return filteredSessions.value[currentIndex - 1]
    }
    return null
  }

  /**
   * 获取下一个会话
   */
  function getNextSession(): Session | null {
    const currentIndex = getSessionIndex(currentSessionId.value)
    if (currentIndex >= 0 && currentIndex < filteredSessions.value.length - 1) {
      return filteredSessions.value[currentIndex + 1]
    }
    return null
  }

  /**
   * 切换到上一个会话
   */
  function selectPreviousSession() {
    const prev = getPreviousSession()
    if (prev) {
      selectSession(prev.talker)
    }
  }

  /**
   * 切换到下一个会话
   */
  function selectNextSession() {
    const next = getNextSession()
    if (next) {
      selectSession(next.talker)
    }
  }

  /**
   * 更新会话信息
   */
  function updateSession(talker: string, updates: Partial<Session>) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      Object.assign(session, updates)
    }
  }

  /**
   * 更新会话最后消息
   */
  function updateLastMessage(talker: string, message: Session['lastMessage']) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      session.lastMessage = message
    }
  }

  /**
   * 增加未读数
   */
  function incrementUnreadCount(talker: string, count = 1) {
    const session = sessions.value.find(s => s.talker === talker)
    if (session) {
      session.unreadCount = (session.unreadCount || 0) + count
    }
  }

  /**
   * 清除搜索
   */
  function clearSearch() {
    searchKeyword.value = ''
  }

  /**
   * 清除筛选
   */
  function clearFilter() {
    filterType.value = 'all'
    searchKeyword.value = ''
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
    sessions.value = []
    currentSessionId.value = ''
    totalSessions.value = 0
    currentPage.value = 1
    hasMore.value = true
    filterType.value = 'all'
    searchKeyword.value = ''
    sortBy.value = 'time'
    sortOrder.value = 'desc'
    loading.value = false
    error.value = null
    search.$reset()
  }

  /**
   * 初始化：从 localStorage 加载本地置顶数据
   * 应在组件 onMounted 中调用，而非 store 创建时自动执行
   */
  function init() {
    try {
      const saved = localStorage.getItem('local-pinned-sessions')
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          localPinnedSessions.value = new Set(list)
        }
      }
    } catch (e) {
      console.error('Failed to load local pinned sessions', e)
    }
  }

  // ==================== Return ====================

  return {
    // State
    sessions,
    currentSessionId,
    totalSessions,
    currentPage,
    pageSize,
    hasMore,
    filterType,
    searchKeyword,
    sortBy,
    sortOrder,
    loading,
    error,

    // Getters
    currentSession,
    filteredSessions,
    pinnedSessions,
    unpinnedSessions,
    unreadSessions,
    totalUnreadCount,
    privateSessions,
    groupSessions,
    officialSessions,
    unknownSessions,
    hasSessions,
    hasCurrentSession,
    sessionStats,
    contactMap,
    isSearchMode: search.isSearchMode,
    searchResultCount,
    searchIndexIncomplete: search.searchIndexIncomplete,
    getSessionSearchMetadata: search.getSessionSearchMetadata,

    // Actions
    init,
    loadSessions,
    loadMoreSessions,
    refreshSessions,
    getSessionDetail,
    selectSession,
    setFilterType,
    setSearchKeyword,
    setSortBy,
    toggleSortOrder,
    pinSession,
    unpinSession,
    togglePinSession,
    markAsRead,
    markAllAsRead,
    deleteSession,
    getSessionIndex,
    getPreviousSession,
    getNextSession,
    selectPreviousSession,
    selectNextSession,
    updateSession,
    updateLastMessage,
    incrementUnreadCount,
    clearSearch,
    clearFilter,
    clearError,
    $reset,
  }
})
