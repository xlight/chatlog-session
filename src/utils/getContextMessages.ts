import { useChatMessagesStore } from '@/stores/chatMessages'
import { chatlogAPI } from '@/api/chatlog'
import type { Message } from '@/types/message'

/**
 * 获取指定会话的最近消息上下文（用于 AI 分析）：
 * 1. 优先从 chatMessagesStore 的 messages 读取
 * 2. Fallback 到 chatlogAPI.getMessages()
 */
export async function getContextMessages(
  sessionId: string,
  limit: number = 50,
): Promise<Message[]> {
  if (!sessionId) return []

  const store = useChatMessagesStore()

  // 优先从 Store 读取（当前加载的会话可能匹配）
  if (store.messages.length > 0) {
    const storeMessages = store.messages.slice(-limit)
    if (storeMessages.length > 0) {
      return storeMessages
    }
  }

  // Fallback 到 API
  try {
    const response = await chatlogAPI.getMessages(sessionId, {
      limit,
      offset: 0,
    })
    return response.messages ?? []
  } catch {
    return []
  }
}
