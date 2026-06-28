/**
 * MCP Store
 *
 * 管理 MCP Server 连接、工具发现、工具调用等运行时状态
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  MCPServerConfig,
  MCPServerInfo,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ToolCallRecord,
  MCPToolPermission,
} from '@/types/ai/mcp'
import { DEFAULT_MCP_TOOL_PERMISSION, BUILTIN_MCP_SERVERS } from '@/types/ai/mcp'
import { MCPClient } from '@/api/mcp'
import { useSettingsStore } from '../settings'

export const useMCPStore = defineStore('mcp', () => {
  const serverInfos = ref<Map<string, MCPServerInfo>>(new Map())
  const clients = ref<Map<string, MCPClient>>(new Map())
  const pendingConfirmations = ref<Map<string, {
    record: ToolCallRecord
    resolve: (confirmed: boolean) => void
  }>>(new Map())

  const allTools = computed<MCPTool[]>(() => {
    const tools: MCPTool[] = []
    for (const info of serverInfos.value.values()) {
      if (info.status === 'connected') {
        tools.push(...info.tools)
      }
    }
    return tools
  })

  const allResources = computed<MCPResource[]>(() => {
    const resources: MCPResource[] = []
    for (const info of serverInfos.value.values()) {
      if (info.status === 'connected') {
        resources.push(...info.resources)
      }
    }
    return resources
  })

  const allPrompts = computed<MCPPrompt[]>(() => {
    const prompts: MCPPrompt[] = []
    for (const info of serverInfos.value.values()) {
      if (info.status === 'connected') {
        prompts.push(...info.prompts)
      }
    }
    return prompts
  })

  const openAITools = computed(() => {
    const tools: Array<{
      type: 'function'
      function: { name: string; description?: string; parameters: unknown }
    }> = []
    for (const client of clients.value.values()) {
      if (client.connected) {
        tools.push(...client.toOpenAITools())
      }
    }
    return tools
  })

  const connectedCount = computed(() => {
    let count = 0
    for (const info of serverInfos.value.values()) {
      if (info.status === 'connected') count++
    }
    return count
  })

  const connectingCount = computed(() => {
    let count = 0
    for (const info of serverInfos.value.values()) {
      if (info.status === 'connecting') count++
    }
    return count
  })

  const errorCount = computed(() => {
    let count = 0
    for (const info of serverInfos.value.values()) {
      if (info.status === 'error') count++
    }
    return count
  })

  function getServerInfo(configId: string): MCPServerInfo | undefined {
    return serverInfos.value.get(configId)
  }

  function getBuiltinUrl(urlSource: 'apiBaseUrl' | 'sendmsgApiUrl'): string {
    const settingsStore = useSettingsStore()
    if (urlSource === 'apiBaseUrl') {
      return `${settingsStore.normalizedApiBaseUrl}/mcp`
    }
    return `${settingsStore.sendmsg.apiUrl.replace(/\/+$/, '')}/mcp`
  }

  function ensureBuiltinServers(): void {
    const settingsStore = useSettingsStore()
    for (const template of BUILTIN_MCP_SERVERS) {
      const exists = settingsStore.ai.mcpServers.some(s => s.builtin === template.builtin)
      if (!exists) {
        settingsStore.ai.mcpServers.push({
          ...template,
          url: getBuiltinUrl(template.urlSource),
        })
      }
    }
  }

  async function syncBuiltinMcpServers(): Promise<void> {
    const settingsStore = useSettingsStore()
    for (const template of BUILTIN_MCP_SERVERS) {
      const server = settingsStore.ai.mcpServers.find(s => s.builtin === template.builtin)
      if (!server) continue
      const newUrl = getBuiltinUrl(template.urlSource)
      if (server.url === newUrl) continue

      const wasConnected = serverInfos.value.get(server.id)?.status === 'connected'
      if (wasConnected) {
        await disconnectServer(server.id)
      }
      server.url = newUrl
      if (wasConnected && server.enabled) {
        await connectServer(server.id)
      }
    }
  }

  async function connectServer(configId: string): Promise<void> {
    const settingsStore = useSettingsStore()
    const config = settingsStore.ai.mcpServers.find(s => s.id === configId)
    if (!config) throw new Error(`MCP Server config not found: ${configId}`)

    const existing = serverInfos.value.get(configId)
    if (existing?.status === 'connected' || existing?.status === 'connecting') return

    serverInfos.value.set(configId, {
      configId,
      status: 'connecting',
      tools: [],
      resources: [],
      prompts: [],
    })

    try {
      const client = new MCPClient(config)
      await client.connect()

      client.registerNotificationHandlers((update) => {
        const info = serverInfos.value.get(configId)
        if (!info || info.status !== 'connected') return
        if (update.tools) info.tools = update.tools
        if (update.resources) info.resources = update.resources
        if (update.prompts) info.prompts = update.prompts
      })

      clients.value.set(configId, client)
      serverInfos.value.set(configId, {
        configId,
        status: 'connected',
        protocolVersion: client.protocolVersion,
        capabilities: client.capabilities,
        serverInfo: client.serverInfo,
        tools: client.tools,
        resources: client.resources,
        prompts: client.prompts,
        connectedAt: Date.now(),
      })
    } catch (err) {
      if (config.transport === 'streamable-http') {
        try {
          const sseConfig = { ...config, transport: 'sse' as const }
          const client = new MCPClient(sseConfig)
          await client.connect()

          client.registerNotificationHandlers((update) => {
            const info = serverInfos.value.get(configId)
            if (!info || info.status !== 'connected') return
            if (update.tools) info.tools = update.tools
            if (update.resources) info.resources = update.resources
            if (update.prompts) info.prompts = update.prompts
          })

          clients.value.set(configId, client)
          serverInfos.value.set(configId, {
            configId,
            status: 'connected',
            protocolVersion: client.protocolVersion,
            capabilities: client.capabilities,
            serverInfo: client.serverInfo,
            tools: client.tools,
            resources: client.resources,
            prompts: client.prompts,
            connectedAt: Date.now(),
          })
          return
        } catch { /* SSE fallback also failed, report original error */ }
      }

      const message = err instanceof Error ? err.message : String(err)
      serverInfos.value.set(configId, {
        configId,
        status: 'error',
        tools: [],
        resources: [],
        prompts: [],
        error: message,
      })
      throw err
    }
  }

  async function disconnectServer(configId: string): Promise<void> {
    const client = clients.value.get(configId)
    if (client) {
      await client.disconnect()
      clients.value.delete(configId)
    }

    const info = serverInfos.value.get(configId)
    if (info) {
      info.status = 'disconnected'
      info.tools = []
      info.resources = []
      info.prompts = []
      info.connectedAt = undefined
    }
  }

  async function initialize(): Promise<void> {
    const settingsStore = useSettingsStore()
    ensureBuiltinServers()
    await syncBuiltinMcpServers()
    const configs = settingsStore.ai.mcpServers.filter(s => s.enabled && s.autoConnect)

    await Promise.allSettled(
      configs.map(config => connectServer(config.id))
    )
  }

  function addServer(config: MCPServerConfig): void {
    const settingsStore = useSettingsStore()
    settingsStore.ai.mcpServers.push(config)
  }

  function removeServer(configId: string): void {
    const settingsStore = useSettingsStore()
    const config = settingsStore.ai.mcpServers.find(s => s.id === configId)
    if (config?.builtin) return
    disconnectServer(configId)
    settingsStore.ai.mcpServers = settingsStore.ai.mcpServers.filter(s => s.id !== configId)
    serverInfos.value.delete(configId)
  }

  function updateServer(configId: string, updates: Partial<MCPServerConfig>): void {
    const settingsStore = useSettingsStore()
    const idx = settingsStore.ai.mcpServers.findIndex(s => s.id === configId)
    if (idx >= 0) {
      Object.assign(settingsStore.ai.mcpServers[idx], updates)
    }
  }

  async function callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const client = clients.value.get(serverId)
    if (!client || !client.connected) {
      throw new Error(`MCP Server not connected: ${serverId}`)
    }
    return client.callTool(toolName, args)
  }

  async function readResource(serverId: string, uri: string): Promise<unknown> {
    const client = clients.value.get(serverId)
    if (!client || !client.connected) {
      throw new Error(`MCP Server not connected: ${serverId}`)
    }
    return client.readResource(uri)
  }

  async function getPrompt(serverId: string, name: string, args?: Record<string, string>): Promise<unknown> {
    const client = clients.value.get(serverId)
    if (!client || !client.connected) {
      throw new Error(`MCP Server not connected: ${serverId}`)
    }
    return client.getPrompt(name, args)
  }

  function confirmToolCall(recordId: string, confirmed: boolean): void {
    const pending = pendingConfirmations.value.get(recordId)
    if (pending) {
      pending.resolve(confirmed)
      pendingConfirmations.value.delete(recordId)
    }
  }

  function requestToolConfirmation(record: ToolCallRecord): Promise<boolean> {
    return new Promise((resolve) => {
      pendingConfirmations.value.set(record.id, { record, resolve })
    })
  }

  function isToolAllowed(namespacedName: string, permission: MCPToolPermission): boolean {
    if (!permission.enabled) return false
    if (permission.deniedTools.includes(namespacedName)) return false
    if (permission.allowedTools.length > 0 && !permission.allowedTools.includes(namespacedName)) return false
    return true
  }

  function getToolPermissionForLevel(level: string): MCPToolPermission {
    switch (level) {
      case 'L0':
      case 'L1':
        return { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: false }
      case 'L2':
        return { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: true, requireConfirmation: true }
      case 'L3':
      case 'L4':
        return { ...DEFAULT_MCP_TOOL_PERMISSION, enabled: true, requireConfirmation: false }
      default:
        return { ...DEFAULT_MCP_TOOL_PERMISSION }
    }
  }

  const settingsStore = useSettingsStore()
  watch(() => settingsStore.api.apiBaseUrl, () => syncBuiltinMcpServers())
  watch(() => settingsStore.sendmsg.apiUrl, () => syncBuiltinMcpServers())

  return {
    serverInfos,
    pendingConfirmations,
    allTools,
    allResources,
    allPrompts,
    openAITools,
    connectedCount,
    connectingCount,
    errorCount,
    getServerInfo,
    initialize,
    addServer,
    removeServer,
    updateServer,
    connectServer,
    disconnectServer,
    callTool,
    readResource,
    getPrompt,
    confirmToolCall,
    requestToolConfirmation,
    isToolAllowed,
    getToolPermissionForLevel,
    ensureBuiltinServers,
    syncBuiltinMcpServers,
  }
})
