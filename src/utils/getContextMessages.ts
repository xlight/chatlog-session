import { useChatMessagesStore } from '@/stores/chatMessages'
import { useMessageCacheStore } from '@/stores/messageCache'
import { chatlogAPI } from '@/api/chatlog'
import type { Message } from '@/types/message'

/**
 * 获取指定会话的最近消息上下文（用于 AI 分析）：
 * 1. 仅当 store.currentTalker === sessionId 时从 store 读取（避免跨 session 数据窜）
 * 2. Fallback 到 chatlogAPI.getSessionMessages()
 */
export async function getContextMessages(
  sessionId: string,
  limit: number = 50,
): Promise<Message[]> {
  if (!sessionId) return []

  const store = useChatMessagesStore()

  // 仅当请求的 sessionId 与当前加载一致时，才从 store 读取
  if (store.currentTalker === sessionId && store.messages.length > 0) {
    const storeMessages = store.messages.slice(-limit)
    if (storeMessages.length > 0) {
      return storeMessages
    }
  }

  // Fallback 到缓存或 API（bottom=1 确保取到最新消息）
  const cacheStore = useMessageCacheStore()
  return cacheStore.getOrFetch(sessionId, () =>
    chatlogAPI.getSessionMessages(sessionId, undefined, limit, 0, 1)
  )
}
