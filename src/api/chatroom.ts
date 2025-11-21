/**
 * 群聊管理 API
 * 对应后端 /api/v1/chatroom 相关接口
 */

import { request } from '@/utils/request'
import type { Chatroom, ChatroomApiResponse, ChatroomApiItem } from '@/types/contact'
import { db } from '@/utils/db'

/**
 * 转换后端群聊数据到前端格式
 */
function transformChatroom(backendChatroom: ChatroomApiItem): Chatroom {
  return {
    chatroomId: backendChatroom.name,
    name: backendChatroom.nickName || backendChatroom.remark || backendChatroom.name,
    avatar: '', // 后端未返回，使用空字符串
    memberCount: backendChatroom.users?.length || 0,
    owner: backendChatroom.owner,
    members: (backendChatroom.users || []).map(user => ({
      wxid: user.userName,
      nickname: user.displayName || user.userName,
      displayName: user.displayName || '',
    })),
  }
}

/**
 * 群聊 API 类
 */
class ChatroomAPI {
  /**
   * 获取群聊列表
   * GET /api/v1/chatroom?format=json
   *
   * @param keyword 搜索关键词
   * @param useCache 是否使用缓存
   * @returns 群聊列表
   */
  async getChatrooms(keyword?: string, useCache = true): Promise<Chatroom[]> {
    // 如果有关键词，直接从后端搜索（不使用缓存）
    if (keyword) {
      return this.searchChatrooms(keyword, false)
    }

    // 尝试从 IndexedDB 读取
    if (useCache) {
      const cached = await db.getAllChatrooms()
      if (cached && cached.length > 0) {
        return cached
      }
    }

    // 请求后端
    const params: Record<string, string> = {
      format: 'json',
    }

    const response = await request.get<ChatroomApiResponse>('/api/v1/chatroom', params)

    // 转换数据
    const chatrooms = (response.items || []).map(transformChatroom)

    // 保存到 IndexedDB
    if (chatrooms.length > 0) {
      await db.saveChatrooms(chatrooms).catch(err => {
        console.error('保存群聊到 IndexedDB 失败:', err)
      })
    }

    return chatrooms
  }

  /**
   * 获取群聊详情
   * GET /api/v1/chatroom?keyword=xxx&format=json
   *
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   * @returns 群聊详情
   */
  async getChatroomDetail(chatroomId: string, useCache = true): Promise<Chatroom | null> {
    // 尝试从 IndexedDB 读取
    if (useCache) {
      const cached = await db.getChatroom(chatroomId)
      if (cached) {
        return cached
      }
    }

    // 通过 keyword 搜索群聊
    const params: Record<string, string> = {
      keyword: chatroomId,
      format: 'json',
    }

    const response = await request.get<ChatroomApiResponse>('/api/v1/chatroom', params)
    const chatrooms = (response.items || []).map(transformChatroom)
    const chatroom = chatrooms.find(c => c.chatroomId === chatroomId)

    if (chatroom) {
      // 保存到 IndexedDB
      await db.saveChatroom(chatroom).catch(err => {
        console.error('保存群聊到 IndexedDB 失败:', err)
      })
      return chatroom
    }

    return null
  }

  /**
   * 获取群聊成员数量
   *
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   * @returns 成员数量
   */
  async getChatroomMemberCount(chatroomId: string, useCache = true): Promise<number> {
    const chatroom = await this.getChatroomDetail(chatroomId, useCache)
    return chatroom?.memberCount || 0
  }

  /**
   * 获取群聊成员列表
   *
   * @param chatroomId 群聊 ID
   * @param useCache 是否使用缓存
   * @returns 成员列表
   */
  async getChatroomMembers(chatroomId: string, useCache = true) {
    const chatroom = await this.getChatroomDetail(chatroomId, useCache)
    return chatroom?.members || []
  }

  /**
   * 搜索群聊
   *
   * @param keyword 搜索关键词
   * @param useCache 是否使用缓存
   * @returns 搜索结果
   */
  async searchChatrooms(keyword: string, useCache = true): Promise<Chatroom[]> {
    // 如果使用缓存，先从 IndexedDB 搜索
    if (useCache) {
      const cached = await db.searchChatrooms(keyword)
      if (cached && cached.length > 0) {
        return cached
      }
    }

    // 从后端搜索
    const params: Record<string, string> = {
      keyword,
      format: 'json',
    }

    const response = await request.get<ChatroomApiResponse>('/api/v1/chatroom', params)
    const chatrooms = (response.items || []).map(transformChatroom)

    // 保存到 IndexedDB
    if (chatrooms.length > 0) {
      await db.saveChatrooms(chatrooms).catch(err => {
        console.error('保存搜索结果到 IndexedDB 失败:', err)
      })
    }

    return chatrooms
  }

  /**
   * 批量获取群聊详情
   *
   * @param chatroomIds 群聊 ID 列表
   * @param useCache 是否使用缓存
   * @returns 群聊详情列表
   */
  async getBatchChatroomDetails(
    chatroomIds: string[],
    useCache = true
  ): Promise<Map<string, Chatroom>> {
    const result = new Map<string, Chatroom>()

    // 先从 IndexedDB 中读取
    const needFetch: string[] = []
    if (useCache) {
      const cachedMap = await db.getChatrooms(chatroomIds)
      cachedMap.forEach((chatroom, id) => {
        result.set(id, chatroom)
      })
      
      // 找出未命中缓存的 ID
      chatroomIds.forEach(id => {
        if (!result.has(id)) {
          needFetch.push(id)
        }
      })
    } else {
      needFetch.push(...chatroomIds)
    }

    // 如果全部命中缓存，直接返回
    if (needFetch.length === 0) {
      return result
    }

    // 获取所有群聊列表（可能包含需要的群聊）
    const allChatrooms = await this.getChatrooms(undefined, useCache)
    
    // 匹配需要的群聊
    needFetch.forEach(id => {
      const chatroom = allChatrooms.find(c => c.chatroomId === id)
      if (chatroom) {
        result.set(id, chatroom)
      }
    })

    return result
  }

  /**
   * 刷新群聊缓存
   *
   * @param chatroomId 群聊 ID，不传则刷新所有
   */
  async refreshCache(chatroomId?: string): Promise<void> {
    if (chatroomId) {
      // 刷新单个群聊
      await db.deleteChatroom(chatroomId)
      await this.getChatroomDetail(chatroomId, false)
    } else {
      // 刷新所有群聊
      await db.clearChatrooms()
      await this.getChatrooms(undefined, false)
    }
  }

  /**
   * 清除缓存
   *
   * @param chatroomId 群聊 ID，不传则清除所有
   */
  async clearCache(chatroomId?: string): Promise<void> {
    if (chatroomId) {
      await db.deleteChatroom(chatroomId)
    } else {
      await db.clearChatrooms()
    }
  }

  /**
   * 获取群聊显示名称
   *
   * @param chatroom 群聊对象
   * @returns 显示名称
   */
  getDisplayName(chatroom: Chatroom): string {
    return chatroom.name || chatroom.chatroomId
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    total: number
    hasCache: boolean
  }> {
    const total = await db.getChatroomCount()
    return {
      total,
      hasCache: total > 0,
    }
  }
}

/**
 * 导出单例
 */
export const chatroomAPI = new ChatroomAPI()

/**
 * 默认导出
 */
export default chatroomAPI