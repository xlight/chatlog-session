import { computed } from 'vue'
import { useMCPStore } from '@/stores/ai/mcp'
import { useSettingsStore } from '@/stores/settings'
import type { MCPServerConfig, MCPServerInfo, MCPTool } from '@/types/ai/mcp'

export function useMCPClient() {
  const mcpStore = useMCPStore()
  const settingsStore = useSettingsStore()

  const servers = computed<MCPServerConfig[]>(() => settingsStore.ai.mcpServers)

  const serverInfos = computed<Map<string, MCPServerInfo>>(() => mcpStore.serverInfos)

  const connectedServers = computed(() => {
    const result: MCPServerInfo[] = []
    for (const info of mcpStore.serverInfos.values()) {
      if (info.status === 'connected') result.push(info)
    }
    return result
  })

  const allTools = computed<MCPTool[]>(() => mcpStore.allTools)

  const openAITools = computed(() => mcpStore.openAITools)

  const connectedCount = computed(() => mcpStore.connectedCount)
  const connectingCount = computed(() => mcpStore.connectingCount)
  const errorCount = computed(() => mcpStore.errorCount)

  function getServerInfo(configId: string): MCPServerInfo | undefined {
    return mcpStore.getServerInfo(configId)
  }

  async function addServer(config: MCPServerConfig): Promise<void> {
    mcpStore.addServer(config)
  }

  function removeServer(configId: string): void {
    mcpStore.removeServer(configId)
  }

  function updateServer(configId: string, updates: Partial<MCPServerConfig>): void {
    mcpStore.updateServer(configId, updates)
  }

  async function connectServer(configId: string): Promise<void> {
    await mcpStore.connectServer(configId)
  }

  async function disconnectServer(configId: string): Promise<void> {
    await mcpStore.disconnectServer(configId)
  }

  async function callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    return mcpStore.callTool(serverId, toolName, args)
  }

  function confirmToolCall(recordId: string, confirmed: boolean): void {
    mcpStore.confirmToolCall(recordId, confirmed)
  }

  return {
    servers,
    serverInfos,
    connectedServers,
    allTools,
    openAITools,
    connectedCount,
    connectingCount,
    errorCount,
    getServerInfo,
    addServer,
    removeServer,
    updateServer,
    connectServer,
    disconnectServer,
    callTool,
    confirmToolCall,
  }
}
