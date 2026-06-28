import { ref, watch, type Ref } from 'vue'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { chatStream } from '@/api/llm'
import { sendmsgAPI } from '@/api/sendmsg'
import { getContextMessages } from '@/utils/getContextMessages'
import type { ChatMessage } from '@/types/ai'
import type { KeywordResult, SessionAgentConfig } from '@/types/ai/agent'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function generateKeywordReply(
  _sessionId: string,
  messages: ReturnType<typeof getContextMessages> extends Promise<infer T> ? T : never,
  keywordResult: KeywordResult,
  config: SessionAgentConfig,
): Promise<string | null> {
  const contextText = messages
    .map((m) => `[${m.isSelf ? '我' : m.talkerName || m.talker}] ${m.content}`)
    .join('\n')

  const prompt = `检测到关键词「${keywordResult.matchedPattern}」，请基于以下对话上下文生成一条自然的回复消息（只说回复内容本身，不要加任何前缀或说明）：

对话上下文：
${contextText}

分析摘要：${keywordResult.summary}

请生成一条简短、自然的回复消息：`

  const llmMessages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个聊天助手，根据对话上下文和关键词匹配生成一条自然的回复消息。输出使用中文。只回复内容本身，不要加任何前缀说明。',
    },
    { role: 'user', content: prompt },
  ]

  let replyContent = ''
  try {
    for await (const chunk of chatStream({ messages: llmMessages, model: config.model })) {
      replyContent += chunk.choices?.[0]?.delta?.content || ''
    }
  } catch {
    return null
  }

  return replyContent.trim() || null
}

/**
 * Keyword Monitor composable — 监听新消息，匹配关键词，触发 AI 分析
 */
export function useKeywordMonitor(sessionId: string | Ref<string>) {
  const agentStore = useAIAgentStore()
  const chatMessagesStore = useChatMessagesStore()
  const sid = typeof sessionId === 'string' ? ref(sessionId) : sessionId

  const isMonitoring = ref(false)
  const results = ref<KeywordResult[]>([])
  let processedIds = new Set<number>()
  let watcher: (() => void) | null = null

  function getMatchPatterns(): string[] {
    const config = agentStore.getEffectiveConfig(sid.value)
    if (!config.keywordMonitor.enabled) return []
    return config.keywordMonitor.matchPatterns
  }

  function isAlreadyProcessed(messageId: number): boolean {
    return processedIds.has(messageId)
  }

  async function handleMatch(
    _messageContent: string,
    messageId: number,
    matchedPattern: string,
  ): Promise<void> {
    const currentSid = sid.value
    const config = agentStore.getEffectiveConfig(currentSid)
    try {
      const contextMessages = await getContextMessages(currentSid, 20)

      const contextText = contextMessages
        .map((m) => `[${m.isSelf ? '我' : m.talkerName || m.talker}] ${m.content}`)
        .join('\n')

      const prompt = `检测到关键词「${matchedPattern}」，请分析以下对话上下文并生成回复建议：

对话上下文：
${contextText}

请提供：
1. 上下文分析摘要
2. 建议的回复内容`

      let fullContent = ''
      const stream = chatStream({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      })

      for await (const chunk of stream) {
        fullContent += chunk.choices[0]?.delta?.content || ''
      }

      // 提取回复建议（关键词后第一段非空内容，或「建议回复」后的内容）
      const lines = fullContent.split('\n').filter(Boolean)
      const summary = lines[0] || '无分析结果'
      const replyIdx = lines.findIndex(
        (l) => l.includes('回复') || l.includes('建议'),
      )
      const replySuggestion =
        replyIdx >= 0 && replyIdx + 1 < lines.length
          ? lines.slice(replyIdx + 1).join('\n').trim()
          : undefined

      const result: KeywordResult = {
        id: generateId(),
        sessionId: currentSid,
        sourceMessageId: String(messageId),
        matchedPattern,
        status: 'success',
        summary,
        replySuggestion,
        analyzedAt: Date.now(),
      }

      agentStore.addKeywordResult(currentSid, result)
      results.value = results.value.concat(result)

      if (config.sendPermission !== 'forbidden') {
        const replyContent = await generateKeywordReply(currentSid, contextMessages, result, config)
        if (!replyContent) return

        const sessionStore = useSessionStore()
        const session = sessionStore.sessions.find((s) => s.id === currentSid)
        const sessionName = session?.name ?? session?.talkerName ?? currentSid
        const lastRealMessage = [...contextMessages].reverse().find((m) => !m.isSelf)
        const contactName =
          lastRealMessage?.talkerName || lastRealMessage?.senderName || session?.talkerName || ''

        if (config.sendPermission === 'draft_confirm') {
          agentStore.addDraft({
            sourceMessageId: result.id,
            sessionId: currentSid,
            sessionName,
            contactName,
            content: replyContent,
            generatedAt: Date.now(),
          })
        } else if (config.sendPermission === 'auto') {
          const tracker = agentStore.getAutoReplyTracker(currentSid)
          if (config.cooldownMs > 0 && tracker.lastAt && Date.now() - tracker.lastAt < config.cooldownMs) {
            return
          }
          try {
            const sendResult = await sendmsgAPI.send(contactName, replyContent)
            if (sendResult.ok) {
              agentStore.incrementAutoReplyTracker(currentSid)
              if (sendResult.message_id !== undefined) {
                agentStore.addSendingStatus({
                  draftId: result.id,
                  messageId: sendResult.message_id,
                  contactName,
                  contentPreview: replyContent.slice(0, 50),
                  status: 'sending',
                })
              }
            } else {
              agentStore.addDraft({
                sourceMessageId: result.id,
                sessionId: currentSid,
                sessionName,
                contactName,
                content: replyContent,
                generatedAt: Date.now(),
              })
            }
          } catch {
            agentStore.addDraft({
              sourceMessageId: result.id,
              sessionId: currentSid,
              sessionName,
              contactName,
              content: replyContent,
              generatedAt: Date.now(),
            })
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '关键词分析失败'
      const result: KeywordResult = {
        id: generateId(),
        sessionId: currentSid,
        sourceMessageId: String(messageId),
        matchedPattern,
        status: 'error',
        summary: '',
        error: errorMsg,
        analyzedAt: Date.now(),
      }
      agentStore.addKeywordResult(currentSid, result)
      results.value = results.value.concat(result)
    }
  }

  function onNewMessages(): void {
    const patterns = getMatchPatterns()
    if (patterns.length === 0) return

    const messages = chatMessagesStore.messages
    for (const msg of messages) {
      if (!msg.content) continue
      if (msg.isSelf) continue // Skip own messages
      if (isAlreadyProcessed(msg.id)) continue

      processedIds.add(msg.id)

      const matched = patterns.find((p) => msg.content.includes(p))
      if (matched) {
        handleMatch(msg.content, msg.id, matched)
      }
    }
  }

  function start(): void {
    if (isMonitoring.value) return
    isMonitoring.value = true

    // Seed processed IDs with existing messages
    processedIds = new Set(chatMessagesStore.messages.map((m) => m.id))

    watcher = watch(
      () => chatMessagesStore.messages.length,
      () => onNewMessages(),
    )
  }

  function stop(): void {
    if (watcher) {
      watcher()
      watcher = null
    }
    isMonitoring.value = false
  }

  return {
    isMonitoring,
    results,
    start,
    stop,
  }
}
