/**
 * 日记 API
 * GET /api/v1/diary（返回按会话分组的消息数组）
 */

import { request } from '@/utils/request'
import { transformMessage } from '@/api/chatlog'
import type { MessageResponse } from '@/types/message'
import type { DiaryEntry, DiaryParams } from '@/types/diary'

/**
 * 后端原始日记分组（snake_case；messages 复用 model.Message）
 */
interface BackendDiaryEntry {
  talker: string
  talker_name: string
  messages: MessageResponse[]
}

/**
 * 转换后端日记分组到前端格式（snake_case → camelCase，messages 复用 transformMessage）
 */
function transformDiaryEntry(backend: BackendDiaryEntry): DiaryEntry {
  return {
    talker: backend.talker,
    talkerName: backend.talker_name,
    messages: (backend.messages || []).map(transformMessage),
  }
}

/**
 * 日记 API 单例
 */
class DiaryAPI {
  /**
   * 获取日记（按会话分组的消息数组）
   * 显式传 limit 默认 0（不限制，后端默认语义），规避拦截器强制 limit:200 截断当天记录
   */
  async getDiary(params?: DiaryParams): Promise<DiaryEntry[]> {
    const queryParams: Record<string, unknown> = {}
    if (params?.date) {
      queryParams.date = params.date
    }
    if (params?.talker) {
      queryParams.talker = params.talker
    }
    if (params?.keyword) {
      queryParams.keyword = params.keyword
    }
    queryParams.limit = params?.limit ?? 0
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<BackendDiaryEntry[]>('/api/v1/diary', queryParams)
    return (response || []).map(transformDiaryEntry)
  }
}

export const diaryAPI = new DiaryAPI()
export default diaryAPI
