/**
 * 会话管理 API
 * 对应后端 /api/v1/session 相关接口
 */

import { request } from '@/utils/request'
import { BaseAPI } from './base'
import type { Session, SessionApiResponse } from '@/types/session'
import type { SessionParams } from '@/types/api'

/**
 * 会话列表响应
 */
export interface SessionListResponse {
  items: Session[]
  total: number
}

/**
 * 将后端会话数据转换为前端 Session 类型
 */
function transformSession(apiData: SessionApiResponse): Session {
  // 判断是否是群聊（userName 包含 @chatroom）
  const isChatRoom = apiData.userName.endsWith('@chatroom')
  const isOfficialAccount = apiData.userName.startsWith('gh_')
  const isHolder =
    apiData.userName.includes('@placeholder_foldgroup') ||
    apiData.userName.includes('brandsessionholder') ||
    apiData.userName.includes('brandservicesessionholder') //"userName": "@placeholder_foldgroup",  "userName": "brandsessionholder", "userName": "brandservicesessionholder",
  const isPrivate = !isChatRoom && !isOfficialAccount && !isHolder

  let session_type: 'group' | 'private' | 'official' | 'unknown' = 'unknown'
  if (isChatRoom) {
    session_type = 'group'
  } else if (isPrivate) {
    session_type = 'private'
  } else if (isOfficialAccount) {
    session_type = 'official'
  } else {
    session_type = 'unknown'
  }

  return {
    id: apiData.userName,
    talker: apiData.userName,
    talkerName: apiData.nickName || apiData.userName,
    name: getSessionName(apiData, session_type),
    avatar: apiData.avatarUrl || '',
    remark: '',
    type: session_type,
    lastMessage:
      apiData.content || apiData.nickName
        ? {
            nickName: apiData.nickName,
            content: apiData.content,
            createTime: new Date(apiData.nTime).getTime(),
            type: 1, // 默认为文本消息
          }
        : undefined,
    lastTime: apiData.nTime,
    lastMessageType: 1,
    unreadCount: apiData.nUnReadCount || 0,
    // isPinned/isMinimized 后端 session 不返回，由 store 层 enrichSessionsFromContacts 从 contact 数据合并（stores/session.ts:109）
    isPinned: false,
    isMinimized: false,
    isChatRoom: isChatRoom,
    messageCount: 0, // 后端未返回消息总数
  }

  function getSessionName(apiData: SessionApiResponse, session_type: Session['type']): string {
    // 处理特殊占位符会话
    if (apiData.userName.includes('@placeholder_foldgroup')) {
      return '【折叠群聊】'
    }
    if (apiData.userName === 'brandsessionholder') {
      return '【公众号】'
    }
    if (apiData.userName === 'brandservicesessionholder') {
      return '服务号'
    }

    // 根据会话类型处理名称
    switch (session_type) {
      case 'group':
        return apiData.nickName || apiData.userName
      case 'official':
        return apiData.nickName || `公众号(${apiData.userName})`
      case 'private':
        return apiData.nickName || apiData.userName
      default:
        return apiData.nickName || apiData.userName
    }
  }
}

/**
 * 会话 API 类
 */
class SessionAPI extends BaseAPI<SessionApiResponse, Session> {
  protected resourcePath = 'session'

  protected transform = transformSession

  /**
   * 获取会话列表
   * GET /api/v1/session
   *
   * @param params 查询参数
   * @returns 会话列表和总数
   */
  async getSessions(params?: SessionParams): Promise<SessionListResponse> {
    const response = await request.get<unknown>(this.resourceUrl, params)
    const { items, total } = this.normalizeItemsWithTotal(response)
    return { items: this.transformAll(items), total }
  }

  /**
   * 获取会话详情
   * 后端无 /api/v1/session/:talker 路由（404），改用 keyword 精确搜索（后端 `=` 匹配）+ userName 匹配
   *
   * @param talker 会话 ID
   * @returns 会话详情，未命中返回 null
   */
  async getSessionDetail(talker: string): Promise<Session | null> {
    const { items } = await this.getSessions({ keyword: talker, limit: 0 })
    return items.find(s => s.talker === talker) || null
  }

  /**
   * 获取所有会话（分页）
   *
   * @param limit 返回数量
   * @param offset 偏移量
   * @returns 会话列表
   */
  async getAllSessions(limit = 50, offset = 0): Promise<Session[]> {
    const { items } = await this.getSessions({ limit, offset })
    return items
  }

  /**
   * 按类型获取会话
   * 后端 /session 无 type 参数（忽略）：拉全量后按 transform 的 type 前端过滤
   *
   * @param type 会话类型（private: 私聊, group: 群聊, official: 公众号, unknown: 其他）
   * @param limit 返回数量（0 表示不限制）
   * @returns 会话列表
   */
  async getSessionsByType(
    type: 'private' | 'group' | 'official' | 'unknown',
    limit = 50
  ): Promise<Session[]> {
    const { items } = await this.getSessions({ limit: 0 })
    const filtered = items.filter(s => s.type === type)
    return limit > 0 ? filtered.slice(0, limit) : filtered
  }

  /**
   * 获取私聊会话列表
   *
   * @param limit 返回数量
   * @returns 私聊会话列表
   */
  getPrivateSessions(limit = 50): Promise<Session[]> {
    return this.getSessionsByType('private', limit)
  }

  /**
   * 获取群聊会话列表
   *
   * @param limit 返回数量
   * @returns 群聊会话列表
   */
  getGroupSessions(limit = 50): Promise<Session[]> {
    return this.getSessionsByType('group', limit)
  }

  /**
   * 获取置顶会话（全量拉取后过滤 isPinned）
   *
   * @returns 置顶会话列表
   */
  async getPinnedSessions(): Promise<Session[]> {
    const { items } = await this.getSessions({ limit: 0 })
    return items.filter(session => session.isPinned)
  }

  /**
   * 获取活跃会话
   * （根据最后消息时间排序）
   *
   * @param limit 返回数量
   * @returns 活跃会话列表
   */
  async getActiveSessions(limit = 20): Promise<Session[]> {
    const { items } = await this.getSessions({ limit })
    return items.sort((a, b) => {
      const timeA = a.lastMessage?.createTime || 0
      const timeB = b.lastMessage?.createTime || 0
      return timeB - timeA
    })
  }

  /**
   * 搜索会话（全量拉取后前端过滤）
   *
   * @param keyword 搜索关键词（会话名称或备注）
   * @returns 搜索结果
   */
  async searchSessions(keyword: string): Promise<Session[]> {
    const { items } = await this.getSessions({ limit: 0 })
    const lowerKeyword = keyword.toLowerCase()

    return items.filter(session => {
      const name = (session.name || '').toLowerCase()
      const remark = (session.remark || '').toLowerCase()
      return name.includes(lowerKeyword) || remark.includes(lowerKeyword)
    })
  }

  /**
   * 获取未读会话（全量拉取后过滤）
   *
   * @returns 有未读消息的会话列表
   */
  async getUnreadSessions(): Promise<Session[]> {
    const { items } = await this.getSessions({ limit: 0 })
    return items.filter(session => (session.unreadCount || 0) > 0)
  }

  /**
   * 获取会话统计信息
   *
   * @returns 统计信息
   */
  async getSessionStats(): Promise<{
    total: number
    private: number
    group: number
    unread: number
    pinned: number
  }> {
    const { items, total } = await this.getSessions({ limit: 0 })

    return {
      total: total,
      private: items.filter(s => s.type === 'private').length,
      group: items.filter(s => s.type === 'group').length,
      unread: items.filter(s => (s.unreadCount || 0) > 0).length,
      pinned: items.filter(s => s.isPinned).length,
    }
  }

  /**
   * 批量获取会话详情（单个未命中过滤，不阻断整体）
   *
   * @param talkers 会话 ID 列表
   * @returns 会话详情列表
   */
  async getBatchSessionDetails(talkers: string[]): Promise<Session[]> {
    const promises = talkers.map(talker => this.getSessionDetail(talker).catch(() => null))
    const sessions = await request.all<Session | null>(promises)
    return sessions.filter((s): s is Session => s !== null)
  }
}

/**
 * 导出单例
 */
export const sessionAPI = new SessionAPI()

/**
 * 默认导出
 */
export default sessionAPI
