import { useAIAgentStore } from '@/stores/ai/agent'
import { useAIPromptStore } from '@/stores/ai/prompt'
import { OBSERVER_ANALYZE_TEMPLATE_ID } from '@/stores/ai/prompt'
import { agentSendQueue } from '@/composables/useSendQueue'
import { useSessionStore } from '@/stores/session'
import { chatStream } from '@/api/llm'
import { sendmsgAPI } from '@/api/sendmsg'
import { getContextMessages } from '@/utils/getContextMessages'
import { getMessageSummary } from '@/components/chat/message-types/config'
import type { ObserverResult, SessionAgentConfig, StreamingObserverResult } from '@/types/ai/agent'
import type { ChatMessage } from '@/types/ai'
import type { Message } from '@/types/message'

const DEFAULT_ANALYSIS_SYSTEM_PROMPT =
  '你是一个聊天分析助手，帮助用户理解群聊或私聊内容，提取关键信息并提供回复建议。输出使用中文。'

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

/**
 * 计算增量消息：上次分析游标（lastAnalysisTime / lastAnalyzedMessageIds）之后的消息。
 * 冷启动（无上次游标）时增量等于全部消息。
 */
export function computeIncrementalMessages(
  messages: Message[],
  lastAnalysisTime: number,
  lastAnalyzedMessageIds?: Set<number>,
): { incrementalMessages: Message[]; isColdStart: boolean } {
  const isColdStart = lastAnalysisTime === 0 && !lastAnalyzedMessageIds
  if (isColdStart) return { incrementalMessages: messages, isColdStart }
  const prevLastAnalysisTimeSec =
    lastAnalysisTime > 1e12 ? Math.floor(lastAnalysisTime / 1000) : lastAnalysisTime
  const incrementalMessages = messages.filter(
    (m) =>
      m.createTime > prevLastAnalysisTimeSec ||
      (m.createTime === prevLastAnalysisTimeSec && !lastAnalyzedMessageIds?.has(m.id))
  )
  return { incrementalMessages, isColdStart }
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

/**
 * 构建分析调用的 system prompt：
 * 白名单判定——仅内置分析模板（observer-analyze）或自定义模板（category: custom）生效，
 * 其他内置模板（builtin-reply、topic-analysis 等）与模板缺失一律回退默认分析角色。
 */
function buildAnalysisSystemPrompt(config: SessionAgentConfig): string {
  const templateId = config.promptTemplateId
  if (templateId) {
    const promptStore = useAIPromptStore()
    const template = promptStore.getPromptById(templateId)
    const isAnalysisTemplate =
      template && (template.id === OBSERVER_ANALYZE_TEMPLATE_ID || template.category === 'custom')
    if (isAnalysisTemplate && template) {
      const sessionStore = useSessionStore()
      const session = sessionStore.sessions.find((s) => s.id === config.sessionId)
      const sessionName = session?.name ?? session?.talkerName ?? ''
      const vars: Record<string, string> = {}
      if (sessionName) vars.sessionName = sessionName
      const substituted = promptStore.substituteVariables(template.content, vars)
      if (substituted.trim()) return substituted
    }
  }
  return DEFAULT_ANALYSIS_SYSTEM_PROMPT
}

function buildReplyPrompt(
  messages: Message[],
  result: ObserverResult,
  previousReplies: string[] = [],
): string {
  const chatLog = messages.map(formatMessageForPrompt).join('\n')
  let prompt =
    '基于以下聊天记录和分析结果，生成一条自然的回复消息（只说回复内容本身，不要加任何前缀或说明）：\n\n' +
    `聊天记录：\n${chatLog}\n\n` +
    `分析摘要：${result.summary}\n` +
    `关键点：${result.keyPoints.join('、')}\n\n` +
    '请生成一条简短、自然的回复消息：'
  if (previousReplies.length > 0) {
    prompt +=
      '\n\n已生成过的回复（请生成与它们不同的下一条）：\n' +
      previousReplies.map((r, i) => `${i + 1}. ${r}`).join('\n')
  }
  return prompt
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

  const sessionStore = useSessionStore()
  const session = sessionStore.sessions.find((s) => s.id === currentSid)
  const sessionName = session?.name ?? session?.talkerName ?? currentSid
  const lastRealMessage = [...messages].reverse().find((m) => !m.isSelf)
  const contactName =
    lastRealMessage?.talkerName || lastRealMessage?.senderName || session?.talkerName || ''

  // sendPermission 分流：draft_confirm → 草稿；auto + autoReply: true → 直接发送；auto + autoReply: false → 降级草稿（L3）
  const isDraftMode =
    config.sendPermission === 'draft_confirm' ||
    (config.sendPermission === 'auto' && !config.observer.autoReply)
  const isAutoMode = config.sendPermission === 'auto' && config.observer.autoReply

  // 冷却检查：分析级入口单查一次（约束下一次分析触发的回复），同分析内多条不受 cooldown 拦截
  if (isAutoMode && config.cooldownMs > 0) {
    const tracker = agentStore.getAutoReplyTracker(currentSid)
    if (tracker.lastAt && Date.now() - tracker.lastAt < config.cooldownMs) {
      console.log('[Observer:reply] skip: cooldown', { currentSid, cooldownMs: config.cooldownMs, lastAt: tracker.lastAt, elapsed: Date.now() - tracker.lastAt })
      return
    }
  }

  const maxReplies = config.observer.autoReplyCount > 0 ? config.observer.autoReplyCount : 1
  const generated: string[] = []

  for (let i = 0; i < maxReplies; i++) {
    if (isAutoMode && config.maxAutoReplies > 0) {
      const tracker = agentStore.getAutoReplyTracker(currentSid)
      if (tracker.count >= config.maxAutoReplies) {
        console.log('[Observer:reply] skip: maxAutoReplies', { currentSid, maxAutoReplies: config.maxAutoReplies, count: tracker.count })
        break
      }
    }

    const replyPrompt = buildReplyPrompt(messages, result, generated)
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

    if (!replyContent.trim()) break
    const trimmedContent = replyContent.trim()
    generated.push(trimmedContent)

    if (isDraftMode) {
      console.log('[Observer:reply] addDraft (draft mode)', { currentSid, contactName, contentPreview: trimmedContent.slice(0, 50) })
      agentStore.addDraft({
        sourceMessageId: result.id,
        sessionId: currentSid,
        sessionName,
        contactName,
        content: trimmedContent,
        generatedAt: Date.now(),
      })
    } else if (isAutoMode) {
      console.log('[Observer:reply] sending (auto)', { currentSid, contactName, contentPreview: trimmedContent.slice(0, 50) })
      try {
        const sendResult = await sendmsgAPI.send(contactName, trimmedContent)
        if (sendResult.ok) {
          agentStore.incrementAutoReplyTracker(currentSid)
          if (sendResult.message_id !== undefined) {
            agentSendQueue.addTask({ contactName, content: trimmedContent, contentPreview: trimmedContent.slice(0, 50), messageId: sendResult.message_id, status: 'sending', createdAt: Date.now() })
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

  // 冷却检查：基于 lastAnalysisAt（分析完成时刻），与增量游标 lastAnalysisTime（消息时间）语义分离
  if (state.lastAnalysisAt && Date.now() - state.lastAnalysisAt < config.observer.intervalSeconds * 1000) {
    console.log('[Observer:trigger] skip: cooldown', { sessionId, elapsedSec: Math.floor((Date.now() - state.lastAnalysisAt) / 1000), intervalSec: config.observer.intervalSeconds })
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

    // 增量计算前移：在 prompt 构建前确定本次实际分析的增量消息
    const { incrementalMessages, isColdStart } = computeIncrementalMessages(
      messages,
      state.lastAnalysisTime,
      state.lastAnalyzedMessageIds
    )

    // 增量消息为空（非冷启动）→ 跳过 LLM 调用：重置累计计数、不推进增量游标
    if (!isColdStart && incrementalMessages.length === 0) {
      console.log('[Observer:trigger] skip: no incremental messages', { sessionId })
      agentStore.updateObserverState(sessionId, {
        isAnalyzing: false,
        accumulatedMessageCount: 0,
      })
      return
    }

    const prevResult = state.incrementalContext
    const prompt = buildIncrementalAnalysisPrompt(incrementalMessages, prevResult)
    const llmMessages: ChatMessage[] = [
      {
        role: 'system',
        content: buildAnalysisSystemPrompt(config),
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

    // ObserverResult 元数据基于增量消息（messageCount/startTime/endTime）
    const result = parseAnalysisResult(content, sessionId, incrementalMessages)
    agentStore.addObserverResult(sessionId, result)

    // 游标推进：基于全窗口（已看过的消息全部标记，保证不重不漏）；lastAnalysisTime 记录被分析消息的 max(createTime)
    const lastAnalysisTime = Math.max(...messages.map((m) => m.createTime))
    const lastAnalyzedMessageIds = new Set(messages.map((m) => m.id))
    const lastAnalysisAt = Date.now()
    agentStore.updateObserverState(sessionId, {
      lastAnalysisTime,
      lastAnalyzedMessageIds,
      lastAnalysisAt,
      accumulatedMessageCount: 0,
      isAnalyzing: false,
      error: undefined,
      lastResult: result,
      incrementalContext: result,
    })

    onStream?.({ streamingStatus: 'complete', streamingSummary: result.summary, streamingKeyPoints: result.keyPoints, streamingSuggestions: result.suggestions })
    agentStore.clearStreamingState(sessionId)

    const hasNewNonSelfMessage = incrementalMessages.some((m) => !m.isSelf)

    console.log('[Observer:trigger] analysis done, reply check', {
      sessionId,
      isTimerTick: options?.isTimerTick,
      sendPermission: config.sendPermission,
      autoReply: config.observer.autoReply,
      suggestionsCount: result.suggestions.length,
      isColdStart,
      incrementalCount: incrementalMessages.length,
      hasNewNonSelfMessage,
      lastAnalysisTime,
    })

    // 回复入口：sendPermission !== 'forbidden'（observer.autoReply 仅控制直接发送 vs 草稿）
    if (config.sendPermission !== 'forbidden' && result.suggestions.length > 0 && hasNewNonSelfMessage) {
      await generateAndSendReply(sessionId, incrementalMessages, result, config, agentStore)
    } else {
      console.log('[Observer:trigger] reply skipped', {
        sessionId,
        reason: config.sendPermission === 'forbidden' ? 'sendPermission forbidden' : result.suggestions.length === 0 ? 'no suggestions' : !hasNewNonSelfMessage ? 'no new non-self message' : 'unknown',
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
