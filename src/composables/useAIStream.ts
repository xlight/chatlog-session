import type { Ref } from 'vue'
import { chatStream, mapError, showAIErrorToast } from '@/api/llm'
import type { AIError, ChatMessage, UsageInfo, ToolCall } from '@/types/ai'
import type { ToolCallRecord, MCPToolPermission } from '@/types/ai/mcp'
import { parseNamespacedName } from '@/types/ai/mcp'
import { useMCPStore } from '@/stores/ai/mcp'

export interface AIStreamStore {
  messages: Ref<ChatMessage[]> | { value: ChatMessage[] }
  addMessage(msg: ChatMessage): void
  updateLastAssistantContent(content: string): void
  appendThinkingContent(delta: string): void
  streaming: Ref<boolean> | { value: boolean }
  setStreaming(val: boolean): void
  setAbortController(ctrl: AbortController | null): void
  abortController: Ref<AbortController | null> | { value: AbortController | null }
  error: Ref<AIError | null> | { value: AIError | null }
  setError(err: AIError | null): void
  thinkingContent: Ref<string> | { value: string }
  thinkingVisible: Ref<boolean> | { value: boolean }
  setThinkingContent(content: string): void
  setThinkingVisible(visible: boolean): void
  finalizeThinking(): void
  setUsage(usage: UsageInfo): void
  setCurrentModel(model: string): void
  ensureMermaidPrompt?(): void
  abortStream?(): void
  removeLastAssistant?(): void
  addToolCallRecord?(record: ToolCallRecord): void
  updateToolCallRecord?(id: string, updates: Partial<ToolCallRecord>): void
}

export interface UseAIStreamOptions {
  getMessages: () => ChatMessage[]
  getModel: () => string
  getAgentConfig?: () => { mcpTools?: MCPToolPermission } | null
  requestToolConfirmation?: (record: ToolCallRecord) => Promise<boolean>
  onComplete?: (content: string) => void
  onError?: (err: AIError) => void
}

function readRef<T>(r: Ref<T> | { value: T }): T {
  return r.value
}

function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useAIStream(store: AIStreamStore, options: UseAIStreamOptions) {
  async function sendMessage(input: string): Promise<void> {
    if (!input.trim()) return

    const userMessage: ChatMessage = { id: generateMessageId(), role: 'user', content: input.trim() }
    store.addMessage(userMessage)

    const assistantId = generateMessageId()
    store.addMessage({ id: assistantId, role: 'assistant', content: '' })

    store.setStreaming(true)
    store.setError(null)
    store.setThinkingContent('')
    store.setThinkingVisible(true)
    store.ensureMermaidPrompt?.()

    const ctrl = new AbortController()
    store.setAbortController(ctrl)

    const model = options.getModel()
    store.setCurrentModel(model)

    const mcpStore = useMCPStore()
    const agentConfig = options.getAgentConfig?.()
    const mcpPermission = agentConfig?.mcpTools

    const openAITools = mcpPermission?.enabled ? mcpStore.openAITools : []

    await streamWithToolLoop({
      model,
      signal: ctrl.signal,
      openAITools,
      mcpPermission,
      loopCount: 0,
    })
  }

  async function streamWithToolLoop(params: {
    model: string
    signal: AbortSignal
    openAITools: Array<{ type: 'function'; function: { name: string; description?: string; parameters: unknown } }>
    mcpPermission?: MCPToolPermission
    loopCount: number
  }): Promise<void> {
    const { model, signal, openAITools, mcpPermission, loopCount } = params
    const mcpStore = useMCPStore()
    const maxLoop = mcpPermission?.maxLoopCount ?? 10

    if (loopCount >= maxLoop) return

    const accumContent: string[] = []
    let rafPending = false

    function scheduleUpdate() {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        store.updateLastAssistantContent(accumContent.join(''))
      })
    }

    const pendingToolCalls: Map<string, { id: string; name: string; arguments: string }> = new Map()

    try {
      const requestArgs: Parameters<typeof chatStream>[0] = {
        messages: options.getMessages(),
        model,
        signal,
      }
      if (openAITools.length > 0) {
        requestArgs.tools = openAITools
      }

      for await (const chunk of chatStream(requestArgs)) {
        const delta = chunk.choices?.[0]?.delta
        const finishReason = chunk.choices?.[0]?.finish_reason

        if (delta?.reasoning_content) {
          store.appendThinkingContent(delta.reasoning_content)
        }

        if (delta?.content) {
          accumContent.push(delta.content)
          scheduleUpdate()
        }

        // Accumulate tool_call deltas
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = pendingToolCalls.get(tc.id ?? '')
            if (existing) {
              if (tc.function?.arguments) existing.arguments += tc.function.arguments
              if (tc.function?.name) existing.name = tc.function.name
            } else if (tc.id) {
              pendingToolCalls.set(tc.id, {
                id: tc.id,
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              })
            }
          }
        }

        if (finishReason === 'stop' || finishReason === 'length') {
          const finalContent = accumContent.join('')
          store.updateLastAssistantContent(finalContent)
          store.finalizeThinking()
          const u = (chunk as unknown as { usage?: UsageInfo | null }).usage
          if (u) {
            store.setUsage(u)
          }
          options.onComplete?.(finalContent)
          break
        }

        if (finishReason === 'tool_calls') {
          // Flush accumulated content first
          const finalContent = accumContent.join('')
          store.updateLastAssistantContent(finalContent)
          store.finalizeThinking()

          // Build the complete tool_calls array for the assistant message
          const toolCalls: ToolCall[] = []
          for (const tc of pendingToolCalls.values()) {
            toolCalls.push({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments || '{}' },
            })
          }

          // Pinia setup store 会 auto-unwrap ref，store.messages 可能直接是数组
          const msgsRaw = store.messages
          const msgs = Array.isArray(msgsRaw) ? msgsRaw : readRef(msgsRaw)
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], tool_calls: toolCalls }
              break
            }
          }

          // Process each tool call
          const toolMessages: ChatMessage[] = []
          for (const tc of toolCalls) {
            const parsed = parseNamespacedName(tc.function.name)
            if (!parsed) {
              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function.name,
                content: JSON.stringify({ error: `Invalid MCP tool name: ${tc.function.name}` }),
              })
              continue
            }

            const { serverId, toolName } = parsed
            const namespacedName = tc.function.name

            // Permission check
            if (!mcpPermission?.enabled || !mcpStore.isToolAllowed(namespacedName, mcpPermission)) {
              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: namespacedName,
                content: JSON.stringify({ error: `Tool ${namespacedName} is not allowed` }),
              })
              continue
            }

            // Create ToolCallRecord
            const recordId = generateMessageId()
            const requireConfirmation = mcpPermission.requireConfirmation ?? false
            const record: ToolCallRecord = {
              id: recordId,
              toolCallId: tc.id,
              namespacedName,
              toolName,
              serverId,
              arguments: tc.function.arguments,
              status: requireConfirmation ? 'confirming' : 'calling',
              startedAt: Date.now(),
              requireConfirmation,
            }

            store.addToolCallRecord?.(record)

            // Confirmation flow
            if (requireConfirmation) {
              let confirmed = false
              if (options.requestToolConfirmation) {
                confirmed = await options.requestToolConfirmation(record)
              } else {
                confirmed = await mcpStore.requestToolConfirmation(record)
              }

              if (!confirmed) {
                store.updateToolCallRecord?.(recordId, {
                  status: 'rejected',
                  confirmed: false,
                  finishedAt: Date.now(),
                })
                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: namespacedName,
                  content: JSON.stringify({ error: 'User rejected tool call' }),
                })
                continue
              }

              store.updateToolCallRecord?.(recordId, {
                status: 'calling',
                confirmed: true,
              })
            }

            // Execute tool call with timeout
            const timeoutMs = mcpPermission.callTimeoutMs ?? 30000
            let result: unknown
            try {
              const args = tc.function.arguments
              const parsedArgs = args ? JSON.parse(args) : {}
              result = await Promise.race([
                mcpStore.callTool(serverId, toolName, parsedArgs),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Tool call timeout')), timeoutMs)
                ),
              ])

              const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
              store.updateToolCallRecord?.(recordId, {
                status: 'success',
                result: resultStr,
                finishedAt: Date.now(),
              })
              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: namespacedName,
                content: resultStr,
              })
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err)
              const isTimeout = errorMsg === 'Tool call timeout'
              store.updateToolCallRecord?.(recordId, {
                status: isTimeout ? 'timeout' : 'error',
                error: errorMsg,
                finishedAt: Date.now(),
              })
              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: namespacedName,
                content: JSON.stringify({ error: errorMsg }),
              })
            }
          }

          // Add tool messages to conversation
          for (const tm of toolMessages) {
            store.addMessage(tm)
          }

          // Create new assistant placeholder for the next round
          store.addMessage({ id: generateMessageId(), role: 'assistant', content: '' })

          // Recursively continue the loop
          await streamWithToolLoop({
            model,
            signal,
            openAITools,
            mcpPermission,
            loopCount: loopCount + 1,
          })
          return
        }
      }
    } catch (err) {
      const aiErr = mapError(err, signal)
      store.setError(aiErr)
      if (aiErr.type === 'aborted') {
        store.removeLastAssistant?.()
      } else {
        showAIErrorToast(aiErr)
      }
      options.onError?.(aiErr)
    } finally {
      store.setStreaming(false)
    }
  }

  function stopGeneration(): void {
    if (store.abortStream) {
      store.abortStream()
    } else {
      const ctrl = readRef(store.abortController)
      if (ctrl) {
        ctrl.abort()
        store.setAbortController(null)
      }
      store.setStreaming(false)
    }
  }

  return { sendMessage, stopGeneration }
}
