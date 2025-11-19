/**
 * 联系人状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contactAPI } from '@/api'
import type { Contact } from '@/types/contact'
import { useAppStore } from './app'
import { db } from '@/utils/db'
import { createBackgroundLoader, type BackgroundLoader, type LoadProgress } from '@/utils/background-loader'

export const useContactStore = defineStore('contact', () => {
  const appStore = useAppStore()

  // ==================== State ====================

  /**
   * 联系人列表
   */
  const contacts = ref<Contact[]>([])

  /**
   * 当前选中的联系人 ID
   */
  const currentContactId = ref<string>('')

  /**
   * 联系人总数
   */
  const totalContacts = ref(0)

  /**
   * 筛选类型
   */
  const filterType = ref<'all' | 'friend' | 'chatroom' | 'official'>('all')

  /**
   * 搜索关键词
   */
  const searchKeyword = ref('')

  /**
   * 排序方式
   */
  const sortBy = ref<'name' | 'time'>('name')

  /**
   * 是否显示首字母索引
   */
  const showLetterIndex = ref(true)

  /**
   * 加载状态
   */
  const loading = ref(false)

  /**
   * 错误信息
   */
  const error = ref<Error | null>(null)

  /**
   * 后台加载器
   */
  let backgroundLoader: BackgroundLoader<Contact> | null = null

  /**
   * 后台加载进度
   */
  const loadProgress = ref<LoadProgress | null>(null)

  /**
   * 是否正在后台加载
   */
  const isBackgroundLoading = ref(false)

  // ==================== Getters ====================

  /**
   * 当前选中的联系人
   */
  const currentContact = computed(() => {
    return contacts.value.find(c => c.wxid === currentContactId.value)
  })

  /**
   * 筛选后的联系人列表
   */
  const filteredContacts = computed(() => {
    let result = contacts.value

    // 按类型筛选
    if (filterType.value !== 'all') {
      const typeMap = {
        friend: 'friend',
        chatroom: 'chatroom',
        official: 'official',
      }
      const targetType = typeMap[filterType.value]
      result = result.filter(c => c.type === targetType)
    }

    // 搜索筛选
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter(c => {
        const displayName = contactAPI.getDisplayName(c).toLowerCase()
        const wxid = (c.wxid || '').toLowerCase()
        const alias = (c.alias || '').toLowerCase()
        return displayName.includes(keyword) || wxid.includes(keyword) || alias.includes(keyword)
      })
    }

    // 排序
    result = [...result].sort((a, b) => {
      if (sortBy.value === 'name') {
        const nameA = contactAPI.getDisplayName(a)
        const nameB = contactAPI.getDisplayName(b)
        return nameA.localeCompare(nameB, 'zh-CN')
      } else {
        return (b.lastContactTime || 0) - (a.lastContactTime || 0)
      }
    })

    return result
  })

  /**
   * 好友列表
   */
  const friends = computed(() => {
    return contacts.value.filter(c => c.type === 'friend')
  })

  /**
   * 群聊列表
   */
  const chatrooms = computed(() => {
    return contacts.value.filter(c => c.type === 'chatroom')
  })

  /**
   * 公众号列表
   */
  const officialAccounts = computed(() => {
    return contacts.value.filter(c => c.type === 'official')
  })

  /**
   * 星标联系人列表
   */
  const starredContacts = computed(() => {
    return contacts.value.filter(c => c.isStarred)
  })

  /**
   * 按首字母分组的联系人
   */
  const contactsByLetter = computed(() => {
    const grouped: Record<string, Contact[]> = {}

    filteredContacts.value.forEach(contact => {
      const letter = getFirstLetter(contactAPI.getDisplayName(contact))
      if (!grouped[letter]) {
        grouped[letter] = []
      }
      grouped[letter].push(contact)
    })

    return grouped
  })

  /**
   * 首字母索引列表
   */
  const letterIndexList = computed(() => {
    return Object.keys(contactsByLetter.value).sort((a, b) => {
      // # 排在最后
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
  })

  /**
   * 联系人统计
   */
  const contactStats = computed(() => {
    return {
      total: contacts.value.length,
      friends: friends.value.length,
      chatrooms: chatrooms.value.length,
      official: officialAccounts.value.length,
      starred: starredContacts.value.length,
    }
  })

  /**
   * 是否有联系人
   */
  const hasContacts = computed(() => contacts.value.length > 0)

  /**
   * 是否有当前联系人
   */
  const hasCurrentContact = computed(() => !!currentContact.value)

  // ==================== Actions ====================

  /**
   * 加载联系人列表（快速模式：先从缓存加载）
   */
  async function loadContacts(keyword?: string) {
    try {
      loading.value = true
      error.value = null
      appStore.setLoading('contacts', true)

      // 先尝试从缓存加载
      const cachedCount = await db.getContactCount()
      if (cachedCount > 0 && !keyword) {
        const cached = await db.getAllContacts()
        contacts.value = cached
        totalContacts.value = cached.length

        if (appStore.isDebug) {
          console.log('📦 从缓存加载联系人', { count: cached.length })
        }
      }

      // 从 API 加载
      const result = await contactAPI.getContacts(keyword ? { keyword } : undefined)
      contacts.value = result
      totalContacts.value = result.length

      // 保存到缓存（仅在无关键词时）
      if (!keyword && result.length > 0) {
        await db.saveContacts(result).catch(err => {
          console.error('保存联系人到缓存失败:', err)
        })
      }

      if (appStore.isDebug) {
        console.log('👥 Contacts loaded', {
          count: result.length,
          keyword: keyword || 'all',
        })
      }

      return result
    } catch (err) {
      // 如果 API 失败，尝试使用缓存
      if (!keyword) {
        const cached = await db.getAllContacts().catch(() => [])
        if (cached.length > 0) {
          contacts.value = cached
          totalContacts.value = cached.length
          console.warn('⚠️ API 失败，使用缓存数据')
          return cached
        }
      }

      error.value = err as Error
      appStore.setError(err as Error)
      throw err
    } finally {
      loading.value = false
      appStore.setLoading('contacts', false)
    }
  }

  /**
   * 后台逐步加载联系人（分批加载，不阻塞 UI）
   */
  async function loadContactsInBackground(options?: {
    batchSize?: number
    batchDelay?: number
    useCache?: boolean
  }) {
    // 如果已经在后台加载，先停止
    if (backgroundLoader) {
      backgroundLoader.cancel()
    }

    const batchSize = options?.batchSize || 500
    const batchDelay = options?.batchDelay || 100
    const useCache = options?.useCache ?? true

    // 先从缓存快速加载（如果启用）
    if (useCache) {
      const cached = await db.getAllContacts().catch(() => [])
      if (cached.length > 0) {
        contacts.value = cached
        totalContacts.value = cached.length

        if (appStore.isDebug) {
          console.log('📦 从缓存快速加载联系人', { count: cached.length })
        }
      }
    }

    // 创建后台加载器
    backgroundLoader = createBackgroundLoader<Contact>({
      batchSize,
      batchDelay,
      useIdleCallback: true,
      loadFn: async (offset, limit) => {
        // 调用 API 分页加载
        const result = await contactAPI.getContacts({
          limit,
          offset
        })
        return result
      },
      onBatchLoaded: async (batch, progress) => {
        // 合并到现有列表（去重）
        const existingIds = new Set(contacts.value.map(c => c.wxid))
        const newContacts = batch.filter(c => !existingIds.has(c.wxid))

        if (newContacts.length > 0) {
          contacts.value = [...contacts.value, ...newContacts]
          totalContacts.value = contacts.value.length

          // 保存到缓存
          await db.saveContacts(newContacts).catch(err => {
            console.error('保存批次到缓存失败:', err)
          })
        }

        // 更新进度
        loadProgress.value = progress

        if (appStore.isDebug) {
          console.log('📥 后台加载批次', {
            batchSize: batch.length,
            loaded: progress.loaded,
            percentage: progress.percentage.toFixed(1) + '%',
          })
        }
      },
      onCompleted: (items) => {
        isBackgroundLoading.value = false
        loadProgress.value = null

        if (appStore.isDebug) {
          console.log('✅ 后台加载完成', {
            total: items.length,
            time: (Date.now() - (backgroundLoader?.getState().running ? 0 : 0)) + 'ms'
          })
        }
      },
      onError: (err) => {
        isBackgroundLoading.value = false
        error.value = err
        console.error('❌ 后台加载失败:', err)
      },
      onProgress: (progress) => {
        loadProgress.value = progress
      }
    })

    try {
      isBackgroundLoading.value = true
      await backgroundLoader.start()
    } catch (err) {
      isBackgroundLoading.value = false
      console.error('后台加载联系人失败:', err)
      throw err
    }
  }

  /**
   * 暂停后台加载
   */
  function pauseBackgroundLoading() {
    if (backgroundLoader) {
      backgroundLoader.pause()
    }
  }

  /**
   * 恢复后台加载
   */
  function resumeBackgroundLoading() {
    if (backgroundLoader) {
      backgroundLoader.resume()
    }
  }

  /**
   * 取消后台加载
   */
  function cancelBackgroundLoading() {
    if (backgroundLoader) {
      backgroundLoader.cancel()
      isBackgroundLoading.value = false
      loadProgress.value = null
    }
  }

  /**
   * 刷新联系人列表
   */
  async function refreshContacts() {
    await loadContacts()
  }

  /**
   * 加载好友列表
   */
  async function loadFriends() {
    await loadContacts()
    // 返回前端过滤后的好友列表
    return friends.value
  }

  /**
   * 加载群聊列表
   */
  async function loadChatrooms() {
    await loadContacts()
    // 返回前端过滤后的群聊列表
    return chatrooms.value
  }

  /**
   * 加载公众号列表
   */
  async function loadOfficialAccounts() {
    await loadContacts()
    // 返回前端过滤后的公众号列表
    return officialAccounts.value
  }

  /**
   * 获取联系人详情
   */
  async function getContactDetail(wxid: string) {
    try {
      // 先尝试从缓存获取
      const cached = await db.getContact(wxid)
      if (cached) {
        // 更新到内存列表
        const index = contacts.value.findIndex(c => c.wxid === wxid)
        if (index !== -1) {
          contacts.value[index] = cached
        } else {
          contacts.value.push(cached)
        }
      }

      // 从 API 获取最新数据
      const contact = await contactAPI.getContactDetail(wxid)

      // 更新或添加到列表
      const index = contacts.value.findIndex(c => c.wxid === wxid)
      if (index !== -1) {
        contacts.value[index] = contact
      } else {
        contacts.value.push(contact)
      }

      // 保存到缓存
      await db.saveContact(contact).catch(err => {
        console.error('保存联系人到缓存失败:', err)
      })

      return contact
    } catch (err) {
      // API 失败时，返回缓存数据
      const cached = await db.getContact(wxid).catch(() => null)
      if (cached) {
        console.warn('⚠️ API 失败，使用缓存数据:', wxid)
        return cached
      }

      error.value = err as Error
      throw err
    }
  }

  /**
   * 选择联系人
   */
  async function selectContact(wxid: string) {
    currentContactId.value = wxid

    // 如果联系人不在列表中，获取详情
    if (!contacts.value.find(c => c.wxid === wxid)) {
      await getContactDetail(wxid)
    }
  }

  /**
   * 设置筛选类型
   */
  function setFilterType(type: 'all' | 'friend' | 'chatroom' | 'official') {
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
  function setSortBy(sort: 'name' | 'time') {
    sortBy.value = sort
  }

  /**
   * 切换首字母索引显示
   */
  function toggleLetterIndex() {
    showLetterIndex.value = !showLetterIndex.value
  }

  /**
   * 搜索联系人
   */
  async function searchContacts(keyword: string) {
    try {
      loading.value = true
      const result = await contactAPI.searchContacts(keyword)
      return result
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 星标联系人
   */
  function starContact(wxid: string) {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (contact) {
      contact.isStarred = true
    }
  }

  /**
   * 取消星标
   */
  function unstarContact(wxid: string) {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (contact) {
      contact.isStarred = false
    }
  }

  /**
   * 切换星标状态
   */
  function toggleStarContact(wxid: string) {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (contact) {
      contact.isStarred = !contact.isStarred
    }
  }

  /**
   * 更新联系人信息
   */
  function updateContact(wxid: string, updates: Partial<Contact>) {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (contact) {
      Object.assign(contact, updates)
    }
  }

  /**
   * 删除联系人（本地）
   */
  function deleteContact(wxid: string) {
    const index = contacts.value.findIndex(c => c.wxid === wxid)
    if (index !== -1) {
      contacts.value.splice(index, 1)
    }

    // 如果删除的是当前联系人，清除选择
    if (currentContactId.value === wxid) {
      currentContactId.value = ''
    }
  }

  /**
   * 批量添加联系人（本地）
   */
  function addContacts(newContacts: Contact[]) {
    // 去重：只添加不存在的联系人
    const existingIds = new Set(contacts.value.map(c => c.wxid))
    const uniqueContacts = newContacts.filter(c => !existingIds.has(c.wxid))

    if (uniqueContacts.length > 0) {
      contacts.value.push(...uniqueContacts)
      totalContacts.value = contacts.value.length
    }

    return uniqueContacts.length
  }

  /**
   * 获取联系人显示名称（优先使用缓存）
   */
  async function getContactDisplayName(wxid: string): Promise<string> {
    // 先从内存查找
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (contact) {
      return contactAPI.getDisplayName(contact)
    }

    // 从缓存查找
    const cached = await db.getContact(wxid).catch(() => null)
    if (cached) {
      return contactAPI.getDisplayName(cached)
    }

    // 返回 wxid
    return wxid
  }

  /**
   * 同步获取联系人显示名称（仅内存）
   */
  function getContactDisplayNameSync(wxid: string): string {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (!contact) return wxid
    return contactAPI.getDisplayName(contact)
  }

  /**
   * 获取联系人头像
   */
  function getContactAvatar(wxid: string): string {
    const contact = contacts.value.find(c => c.wxid === wxid)
    if (!contact || !contact.avatar) return ''
    return contact.avatar
  }

  /**
   * 获取群成员列表
   */
  async function getChatroomMembers(chatroomId: string) {
    try {
      loading.value = true
      const members = await contactAPI.getChatroomMembers(chatroomId)
      return members
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量获取联系人详情
   */
  async function getBatchContactDetails(wxids: string[]) {
    try {
      loading.value = true

      // 先从缓存获取
      const cachedMap = await db.getContacts(wxids).catch(() => new Map())
      const needFetch: string[] = []

      wxids.forEach(wxid => {
        const cached = cachedMap.get(wxid)
        if (cached) {
          // 合并缓存数据到内存
          const index = contacts.value.findIndex(c => c.wxid === wxid)
          if (index !== -1) {
            contacts.value[index] = cached
          } else {
            contacts.value.push(cached)
          }
        } else {
          needFetch.push(wxid)
        }
      })

      // 从 API 获取未缓存的数据
      let result: Contact[] = []
      if (needFetch.length > 0) {
        result = await contactAPI.getBatchContactDetails(needFetch)

        // 合并到列表并保存到缓存
        result.forEach(contact => {
          const index = contacts.value.findIndex(c => c.wxid === contact.wxid)
          if (index !== -1) {
            contacts.value[index] = contact
          } else {
            contacts.value.push(contact)
          }
        })

        // 批量保存到缓存
        if (result.length > 0) {
          await db.saveContacts(result).catch(err => {
            console.error('批量保存联系人到缓存失败:', err)
          })
        }
      }

      // 返回所有联系人（缓存 + 新获取）
      return contacts.value.filter(c => wxids.includes(c.wxid))
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取首字母
   */
  function getFirstLetter(name: string): string {
    if (!name) return '#'

    const firstChar = name.charAt(0).toUpperCase()

    // 如果是英文字母
    if (/[A-Z]/.test(firstChar)) {
      return firstChar
    }

    // 中文转拼音首字母（简单实现，实际可能需要拼音库）
    const code = firstChar.charCodeAt(0)
    if (code >= 0x4e00 && code <= 0x9fa5) {
      // 中文字符范围，简单映射到 A-Z
      // 实际应该使用拼音库如 pinyin-pro
      return getPinyinFirstLetter(firstChar)
    }

    // 其他字符归类到 #
    return '#'
  }

  /**
   * 获取中文拼音首字母（简化版）
   */
  function getPinyinFirstLetter(char: string): string {
    // 这是一个简化的实现，实际项目中应该使用专业的拼音库
    // 这里只做示例，返回基于 Unicode 的粗略映射
    const code = char.charCodeAt(0)

    if (code >= 0x4e00 && code <= 0x9fa5) {
      // 简单的 Unicode 范围映射
      const offset = code - 0x4e00
      const letterIndex = Math.floor(offset / ((0x9fa5 - 0x4e00) / 26))
      return String.fromCharCode(65 + Math.min(letterIndex, 25))
    }

    return '#'
  }

  /**
   * 跳转到指定首字母
   */
  function jumpToLetter(letter: string) {
    const element = document.getElementById(`contact-letter-${letter}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
   * 清除缓存
   */
  async function clearCache() {
    try {
      await db.clearContacts()
      console.log('🗑️ 联系人缓存已清空')
    } catch (err) {
      console.error('清空缓存失败:', err)
    }
  }

  /**
   * 重置状态
   */
  function $reset() {
    contacts.value = []
    currentContactId.value = ''
    totalContacts.value = 0
    filterType.value = 'all'
    searchKeyword.value = ''
    sortBy.value = 'name'
    showLetterIndex.value = true
    loading.value = false
    error.value = null
  }

  // ==================== Return ====================

  return {
    // State
    contacts,
    currentContactId,
    totalContacts,
    filterType,
    searchKeyword,
    sortBy,
    showLetterIndex,
    loading,
    error,
    loadProgress,
    isBackgroundLoading,

    // Getters
    currentContact,
    filteredContacts,
    friends,
    chatrooms,
    officialAccounts,
    starredContacts,
    contactsByLetter,
    letterIndexList,
    contactStats,
    hasContacts,
    hasCurrentContact,

    // Actions
    loadContacts,
    loadContactsInBackground,
    pauseBackgroundLoading,
    resumeBackgroundLoading,
    cancelBackgroundLoading,
    refreshContacts,
    loadFriends,
    loadChatrooms,
    loadOfficialAccounts,
    getContactDetail,
    selectContact,
    setFilterType,
    setSearchKeyword,
    setSortBy,
    toggleLetterIndex,
    searchContacts,
    starContact,
    unstarContact,
    toggleStarContact,
    updateContact,
    deleteContact,
    addContacts,
    getContactDisplayName,
    getContactDisplayNameSync,
    getContactAvatar,
    getChatroomMembers,
    getBatchContactDetails,
    getFirstLetter,
    jumpToLetter,
    clearSearch,
    clearFilter,
    clearError,
    clearCache,
    $reset,
  }
})
