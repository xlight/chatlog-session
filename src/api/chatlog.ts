/**
 * 聊天记录 API
 * 对应后端 /api/v1/chatlog 相关接口
 */

import { request } from '@/utils/request'
import { BaseAPI } from './base'
import type { Message, MessageResponse } from '@/types/message'
import type { ChatlogParams, SearchParams } from '@/types/api'

/**
 * 将后端返回的消息数据转换为前端使用的 Message 格式
 */
export function transformMessage(response: MessageResponse): Message {
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
 * 提取消息时间戳（毫秒）
 */
function getMessageTimestamp(message: Message): number {
  if (message.time) {
    const timeValue = new Date(message.time).getTime()
    if (!isNaN(timeValue)) {
      return timeValue
    }
  }

  return message.createTime < 10000000000 ? message.createTime * 1000 : message.createTime
}

/**
 * 比较消息顺序（旧 -> 新）
 */
function compareMessageOrder(a: Message, b: Message): number {
  const timeDiff = getMessageTimestamp(a) - getMessageTimestamp(b)
  if (timeDiff !== 0) return timeDiff

  const seqDiff = (a.seq || 0) - (b.seq || 0)
  if (seqDiff !== 0) return seqDiff

  return (a.id || 0) - (b.id || 0)
}

/**
 * 批次归一化为旧 -> 新
 */
function normalizeBatch(messages: Message[]): Message[] {
  if (messages.length < 2) return [...messages]

  const firstTime = getMessageTimestamp(messages[0])
  const lastTime = getMessageTimestamp(messages[messages.length - 1])

  if (firstTime > lastTime) {
    return [...messages].reverse()
  }

  return [...messages]
}

/**
 * 合并两个有序数组（均为旧 -> 新）
 */
function mergeChronological(existing: Message[], incoming: Message[]): Message[] {
  if (!existing.length) return [...incoming]
  if (!incoming.length) return [...existing]

  const merged: Message[] = []
  let i = 0
  let j = 0

  while (i < existing.length && j < incoming.length) {
    if (compareMessageOrder(existing[i], incoming[j]) <= 0) {
      merged.push(existing[i])
      i++
    } else {
      merged.push(incoming[j])
      j++
    }
  }

  while (i < existing.length) {
    merged.push(existing[i])
    i++
  }

  while (j < incoming.length) {
    merged.push(incoming[j])
    j++
  }

  return merged
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
 * 获取最近 N 天的时间范围字符串（格式：YYYY-MM-DD~YYYY-MM-DD），包含今天
 */
function getRecentDateRange(num: number = 7): string {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (num - 1))
  return getDateRange(start, end)
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
class ChatlogAPI extends BaseAPI<MessageResponse, Message> {
  protected resourcePath = 'chatlog'

  protected transform = transformMessage

  /**
   * 获取聊天记录
   * GET /api/v1/chatlog
   *
   * @param params 查询参数
   * @returns 消息列表
   */
  async getChatlog(params: ChatlogParams): Promise<Message[]> {
    const responses = await request.get<MessageResponse[]>(this.resourceUrl, params)
    return transformMessages(responses)
  }

  /**
   * 搜索消息
   * GET /api/v1/chatlog
   *
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchMessages(params: SearchParams): Promise<Message[]> {
    const responses = await request.get<MessageResponse[]>(this.resourceUrl, params)
    return transformMessages(responses)
  }

  /**
   * 导出聊天记录（JSON 格式）
   * GET /api/v1/chatlog?format=json
   *
   * @param params 查询参数
   * @returns JSON 格式的聊天记录
   */
  async exportJSON(params: ChatlogParams): Promise<Message[]> {
    const responses = await request.get<MessageResponse[]>(this.resourceUrl, {
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
   * @param bottom 是否从末尾开始截取，1=从 later time 到 earlier time
   * @returns 消息列表
   */
  getSessionMessages(
    talker: string,
    time?: string,
    limit = 50,
    offset = 0,
    bottom = 0
  ): Promise<Message[]> {
    return this.getChatlog({
      talker,
      time: time || getRecentDateRange(),
      limit,
      offset,
      bottom,
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
  getMessagesBySender(
    sender: string,
    time?: string,
    talker?: string,
    limit = 50
  ): Promise<Message[]> {
    return this.getChatlog({
      sender,
      time: time || getRecentDateRange(),
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
      time: getRecentDateRange(),
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
  getMessagesByDateRange(
    startDate: Date,
    endDate: Date,
    talker?: string,
    limit = 50
  ): Promise<Message[]> {
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
  searchInSession(keyword: string, talker: string, limit = 50): Promise<Message[]> {
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
  globalSearch(keyword: string, type?: number, limit = 50): Promise<Message[]> {
    return this.searchMessages({
      keyword,
      type,
      limit,
    })
  }

  /**
   * 按消息类型搜索
   * 后端 /chatlog 无 type 参数（忽略）：拉取后按结果 type 前端过滤
   *
   * @param type 消息类型
   * @param talker 会话 ID（可选）
   * @param limit 返回数量
   * @returns 搜索结果
   */
  async searchByType(type: number, talker?: string, limit = 50): Promise<Message[]> {
    const messages = await this.searchMessages({
      keyword: '',
      talker,
      limit,
    })
    return messages.filter(m => m.type === type)
  }

  /**
   * 导出聊天记录（带进度回调）
   *
   * @param talker 会话 ID
   * @param time 时间范围，格式：YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD
   * @param options 导出选项
   * @returns 消息列表
   */
  async exportWithProgress(
    talker: string,
    time: string,
    options: {
      onProgress?: (current: number, total: number) => void
      signal?: AbortSignal
    } = {}
  ): Promise<Message[]> {
    const { onProgress, signal } = options
    const pageSize = 500
    const allMessages: Message[] = []
    let offset = 0
    let hasMore = true
    let totalEstimate = 1000 // 初始估计值

    // 首先获取总数估计
    try {
      const firstBatch = await this.getChatlog({
        talker,
        time,
        limit: 1,
        offset: 0,
      })
      // 如果第一批返回空，直接返回
      if (firstBatch.length === 0) {
        return []
      }
    } catch (error) {
      console.error('获取消息总数失败:', error)
    }

    while (hasMore) {
      // 检查是否被取消
      if (signal?.aborted) {
        throw new Error('导出已取消')
      }

      try {
        const messages = await this.getChatlog({
          talker,
          time,
          limit: pageSize,
          offset,
        })

        if (messages.length === 0) {
          hasMore = false
          break
        }

        const normalizedBatch = normalizeBatch(messages)
        allMessages.splice(
          0,
          allMessages.length,
          ...mergeChronological(allMessages, normalizedBatch)
        )
        offset += messages.length

        // 更新进度
        if (onProgress) {
          // 如果返回的数量小于 pageSize，说明是最后一页
          if (messages.length < pageSize) {
            totalEstimate = allMessages.length
          } else {
            // 否则继续估计总数
            totalEstimate = Math.max(totalEstimate, allMessages.length + pageSize)
          }
          onProgress(allMessages.length, totalEstimate)
        }

        // 如果返回的数量小于 pageSize，说明已获取全部
        if (messages.length < pageSize) {
          hasMore = false
        }

        // 添加小延迟避免阻塞
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error) {
        console.error('导出消息失败:', error)
        throw error
      }
    }

    // 最终进度更新
    if (onProgress) {
      onProgress(allMessages.length, allMessages.length)
    }

    return allMessages
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
