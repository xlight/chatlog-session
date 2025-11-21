/**
 * 群聊管理 Store
 * 使用 IndexedDB 缓存群聊数据
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chatroom } from '@/types/contact'
import { chatroomAPI } from '@/api/chatroom'
import { db } from '@/utils/db'

export const useChatroomStore = defineStore('chatroom', () => {
  // ========== State ==========
  const chatrooms = ref<Chatroom[]>([])
  const currentChatroomId = ref<string>('')
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // ========== Getters ==========
  
  /**
   * 当前群聊
   */
  const currentChatroom = computed(() => {
    return chatrooms.value.find(c => c.chatroomId === currentChatroomId.value) || null
  })

  /**
   * 群聊总数
   */
  const totalChatrooms = computed(() => chatrooms.value.length)

  /**
   * 是否有群聊数据
   */
  const hasChatrooms = computed(() => chatrooms.value.length > 0)

  /**
   * 群聊 Map（便于快速查找）
   */
  const chatroomMap = computed(() => {
    const map = new Map<string, Chatroom>()
    chatrooms.value.forEach(chatroom => {
      map.set(chatroom.chatroomId, chatroom)
    })
    return map
  })

  // ========== Actions ==========

  /**
   * 加载群聊列表
   * @param useCache 是否使用缓存
   */
  async function loadChatrooms(useCache = true): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // 如果使用缓存，先从 IndexedDB 加载
      if (useCache) {
        const cached = await db.getAllChatrooms()
        if (cached && cached.length > 0) {
          chatrooms.value = cached
          console.log(`✅ 从缓存加载 ${cached.length} 个群聊`)
        }
      }

      // 从 API 加载最新数据
      const result = await chatroomAPI.getChatrooms(undefined, useCache)
      chatrooms.value = result

      console.log(`✅ 加载 ${result.length} 个群聊`)
    } catch (err) {
      console.error('加载群聊失败:', err)
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新群聊列表（强制从 API 加载）
   */
  async function refreshChatrooms(): Promise<void> {
    return loadChatrooms(false)
  }

  /**
   * 获取群聊详情
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   */
  async function getChatroomDetail(
    chatroomId: string,
    useCache = true
  ): Promise<Chatroom | null> {
    try {
      // 先从内存中查找
      const existing = chatroomMap.value.get(chatroomId)
      if (existing && useCache) {
        return existing
      }

      // 从 API 获取
      const chatroom = await chatroomAPI.getChatroomDetail(chatroomId, useCache)

      if (chatroom) {
        // 更新到列表中
        const index = chatrooms.value.findIndex(c => c.chatroomId === chatroomId)
        if (index >= 0) {
          chatrooms.value[index] = chatroom
        } else {
          chatrooms.value.push(chatroom)
        }
      }

      return chatroom
    } catch (err) {
      console.error('获取群聊详情失败:', chatroomId, err)
      throw err
    }
  }

  /**
   * 选择群聊
   * @param chatroomId 群聊 ID
   */
  function selectChatroom(chatroomId: string): void {
    currentChatroomId.value = chatroomId
  }

  /**
   * 获取群聊成员数量
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   */
  async function getChatroomMemberCount(
    chatroomId: string,
    useCache = true
  ): Promise<number> {
    try {
      // 先从内存中查找
      const existing = chatroomMap.value.get(chatroomId)
      if (existing && useCache) {
        return existing.memberCount
      }

      // 从 API 获取
      return await chatroomAPI.getChatroomMemberCount(chatroomId, useCache)
    } catch (err) {
      console.error('获取群聊成员数量失败:', chatroomId, err)
      return 0
    }
  }

  /**
   * 获取群聊成员列表
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   */
  async function getChatroomMembers(chatroomId: string, useCache = true) {
    try {
      return await chatroomAPI.getChatroomMembers(chatroomId, useCache)
    } catch (err) {
      console.error('获取群聊成员失败:', chatroomId, err)
      return []
    }
  }

  /**
   * 搜索群聊
   * @param keyword 搜索关键词
   * @param useCache 是否使用缓存
   */
  async function searchChatrooms(keyword: string, useCache = true): Promise<Chatroom[]> {
    try {
      loading.value = true
      error.value = null

      const result = await chatroomAPI.searchChatrooms(keyword, useCache)
      return result
    } catch (err) {
      console.error('搜索群聊失败:', keyword, err)
      error.value = err as Error
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量获取群聊详情
   * @param chatroomIds 群聊 ID 列表
   * @param useCache 是否使用缓存
   */
  async function getBatchChatroomDetails(
    chatroomIds: string[],
    useCache = true
  ): Promise<Map<string, Chatroom>> {
    try {
      return await chatroomAPI.getBatchChatroomDetails(chatroomIds, useCache)
    } catch (err) {
      console.error('批量获取群聊详情失败:', err)
      return new Map()
    }
  }

  /**
   * 获取群聊显示名称
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   */
  async function getChatroomDisplayName(
    chatroomId: string,
    useCache = true
  ): Promise<string> {
    try {
      // 先从内存中查找
      const existing = chatroomMap.value.get(chatroomId)
      if (existing && useCache) {
        return chatroomAPI.getDisplayName(existing)
      }

      // 从 API 获取
      const chatroom = await getChatroomDetail(chatroomId, useCache)
      if (chatroom) {
        return chatroomAPI.getDisplayName(chatroom)
      }

      return chatroomId
    } catch (err) {
      console.error('获取群聊显示名称失败:', chatroomId, err)
      return chatroomId
    }
  }

  /**
   * 同步获取群聊显示名称（仅从内存）
   * @param chatroomId 群聊 ID
   */
  function getChatroomDisplayNameSync(chatroomId: string): string {
    const chatroom = chatroomMap.value.get(chatroomId)
    return chatroom ? chatroomAPI.getDisplayName(chatroom) : chatroomId
  }

  /**
   * 更新群聊信息
   * @param chatroom 群聊对象
   */
  function updateChatroom(chatroom: Chatroom): void {
    const index = chatrooms.value.findIndex(c => c.chatroomId === chatroom.chatroomId)
    if (index >= 0) {
      chatrooms.value[index] = chatroom
    } else {
      chatrooms.value.push(chatroom)
    }

    // 同步到 IndexedDB
    db.saveChatroom(chatroom).catch(err => {
      console.error('保存群聊到缓存失败:', err)
    })
  }

  /**
   * 删除群聊
   * @param chatroomId 群聊 ID
   */
  async function deleteChatroom(chatroomId: string): Promise<void> {
    const index = chatrooms.value.findIndex(c => c.chatroomId === chatroomId)
    if (index >= 0) {
      chatrooms.value.splice(index, 1)
    }

    // 从 IndexedDB 删除
    await db.deleteChatroom(chatroomId).catch(err => {
      console.error('从缓存删除群聊失败:', err)
    })
  }

  /**
   * 清除所有群聊
   */
  async function clearChatrooms(): Promise<void> {
    chatrooms.value = []
    currentChatroomId.value = ''

    // 清除 IndexedDB
    await db.clearChatrooms().catch(err => {
      console.error('清除群聊缓存失败:', err)
    })
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * 获取缓存统计信息
   */
  async function getCacheStats() {
    try {
      return await chatroomAPI.getCacheStats()
    } catch (err) {
      console.error('获取缓存统计失败:', err)
      return {
        total: 0,
        hasCache: false,
      }
    }
  }

  /**
   * 重置 store
   */
  function $reset(): void {
    chatrooms.value = []
    currentChatroomId.value = ''
    loading.value = false
    error.value = null
  }

  return {
    // State
    chatrooms,
    currentChatroomId,
    loading,
    error,

    // Getters
    currentChatroom,
    totalChatrooms,
    hasChatrooms,
    chatroomMap,

    // Actions
    loadChatrooms,
    refreshChatrooms,
    getChatroomDetail,
    selectChatroom,
    getChatroomMemberCount,
    getChatroomMembers,
    searchChatrooms,
    getBatchChatroomDetails,
    getChatroomDisplayName,
    getChatroomDisplayNameSync,
    updateChatroom,
    deleteChatroom,
    clearChatrooms,
    clearError,
    getCacheStats,
    $reset,
  }
})