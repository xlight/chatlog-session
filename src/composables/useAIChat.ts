import { useSettingsStore } from '@/stores/settings'
import { useAIConversationStore } from '@/stores/ai/conversation'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { useAppStore } from '@/stores/app'
import { useAIStream, type AIStreamStore } from '@/composables/useAIStream'
import type { ChatMessage } from '@/types/ai'
import type { ToolCallRecord } from '@/types/ai/mcp'
import { ElMessageBox } from 'element-plus'

/**
 * AI 对话组合函数（薄包装）
 *
 * 委托 useAIStream(conversation, options)，保留公共 API 以便调用方零改动
 * 流式渲染、RAF 批处理、错误映射、abort 清理统一在 useAIStream 中实现
 */
export function useAIChat() {
  const settingsStore = useSettingsStore()
  const agentStore = useAIAgentStore()
  const sessionStore = useSessionStore()
  const appStore = useAppStore()
  const conversation = useAIConversationStore() as unknown as AIStreamStore

  const stream = useAIStream(conversation, {
    getMessages: () =>
      (conversation as unknown as { messages: ChatMessage[] }).messages,
    getModel: () => settingsStore.ai.llmDefaultModel,
    getAgentConfig: () => {
      const sessionId = sessionStore.currentSessionId
      if (!sessionId) return null
      const config = agentStore.getEffectiveConfig(sessionId)

      if (appStore.isDebug) {
        console.log('[MCP] getAgentConfig:', { enabled: config.mcpTools.enabled, levelPreset: config.levelPreset, mcpTools: config.mcpTools })
      }

      return { mcpTools: config.mcpTools }
    },
    requestToolConfirmation: async (record: ToolCallRecord) => {
      try {
        await ElMessageBox.confirm(
          `允许 AI 调用工具「${record.toolName}」？`,
          '工具调用确认',
          {
            confirmButtonText: '允许',
            cancelButtonText: '拒绝',
            type: 'warning',
          }
        )
        return true
      } catch {
        return false
      }
    },
  })

  async function sendMessage(input: string) {
    return stream.sendMessage(input)
  }

  function stopGeneration() {
    stream.stopGeneration()
  }

  function clearConversation() {
    ;(conversation as unknown as { clearConversation: () => void }).clearConversation()
  }

  return {
    conversation: conversation as unknown as ReturnType<typeof useAIConversationStore>,
    sendMessage,
    stopGeneration,
    clearConversation,
  }
}
