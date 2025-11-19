/**
 * 聊天记录 API
 * 对应后端 /api/v1/chatlog 相关接口
 */

import { request } from '@/utils/request'
import type { Message, MessageResponse } from '@/types/message'
import type { ChatlogParams, SearchParams, PaginatedResponse } from '@/types/api'

/**
 * 将后端返回的消息数据转换为前端使用的 Message 格式
 */
function transformMessage(response: MessageResponse): Message {
  // 将 ISO 8601 时间字符串转换为 Unix 时间戳（秒）
  const createTime = Math.floor(new Date(response.time).getTime() / 1000)
  
  // 生成消息 ID（使用 seq 作为 ID）
  const id = response.seq
  
  return {
    id,
    seq: response.seq,
    time: response.time,
    createTime,
    talker: response.talker,
    talkerName: response.talkerName,
    talkerAvatar: undefined,
    sender: response.sender,
    senderName: response.senderName,
    isSelf: response.isSelf,
    isSend: response.isSelf ? 1 : 0,
    isChatRoom: response.isChatRoom,
    type: response.type,
    subType: response.subType,
    content: response.content,
    contents: response.contents,
    // 根据 contents 设置对应的 URL 和文件信息
    fileName: response.contents?.title,
    fileUrl: response.contents?.url,
  }
}

/**
 * 批量转换消息数据
 */
function transformMessages(responses: MessageResponse[]): Message[] {
  return responses.map(transformMessage)
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取今天的日期字符串
 */
function getToday(): string {
  return formatDate(new Date())
}

/**
 * 获取日期范围字符串
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 格式：YYYY-MM-DD~YYYY-MM-DD
 */
function getDateRange(startDate: Date, endDate: Date): string {
  return `${formatDate(startDate)}~${formatDate(endDate)}`
}

/**
 * 聊天记录 API 类
 */
class ChatlogAPI {
  /**
   * 获取聊天记录
   * GET /api/v1/chatlog
   * 
   * @param params 查询参数
   * @returns 消息列表
   */
  async getChatlog(params: ChatlogParams): Promise<Message[]> {
    const responses = await request.get<MessageResponse[]>('/api/v1/chatlog', params)
    return transformMessages(responses)
  }

  /**
   * 搜索消息
   * GET /api/v1/chatlog/search
   * 
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchMessages(params: SearchParams): Promise<PaginatedResponse<Message>> {
    const response = await request.get<PaginatedResponse<MessageResponse>>('/api/v1/chatlog/search', params)
    return {
      ...response,
      items: transformMessages(response.items),
    }
  }

  /**
   * 导出聊天记录（JSON 格式）
   * GET /api/v1/chatlog?format=json
   * 
   * @param params 查询参数
   * @returns JSON 格式的聊天记录
   */
  async exportJSON(params: ChatlogParams): Promise<Message[]> {
    const responses = await request.get<MessageResponse[]>('/api/v1/chatlog', {
      ...params,
      format: 'json',
    })
    return transformMessages(responses)
  }

  /**
   * 导出聊天记录（CSV 格式）
   * GET /api/v1/chatlog?format=csv
   * 
   * @param params 查询参数
   * @param filename 保存的文件名
   */
  exportCSV(params: ChatlogParams, filename = 'chatlog.csv'): Promise<void> {
    const queryParams = new URLSearchParams({
      ...params,
      format: 'csv',
    } as any)
    return request.download(`/api/v1/chatlog?${queryParams.toString()}`, filename)
  }

  /**
   * 导出聊天记录（纯文本格式）
   * GET /api/v1/chatlog?format=text
   * 
   * @param params 查询参数
   * @param filename 保存的文件名
   */
  exportText(params: ChatlogParams, filename = 'chatlog.txt'): Promise<void> {
    const queryParams = new URLSearchParams({
      ...params,
      format: 'text',
    } as any)
    return request.download(`/api/v1/chatlog?${queryParams.toString()}`, filename)
  }

  /**
   * 获取指定会话的消息
   * 
   * @param talker 会话 ID（talker）
   * @param time 时间参数，格式：YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD，默认今天
   * @param limit 返回数量
   * @param offset 偏移量
   * @returns 消息列表
   */
  getSessionMessages(talker: string, time?: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.getChatlog({
      talker,
      time: time || getToday(),
      limit,
      offset,
    })
  }

  /**
   * 获取指定时间段的消息
   * 
   * @param time 时间参数，格式：YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 消息列表
   */
  getMessagesByTime(time: string, talker?: string, limit = 50): Promise<Message[]> {
    return this.getChatlog({
      time,
      talker,
      limit,
    })
  }

  /**
   * 获取指定发送者的消息
   * 
   * @param sender 发送者 ID
   * @param time 时间参数，格式：YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD，默认今天
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 消息列表
   */
  getMessagesBySender(sender: string, time?: string, talker?: string, limit = 50): Promise<Message[]> {
    return this.getChatlog({
      sender,
      time: time || getToday(),
      talker,
      limit,
    })
  }

  /**
   * 获取今天的聊天记录
   * 
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 消息列表
   */
  getTodayMessages(talker?: string, limit = 50): Promise<Message[]> {
    return this.getChatlog({
      time: getToday(),
      talker,
      limit,
    })
  }

  /**
   * 获取最近N天的聊天记录
   * 
   * @param days 天数
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 消息列表
   */
  getRecentMessages(days: number, talker?: string, limit = 50): Promise<Message[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return this.getChatlog({
      time: getDateRange(startDate, endDate),
      talker,
      limit,
    })
  }

  /**
   * 获取指定日期范围的聊天记录
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 消息列表
   */
  getMessagesByDateRange(startDate: Date, endDate: Date, talker?: string, limit = 50): Promise<Message[]> {
    return this.getChatlog({
      time: getDateRange(startDate, endDate),
      talker,
      limit,
    })
  }

  /**
   * 搜索指定会话内的消息
   * 
   * @param keyword 搜索关键词
   * @param talker 会话 ID
   * @param limit 返回数量
   * @returns 搜索结果
   */
  searchInSession(keyword: string, talker: string, limit = 50): Promise<PaginatedResponse<Message>> {
    return this.searchMessages({
      keyword,
      talker,
      limit,
    })
  }

  /**
   * 全局搜索消息
   * 
   * @param keyword 搜索关键词
   * @param type 消息类型（可选）
   * @param limit 返回数量
   * @returns 搜索结果
   */
  globalSearch(keyword: string, type?: number, limit = 50): Promise<PaginatedResponse<Message>> {
    return this.searchMessages({
      keyword,
      type,
      limit,
    })
  }

  /**
   * 按消息类型搜索
   * 
   * @param type 消息类型
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 搜索结果
   */
  searchByType(type: number, talker?: string, limit = 50): Promise<PaginatedResponse<Message>> {
    return this.searchMessages({
      keyword: '',
      type,
      talker,
      limit,
    })
  }
}

/**
 * 导出单例
 */
export const chatlogAPI = new ChatlogAPI()

/**
 * 默认导出
 */
export default chatlogAPI