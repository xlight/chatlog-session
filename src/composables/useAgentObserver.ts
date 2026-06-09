/**
 * Agent Observer 组合函数
 *
 * 监控指定会话的聊天消息变化，根据 per-session 配置周期性触发 AI 旁观分析。
 * 调用方通过 start()/stop() 控制生命周期。
 */
import { watch, ref, computed, toRef, type Ref } from 'vue'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { chatStream } from '@/api/llm'
import { sendmsgAPI } from '@/api/sendmsg'
import { getContextMessages } from '@/utils/getContextMessages'
import type { ObserverResult, SessionAgentConfig } from '@/types/ai/agent'
import type { ChatMessage } from '@/types/ai'
import type { Message } from '@/types/message'

const MAX_CONTEXT_MESSAGES = 50

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `observer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function extractSection(text: string, sectionName: string): string | null {
  const regex = new RegExp(`【${sectionName}】\\s*\\n?([\\s\\S]*?)(?=【|$)`)
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

function extractList(text: string, sectionName: string): string[] {
  const section = extractSection(text, sectionName)
  if (!section) return []
  return section
    .split('\n')
    .map((line) => line.replace(/^[-*•·]\s*/, '').trim())
    .filter((line) => line.length > 0)
}

function parseAnalysisResult(
  raw: string,
  sessionId: string,
  messageCount: number,
): ObserverResult {
  const summary = extractSection(raw, '摘要') || raw.slice(0, 200)
  const keyPoints = extractList(raw, '关键点')
  const suggestions = extractList(raw, '建议回复')

  return {
    id: generateId(),
    sessionId,
    status: 'success',
    summary,
    keyPoints,
    suggestions,
    analyzedAt: Date.now(),
    messageCount,
  }
}

function isRealMessage(msg: Message): boolean {
  return msg.type !== 99999 && msg.type !== 99998
}

const MESSAGE_TYPE_LABELS: Record<number, string> = {
  1: '文本',
  3: '图片',
  34: '语音',
  42: '名片',
  43: '视频',
  47: '表情',
  48: '位置',
  49: '文件',
  50: '语音通话',
  10000: '系统消息',
}

function formatMessageForPrompt(msg: Message): string {
  const timeStr =
    typeof msg.time === 'string'
      ? msg.time
      : new Date(msg.createTime * 1000).toLocaleTimeString('zh-CN')
  const sender = msg.senderName || msg.sender || '未知'
  const label = MESSAGE_TYPE_LABELS[msg.type]
  const content = msg.type === 1 ? msg.content : label ? `[${label}]` : `[消息类型${msg.type}]`
  return `[${timeStr}] ${sender}: ${content}`
}

function buildAnalysisPrompt(messages: Message[]): string {
  const chatLog = messages.map(formatMessageForPrompt).join('\n')
  return (
    '请分析以下聊天记录摘要，列出关键讨论点和建议回复：\n\n' +
    `${chatLog}\n\n` +
    '请按以下格式输出：\n' +
    '【摘要】\n[整体讨论概述]\n\n' +
    '【关键点】\n- [关键点1]\n- [关键点2]\n...\n\n' +
    '【建议回复】\n- [建议回复1]\n- [建议回复2]\n...'
  )
}

/**
 * 构建回复生成 prompt
 * 使用已获取的上下文消息 + 分析结果，指示 AI 生成自然回复
 */
function buildReplyPrompt(messages: Message[], result: ObserverResult): string {
  const chatLog = messages.map(formatMessageForPrompt).join('\n')
  return (
    '基于以下聊天记录和分析结果，生成一条自然的回复消息（只说回复内容本身，不要加任何前缀或说明）：\n\n' +
    `聊天记录：\n${chatLog}\n\n` +
    `分析摘要：${result.summary}\n` +
    `关键点：${result.keyPoints.join('、')}\n\n` +
    '请生成一条简短、自然的回复消息：'
  )
}

/**
 * AI 生成回复并存入草稿
 */
async function generateAndSendReply(
  currentSid: string,
  messages: Message[],
  result: ObserverResult,
  config: SessionAgentConfig,
  agentStore: ReturnType<typeof useAIAgentStore>,
): Promise<void> {
  if (config.sendPermission === 'forbidden') return

  const replyPrompt = buildReplyPrompt(messages, result)
  const llmMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        '你是一个聊天助手，根据对话上下文生成一条自然的回复消息。输出使用中文。只回复内容本身，不要加任何前缀说明。',
    },
    { role: 'user', content: replyPrompt },
  ]

  let replyContent = ''
  try {
    for await (const chunk of chatStream({ messages: llmMessages, model: config.model })) {
      replyContent += chunk.choices?.[0]?.delta?.content || ''
    }
  } catch {
    return
  }

  if (!replyContent.trim()) return

  const sessionStore = useSessionStore()
  const session = sessionStore.sessions.find((s) => s.id === currentSid)
  const sessionName = session?.name ?? session?.talkerName ?? currentSid
  const lastRealMessage = [...messages].reverse().find((m) => !m.isSelf)
  const contactName =
    lastRealMessage?.talkerName || lastRealMessage?.senderName || session?.talkerName || ''

  const trimmedContent = replyContent.trim()

  if (config.sendPermission === 'draft_confirm') {
    agentStore.addDraft({
      sourceMessageId: result.id,
      sessionId: currentSid,
      sessionName,
      contactName,
      content: trimmedContent,
      generatedAt: Date.now(),
    })
  } else if (config.sendPermission === 'auto') {
    const tracker = agentStore.getAutoReplyTracker(currentSid)
    if (config.cooldownMs > 0 && tracker.lastAt && Date.now() - tracker.lastAt < config.cooldownMs) {
      return
    }
    try {
      const result = await sendmsgAPI.send(contactName, trimmedContent)
      if (result.ok) {
        agentStore.incrementAutoReplyTracker(currentSid)
        if (result.message_id !== undefined) {
          agentStore.addSendingStatus({
            draftId: result.id,
            messageId: result.message_id,
            contactName,
            contentPreview: trimmedContent.slice(0, 50),
            status: 'sending',
          })
        }
      } else {
        // 发送失败，降级为草稿
        agentStore.addDraft({
          sourceMessageId: result.id,
          sessionId: currentSid,
          sessionName,
          contactName,
          content: trimmedContent,
          generatedAt: Date.now(),
        })
      }
    } catch {
      // 发送异常，降级为草稿
      agentStore.addDraft({
        sourceMessageId: result.id,
        sessionId: currentSid,
        sessionName,
        contactName,
        content: trimmedContent,
        generatedAt: Date.now(),
      })
    }
  }
}

export function useAgentObserver(sessionId: string | Ref<string>) {
  const agentStore = useAIAgentStore()
  const chatMessagesStore = useChatMessagesStore()

  const sid = toRef(sessionId)
  const isObserving = ref(false)
  const localError = ref<string | null>(null)

  const latestResult = computed<ObserverResult | null>(() => {
    const state = agentStore.getObserverState(sid.value)
    return state.lastResult ?? null
  })

  // ==================== 内部状态 ====================

  let previousMessageCount = 0
  let analysisInProgress = false
  let stopMessagesWatch: (() => void) | null = null
  let stopTalkerWatch: (() => void) | null = null

  // ==================== 内部函数 ====================

  async function triggerAnalysis(): Promise<void> {
    const currentSid = sid.value
    const config = agentStore.getEffectiveConfig(currentSid)

    if (!config.observer.enabled) return

    const state = agentStore.getObserverState(currentSid)

    if (state.accumulatedMessageCount < config.observer.minNewMessages) return

    const elapsed = Date.now() - state.lastAnalysisTime
    if (state.lastAnalysisTime > 0 && elapsed < config.observer.intervalSeconds * 1000) return

    if (state.isAnalyzing || analysisInProgress) return

    analysisInProgress = true
    agentStore.updateObserverState(currentSid, { isAnalyzing: true, error: undefined })
    localError.value = null

    try {
      const allMessages = await getContextMessages(currentSid, MAX_CONTEXT_MESSAGES)
      const messages = allMessages.filter(isRealMessage)

      if (messages.length === 0) {
        agentStore.updateObserverState(currentSid, {
          isAnalyzing: false,
          accumulatedMessageCount: 0,
        })
        return
      }

      const prompt = buildAnalysisPrompt(messages)
      const llmMessages: ChatMessage[] = [
        {
          role: 'system',
          content:
            '你是一个聊天分析助手，帮助用户理解群聊或私聊内容，提取关键信息并提供回复建议。输出使用中文。',
        },
        { role: 'user', content: prompt },
      ]

      let content = ''
      for await (const chunk of chatStream({ messages: llmMessages, model: config.model })) {
        content += chunk.choices?.[0]?.delta?.content || ''
      }

      const result = parseAnalysisResult(content, currentSid, messages.length)
      agentStore.addObserverResult(currentSid, result)
      agentStore.updateObserverState(currentSid, {
        lastAnalysisTime: Date.now(),
        accumulatedMessageCount: 0,
        isAnalyzing: false,
        error: undefined,
        lastResult: result,
      })

      // 分析成功 → 检查 autoReply
      if (config.observer.autoReply && result.suggestions.length > 0) {
        await generateAndSendReply(currentSid, messages, result, config, agentStore)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      localError.value = errMsg
      agentStore.updateObserverState(currentSid, {
        isAnalyzing: false,
        error: errMsg,
      })
    } finally {
      analysisInProgress = false
    }
  }

  function handleMessagesChange(): void {
    if (chatMessagesStore.currentTalker !== sid.value) return

    const currentCount = chatMessagesStore.messages.length
    const delta = currentCount - previousMessageCount

    if (delta > 0) {
      const state = agentStore.getObserverState(sid.value)
      agentStore.updateObserverState(sid.value, {
        accumulatedMessageCount: state.accumulatedMessageCount + delta,
      })
      previousMessageCount = currentCount
      triggerAnalysis()
    } else if (delta < 0) {
      previousMessageCount = currentCount
    }
  }

  // ==================== 公开 API ====================

  function start(): void {
    if (isObserving.value) return
    isObserving.value = true

    if (chatMessagesStore.currentTalker === sid.value) {
      previousMessageCount = chatMessagesStore.messages.length
    }

    agentStore.getObserverState(sid.value)

    stopTalkerWatch = watch(
      () => chatMessagesStore.currentTalker,
      (newTalker) => {
        if (newTalker === sid.value) {
          previousMessageCount = chatMessagesStore.messages.length
        }
      },
    )

    stopMessagesWatch = watch(
      () => chatMessagesStore.messages.length,
      () => handleMessagesChange(),
    )
  }

  function stop(): void {
    isObserving.value = false
    stopTalkerWatch?.()
    stopMessagesWatch?.()
    stopTalkerWatch = null
    stopMessagesWatch = null
    previousMessageCount = 0
    analysisInProgress = false
  }

  return { isObserving, latestResult, error: localError, start, stop }
}
