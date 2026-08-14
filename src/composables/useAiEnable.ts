/**
 * 启用 AI 的共享入口：组件层隐私确认 + store 纯 action。
 * 任何 UI 入口启用 AI 都应经由本 composable，避免绕过隐私确认。
 */
import { ElMessageBox } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import { useAIAgentStore } from '@/stores/ai/agent'
import { inferProviderName } from '@/api/llm'

export function useAiEnable() {
  const settingsStore = useSettingsStore()
  const agentStore = useAIAgentStore()

  /**
   * 尝试启用 AI。首次启用（privacyAcknowledged=false）时弹隐私确认，
   * 确认后写入；取消返回 false（调用方用于开关回弹）。
   */
  async function enableAi(): Promise<boolean> {
    if (settingsStore.ai.enabled) return true
    if (!settingsStore.ai.privacyAcknowledged) {
      const provider = inferProviderName(settingsStore.ai.llmBaseUrl)
      try {
        await ElMessageBox.confirm(
          `启用 AI 助手后，聊天内容将被发送给 ${provider} 进行处理。\n\n请确认你了解并接受此数据传输。`,
          'AI 数据隐私提示',
          {
            type: 'warning',
            confirmButtonText: '我已了解，启用',
            cancelButtonText: '取消',
          }
        )
        settingsStore.setAiEnabled(true, { acknowledged: true })
        return true
      } catch {
        return false
      }
    }
    settingsStore.setAiEnabled(true)
    return true
  }

  /** 关闭 AI（全局总闸，无需确认）；同时中止所有进行中的分析流 */
  function disableAi(): void {
    settingsStore.setAiEnabled(false)
    agentStore.abortAllAnalyses()
  }

  return { enableAi, disableAi }
}
