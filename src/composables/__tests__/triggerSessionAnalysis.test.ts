import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Message } from '@/types/message'

vi.mock('@/api/llm', () => ({
  chatStream: vi.fn(),
}))

vi.mock('@/api/sendmsg', () => ({
  sendmsgAPI: { send: vi.fn() },
  // useSendQueue 依赖 getStageLabel（agentSendQueue 被 triggerSessionAnalysis 间接加载）
  getStageLabel: vi.fn(() => 'sending'),
}))

vi.mock('@/utils/getContextMessages', () => ({
  getContextMessages: vi.fn(),
}))

import { chatStream } from '@/api/llm'
import { sendmsgAPI } from '@/api/sendmsg'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useAIPromptStore } from '@/stores/ai/prompt'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { triggerSessionAnalysis } from '@/composables/triggerSessionAnalysis'
import { getContextMessages } from '@/utils/getContextMessages'
import type { Session } from '@/types/session'

function makeMessage(overrides: Partial<Message> & { id: number; createTime: number; isSelf: boolean }): Message {
  return {
    seq: overrides.id,
    time: new Date(overrides.createTime * 1000).toISOString(),
    talker: 'talker',
    talkerName: 'talker',
    sender: 'sender',
    senderName: 'sender',
    isSend: overrides.isSelf ? 1 : 0,
    isChatRoom: false,
    type: 1,
    subType: 0,
    content: 'hello',
    ...overrides,
  }
}

function mockChatStream(responseText: string) {
  const chunks = [
    { choices: [{ delta: { content: responseText } }] },
  ]
  ;(chatStream as ReturnType<typeof vi.fn>).mockImplementation(async function* () {
    for (const chunk of chunks) yield chunk
  })
}

function freshStore() {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAIAgentStore(pinia)
  // 开启全局总闸（默认 ai.enabled=false，测试聚焦 Observer 行为本身）
  useSettingsStore(pinia).setAiEnabled(true, { acknowledged: true })
  return store
}

const ANALYSIS_RESPONSE = '【摘要】\n讨论了项目进度\n\n【关键点】\n- 进度正常\n\n【建议回复】\n- 继续加油'

describe('triggerSessionAnalysis incremental autoReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatStream(ANALYSIS_RESPONSE)
  })

  it('增量全部自消息时跳过 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: false }),
      makeMessage({ id: 3, createTime: 1001, isSelf: true }),
      makeMessage({ id: 4, createTime: 1002, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts).toHaveLength(0)
  })

  it('增量包含他人消息时触发 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: false }),
      makeMessage({ id: 3, createTime: 1001, isSelf: true }),
      makeMessage({ id: 4, createTime: 1002, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('定时 tick 触发也生成草稿（后台与前台行为一致）', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true, isTimerTick: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('冷启动时允许 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('分析完成后 lastAnalysisTime 记录被分析消息的 max(createTime)', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1005, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const state = store.getObserverState('s1')
    expect(state.lastAnalysisTime).toBe(1005)
    expect(state.lastAnalysisAt).toBeGreaterThan(0)
  })

  it('分析完成后更新 lastAnalyzedMessageIds', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })

    const messages = [
      makeMessage({ id: 10, createTime: 1000, isSelf: false }),
      makeMessage({ id: 20, createTime: 1001, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const state = store.getObserverState('s1')
    expect(state.lastAnalyzedMessageIds).toBeDefined()
    expect(state.lastAnalyzedMessageIds!.has(10)).toBe(true)
    expect(state.lastAnalyzedMessageIds!.has(20)).toBe(true)
  })

  it('同秒内消息通过 lastAnalyzedMessageIds 精确区分', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: true }),
      makeMessage({ id: 3, createTime: 1000, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })
})

describe('triggerSessionAnalysis 回复语义与增量（fix-ai-observer）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatStream(ANALYSIS_RESPONSE)
  })

  function mockSendOk() {
    ;(sendmsgAPI.send as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, message_id: 123 })
  }

  it('L2（draft_confirm）分析后生成草稿，不直接发送', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
    expect(sendmsgAPI.send).not.toHaveBeenCalled()
  })

  it('L3（auto + autoReply false）降级生成草稿，不直接发送', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
    expect(sendmsgAPI.send).not.toHaveBeenCalled()
  })

  it('L4（auto + autoReply true）后台 tick 自动发送', async () => {
    mockSendOk()
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
      cooldownMs: 0,
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true, isTimerTick: true })

    expect(sendmsgAPI.send).toHaveBeenCalled()
    expect(store.drafts).toHaveLength(0)
  })

  it('发送失败时回退草稿', async () => {
    ;(sendmsgAPI.send as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
      cooldownMs: 0,
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('maxAutoReplies 达到上限后停止直接发送', async () => {
    mockSendOk()
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
      maxAutoReplies: 1,
      cooldownMs: 0,
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ])
    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })
    expect(sendmsgAPI.send).toHaveBeenCalledTimes(1)

    // 第二次分析（新游标之后的新消息）→ maxAutoReplies 已达上限，停止发送
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
      makeMessage({ id: 3, createTime: 1002, isSelf: false }),
    ])
    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })
    expect(sendmsgAPI.send).toHaveBeenCalledTimes(1)
  })

  it('autoReplyCount 限制单次分析的回复生成次数（草稿模式）', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 2, maxContextMessages: 20 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(2)
  })

  it('ObserverResult 元数据记录增量消息', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
      makeMessage({ id: 3, createTime: 1002, isSelf: true }),
      makeMessage({ id: 4, createTime: 1003, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const results = store.observerResults.get('s1') ?? []
    expect(results).toHaveLength(1)
    expect(results[0].messageCount).toBe(3)
    expect(results[0].startTime).toBe(1001)
    expect(results[0].endTime).toBe(1003)
  })

  it('增量消息为空（非冷启动）时跳过 LLM 调用并重置累计计数', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })
    store.updateObserverState('s1', {
      lastAnalysisTime: 1000,
      lastAnalyzedMessageIds: new Set([1, 2]),
      accumulatedMessageCount: 8,
    })

    // 窗口内所有消息均在游标内（无新消息）
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(chatStream).not.toHaveBeenCalled()
    const state = store.getObserverState('s1')
    expect(state.accumulatedMessageCount).toBe(0)
    expect(state.lastAnalysisTime).toBe(1000) // 游标不推进
  })

  it('冷启动时增量等于全量消息（元数据与输入一致）', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
      makeMessage({ id: 3, createTime: 1002, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const results = store.observerResults.get('s1') ?? []
    expect(results[0].messageCount).toBe(3)
  })

  it('冷却检查基于 lastAnalysisAt（完成时刻）而非消息时间', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 300, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })
    // 消息时间远早于完成时刻：lastAnalysisTime 很旧，但 lastAnalysisAt 是刚刚
    store.updateObserverState('s1', {
      lastAnalysisTime: 3600,
      lastAnalyzedMessageIds: new Set([1]),
      lastAnalysisAt: Date.now(),
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 3600, isSelf: false }),
      makeMessage({ id: 2, createTime: 3700, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(chatStream).not.toHaveBeenCalled()
  })

  it('窗口截断边界：游标推进后早期消息不补分析', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    // 窗口 50 条全部为增量（createTime 1001-1050）
    const window = Array.from({ length: 50 }, (_, i) =>
      makeMessage({ id: i + 2, createTime: 1001 + i, isSelf: false })
    )
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(window)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })
    expect(chatStream).toHaveBeenCalledTimes(1)

    // 第二次传入相同窗口（游标已推进到 1050）→ 增量空 → 跳过，不重复分析
    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })
    expect(chatStream).toHaveBeenCalledTimes(1)
    const state = store.getObserverState('s1')
    expect(state.accumulatedMessageCount).toBe(0)
  })

  it('分析 system prompt 使用 observer-analyze 模板', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      promptTemplateId: 'observer-analyze',
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const systemContent = (chatStream as ReturnType<typeof vi.fn>).mock.calls[0][0].messages[0].content
    expect(systemContent).toContain('聊天分析助手')
  })

  it('非分析类模板（builtin-reply）回退默认分析角色', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      promptTemplateId: 'builtin-reply',
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const systemContent = (chatStream as ReturnType<typeof vi.fn>).mock.calls[0][0].messages[0].content
    expect(systemContent).toBe('你是一个聊天分析助手，帮助用户理解群聊或私聊内容，提取关键信息并提供回复建议。输出使用中文。')
    expect(systemContent).not.toContain('帮我回复')
  })

  it('模板缺失时回退默认分析角色', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      promptTemplateId: 'nonexistent-template',
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const systemContent = (chatStream as ReturnType<typeof vi.fn>).mock.calls[0][0].messages[0].content
    expect(systemContent).toContain('聊天分析助手')
  })

  it('自定义分析模板替换 {sessionName}，未支持变量按字面保留', async () => {
    const store = freshStore()
    const promptStore = useAIPromptStore()
    promptStore.addCustomPrompt({
      id: 'custom-analyze-x',
      name: '自定义分析',
      description: '',
      category: 'custom',
      content: '自定义分析角色 {sessionName} {content}',
      variables: [],
      tags: [],
    })
    // 注入会话以便 {sessionName} 替换
    const sessionStore = useSessionStore()
    sessionStore.sessions.push({
      id: 's1',
      name: '测试群',
      talker: 's1',
      talkerName: '测试群',
      isChatRoom: true,
      type: 'group',
    } as Session)
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      promptTemplateId: 'custom-analyze-x',
    })

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const systemContent = (chatStream as ReturnType<typeof vi.fn>).mock.calls[0][0].messages[0].content
    expect(systemContent).toContain('自定义分析角色')
    expect(systemContent).toContain('测试群')
    expect(systemContent).not.toContain('{sessionName}')
    expect(systemContent).toContain('{content}') // 未支持变量按字面保留
  })

  it('全局总闸关闭（ai.enabled=false）时不执行分析', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1, maxContextMessages: 20 },
      sendPermission: 'auto',
    })
    // 关闭全局总闸
    useSettingsStore().setAiEnabled(false)

    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ])

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    // 不调用 chatStream、不产生草稿/发送
    expect(chatStream as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(store.drafts).toHaveLength(0)
  })
})
