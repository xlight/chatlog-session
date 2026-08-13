/**
 * 日记（Diary）数据类型定义
 * 对应后端 /api/v1/diary（按会话分组的消息数组，非 {items,total} 包装）
 */

import type { Message } from '@/types/message'

/** 单会话日记分组（对齐后端 handler 返回的 {talker, talkerName, messages}） */
export interface DiaryEntry {
  /** 会话标识（wxid/群 ID） */
  talker: string
  /** 会话名 */
  talkerName: string
  /** 该会话的消息列表 */
  messages: Message[]
}

/** 日记查询参数 */
export interface DiaryParams {
  /** 日期（YYYY-MM-DD，单日） */
  date?: string
  /** 会话标识精确过滤 */
  talker?: string
  /** 内容关键词模糊匹配 */
  keyword?: string
  limit?: number
  offset?: number
}
