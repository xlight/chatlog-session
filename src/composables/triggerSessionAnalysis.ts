import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { chatStream } from '@/api/llm'
import { sendmsgAPI } from '@/api/sendmsg'
import { getContextMessages } from '@/utils/getContextMessages'
import { getMessageSummary } from '@/components/chat/message-types/config'
import type { ObserverResult, SessionAgentConfig, StreamingObserverResult } from '@/types/ai/agent'
import type { ChatMessage } from '@/types/ai'
import type { Message } from '@/types/message'

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
  messages: Message[],
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
    messageCount: messages.length,
    startTime: messages[0]?.createTime,
    endTime: messages[messages.length - 1]?.createTime,
  }
}

function isRealMessage(msg: Message): boolean {
  return msg.type !== 99999 && msg.type !== 99998
}

function formatMessageForPrompt(msg: Message): string {
  const timeStr =
    typeof msg.time === 'string'
      ? msg.time
      : new Date(msg.createTime * 1000).toLocaleTimeString('zh-CN')
  const sender = msg.senderName || msg.sender || '未知'
  const content = getMessageSummary(msg)
  return `[${timeStr}] ${sender}: ${content}`
}

function buildIncrementalAnalysisPrompt(messages: Message[], lastResult?: ObserverResult): string {
  const chatLog = messages.map(formatMessageForPrompt).join('\n')

  if (!lastResult) {
    return (
      '请分析以下聊天记录摘要，列出关键讨论点和建议回复：\n\n' +
      `${chatLog}\n\n` +
      '请按以下格式输出：\n' +
      '【摘要】\n[整体讨论概述]\n\n' +
      '【关键点】\n- [关键点1]\n- [关键点2]\n...\n\n' +
      '【建议回复】\n- [建议回复1]\n- [建议回复2]\n...'
    )
  }

  return (
    '以下是该会话的上次分析结果和最新消息，请基于此进行增量分析，关注最新变化和趋势。\n\n' +
    `上次分析结果：\n` +
    `摘要：${lastResult.summary}\n` +
    `关键点：${lastResult.keyPoints.join('、')}\n` +
    `建议回复：${lastResult.suggestions.join('、')}\n\n` +
    `本次分析的最新消息：\n${chatLog}\n\n` +
    '请按以下格式输出：\n' +
    '【摘要】\n[整体讨论概述，重点关注与上次分析相比的新变化]\n\n' +
    '【关键点】\n- [关键点1]\n- [关键点2]\n...\n\n' +
    '【建议回复】\n- [建议回复1]\n- [建议回复2]\n...'
  )
}

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

async function generateAndSendReply(
  currentSid: string,
  messages: Message[],
  result: ObserverResult,
  config: SessionAgentConfig,
  agentStore: ReturnType<typeof useAIAgentStore>,
): Promise<void> {
  console.log('[Observer:reply] enter generateAndSendReply', { currentSid, sendPermission: config.sendPermission, suggestionsCount: result.suggestions.length })
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
    console.log('[Observer:reply] addDraft (draft_confirm)', { currentSid, contactName, contentPreview: trimmedContent.slice(0, 50) })
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
      console.log('[Observer:reply] skip: cooldown', { currentSid, cooldownMs: config.cooldownMs, lastAt: tracker.lastAt, elapsed: Date.now() - tracker.lastAt })
      return
    }
    console.log('[Observer:reply] sending (auto)', { currentSid, contactName, contentPreview: trimmedContent.slice(0, 50) })
    try {
      const sendResult = await sendmsgAPI.send(contactName, trimmedContent)
      if (sendResult.ok) {
        agentStore.incrementAutoReplyTracker(currentSid)
        if (sendResult.message_id !== undefined) {
          agentStore.addSendingStatus({
            draftId: sendResult.id,
            messageId: sendResult.message_id,
            contactName,
            contentPreview: trimmedContent.slice(0, 50),
            status: 'sending',
          })
        }
      } else {
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

export interface TriggerSessionAnalysisOptions {
  contextMessages?: Message[]
  skipAccumulatedCheck?: boolean
  isTimerTick?: boolean
  /** 流式回调，每次收到有效 chunk 时推送中间结果 */
  onStream?: (partial: Partial<StreamingObserverResult>) => void
}

export async function triggerSessionAnalysis(
  sessionId: string,
  options?: TriggerSessionAnalysisOptions,
): Promise<void> {
  const agentStore = useAIAgentStore()
  const config = agentStore.getEffectiveConfig(sessionId)

  if (!config.observer.enabled) {
    console.log('[Observer:trigger] skip: observer not enabled', { sessionId })
    return
  }

  const state = agentStore.getObserverState(sessionId)

  if (!options?.skipAccumulatedCheck) {
    if (state.accumulatedMessageCount < config.observer.minNewMessages) {
      console.log('[Observer:trigger] skip: accumulated < min', { sessionId, accumulated: state.accumulatedMessageCount, min: config.observer.minNewMessages })
      return
    }
  }

  const lastAnalysisMs = state.lastAnalysisTime > 1e12 ? state.lastAnalysisTime : state.lastAnalysisTime * 1000
  const elapsed = Date.now() - lastAnalysisMs
  if (state.lastAnalysisTime > 0 && elapsed < config.observer.intervalSeconds * 1000) {
    console.log('[Observer:trigger] skip: cooldown', { sessionId, elapsedSec: Math.floor(elapsed / 1000), intervalSec: config.observer.intervalSeconds, lastAnalysisTime: state.lastAnalysisTime })
    return
  }

  if (state.isAnalyzing) {
    console.log('[Observer:trigger] skip: isAnalyzing', { sessionId })
    return
  }

  console.log('[Observer:trigger] start analysis', { sessionId, isTimerTick: options?.isTimerTick, skipAccumulatedCheck: options?.skipAccumulatedCheck })

  agentStore.updateObserverState(sessionId, { isAnalyzing: true, error: undefined })
  agentStore.clearStreamingState(sessionId)

  try {
    const allMessages = options?.contextMessages
      ?? await getContextMessages(sessionId, config.observer.maxContextMessages)
    const messages = allMessages.filter(isRealMessage)

    if (messages.length === 0) {
      agentStore.updateObserverState(sessionId, {
        isAnalyzing: false,
        accumulatedMessageCount: 0,
      })
      return
    }

    const prevResult = state.incrementalContext
    const prompt = buildIncrementalAnalysisPrompt(messages, prevResult)
    const llmMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          '你是一个聊天分析助手，帮助用户理解群聊或私聊内容，提取关键信息并提供回复建议。输出使用中文。',
      },
      { role: 'user', content: prompt },
    ]

    let content = ''
    const onStream = options?.onStream
    onStream?.({ streamingStatus: 'streaming', streamingSummary: '', streamingKeyPoints: [], streamingSuggestions: [] })

    for await (const chunk of chatStream({ messages: llmMessages, model: config.model })) {
      const delta = chunk.choices?.[0]?.delta?.content || ''
      if (!delta) continue
      content += delta

      if (onStream) {
        const partial: Partial<StreamingObserverResult> = {
          streamingStatus: 'streaming',
        }
        const currSummary = extractSection(content, '摘要')
        const currKeyPoints = extractList(content, '关键点')
        const currSuggestions = extractList(content, '建议回复')
        if (currSummary) partial.streamingSummary = currSummary
        if (currKeyPoints.length > 0) partial.streamingKeyPoints = currKeyPoints
        if (currSuggestions.length > 0) partial.streamingSuggestions = currSuggestions
        onStream(partial)
      }
    }

    const result = parseAnalysisResult(content, sessionId, messages)
    agentStore.addObserverResult(sessionId, result)

    const lastAnalysisTime = Math.floor(Date.now() / 1000)
    const lastAnalyzedMessageIds = new Set(messages.map(m => m.id))
    agentStore.updateObserverState(sessionId, {
      lastAnalysisTime,
      lastAnalyzedMessageIds,
      accumulatedMessageCount: 0,
      isAnalyzing: false,
      error: undefined,
      lastResult: result,
      incrementalContext: result,
    })

    onStream?.({ streamingStatus: 'complete', streamingSummary: result.summary, streamingKeyPoints: result.keyPoints, streamingSuggestions: result.suggestions })
    agentStore.clearStreamingState(sessionId)

    const isColdStart = state.lastAnalysisTime === 0 && !state.lastAnalyzedMessageIds
    const prevLastAnalysisTimeSec = state.lastAnalysisTime > 1e12 ? Math.floor(state.lastAnalysisTime / 1000) : state.lastAnalysisTime
    const incrementalMessages = isColdStart
      ? messages
      : messages.filter(m =>
          m.createTime > prevLastAnalysisTimeSec ||
          (m.createTime === prevLastAnalysisTimeSec && !state.lastAnalyzedMessageIds?.has(m.id))
        )
    const hasNewNonSelfMessage = incrementalMessages.some(m => !m.isSelf)

    console.log('[Observer:trigger] analysis done, autoReply check', {
      sessionId,
      isTimerTick: options?.isTimerTick,
      autoReply: config.observer.autoReply,
      suggestionsCount: result.suggestions.length,
      isColdStart,
      incrementalCount: incrementalMessages.length,
      incrementalIsSelf: incrementalMessages.map(m => m.isSelf),
      hasNewNonSelfMessage,
      prevLastAnalysisTime: state.lastAnalysisTime,
      prevLastAnalyzedMessageIds: state.lastAnalyzedMessageIds ? [...state.lastAnalyzedMessageIds] : null,
      messageCreateTimes: messages.map(m => ({ id: m.id, createTime: m.createTime, isSelf: m.isSelf })),
    })

    if (!options?.isTimerTick && config.observer.autoReply && result.suggestions.length > 0 && hasNewNonSelfMessage) {
      await generateAndSendReply(sessionId, messages, result, config, agentStore)
    } else {
      console.log('[Observer:trigger] autoReply skipped', {
        sessionId,
        reason: options?.isTimerTick ? 'isTimerTick' : !config.observer.autoReply ? 'autoReply off' : result.suggestions.length === 0 ? 'no suggestions' : !hasNewNonSelfMessage ? 'no new non-self message' : 'unknown',
      })
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    agentStore.updateObserverState(sessionId, {
      isAnalyzing: false,
      error: errMsg,
    })
    options?.onStream?.({ streamingStatus: 'error' })
    agentStore.clearStreamingState(sessionId)
  }
}
