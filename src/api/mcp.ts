/**
 * MCP 客户端封装
 *
 * 基于 @modelcontextprotocol/sdk v1 官方 SDK
 * 支持 Streamable HTTP (2025-03-26) 和旧版 SSE 传输
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js'
import {
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPServerCapabilities,
} from '@/types/ai/mcp'
import { namespacedToolName } from '@/types/ai/mcp'
import type { ToolCall } from '@/types/ai'

export class MCPClient {
  private config: MCPServerConfig
  private client: Client
  private transport: Transport
  private _connected = false
  private _tools: MCPTool[] = []
  private _resources: MCPResource[] = []
  private _prompts: MCPPrompt[] = []
  private _capabilities: MCPServerCapabilities | undefined
  private _serverInfo: { name: string; version?: string } | undefined
  private _protocolVersion: string | undefined

  constructor(config: MCPServerConfig) {
    this.config = config
    this.client = new Client(
      { name: 'chatlog-session', version: '1.0.0' },
      { capabilities: {} },
    )
    this.transport = this.createTransport(config)
  }

  private createTransport(config: MCPServerConfig): Transport {
    const url = new URL(config.url)
    const requestInit: RequestInit = {
      headers: new Headers(config.headers ?? {}),
    }

    if (config.transport === 'sse') {
      return new SSEClientTransport(url, { requestInit })
    }

    return new StreamableHTTPClientTransport(url, { requestInit })
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport)

    const serverVersion = this.client.getServerVersion()
    if (serverVersion) {
      this._serverInfo = { name: serverVersion.name, version: serverVersion.version }
    }

    const sdkCapabilities = this.client.getServerCapabilities()
    if (sdkCapabilities) {
      this._capabilities = sdkCapabilities as unknown as MCPServerCapabilities
    }

    await this.discoverCapabilities()
    this._connected = true
  }

  async disconnect(): Promise<void> {
    if (this.transport instanceof StreamableHTTPClientTransport) {
      try {
        await this.transport.terminateSession()
      } catch { /* ignore */ }
    }
    await this.client.close()
    this._connected = false
    this._tools = []
    this._resources = []
    this._prompts = []
  }

  get connected(): boolean { return this._connected }
  get protocolVersion(): string | undefined { return this._protocolVersion }
  get capabilities(): MCPServerCapabilities | undefined { return this._capabilities }
  get serverInfo(): { name: string; version?: string } | undefined { return this._serverInfo }
  get tools(): MCPTool[] { return this._tools }
  get resources(): MCPResource[] { return this._resources }
  get prompts(): MCPPrompt[] { return this._prompts }

  private async discoverCapabilities(): Promise<void> {
    try {
      const { tools } = await this.client.listTools()
      this._tools = tools.map(t => this.mapTool(t))
    } catch { /* ignore */ }

    try {
      const { resources } = await this.client.listResources()
      this._resources = resources.map(r => this.mapResource(r))
    } catch { /* ignore */ }

    try {
      const { prompts } = await this.client.listPrompts()
      this._prompts = prompts.map(p => this.mapPrompt(p))
    } catch { /* ignore */ }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.client.callTool({ name, arguments: args })
    if (result.isError) {
      const errorText = (result.content as Array<{ type: string; text?: string }>)
        .filter(c => c.type === 'text' && c.text)
        .map(c => c.text!)
        .join('\n')
      throw new Error(`MCP tool error: ${errorText}`)
    }
    return result
  }

  async readResource(uri: string): Promise<unknown> {
    return this.client.readResource({ uri })
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<unknown> {
    return this.client.getPrompt({ name, arguments: args })
  }

  toOpenAITools(): Array<{
    type: 'function'
    function: { name: string; description?: string; parameters: unknown }
  }> {
    return this._tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: namespacedToolName(this.config.id, tool.name),
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))
  }

  static extractFromToolCall(toolCall: ToolCall): { serverId: string; toolName: string; args: Record<string, unknown> } | null {
    const match = /^mcp__([a-zA-Z0-9_-]+)__(.+)$/.exec(toolCall.function.name)
    if (!match) return null

    let args: Record<string, unknown> = {}
    try { args = JSON.parse(toolCall.function.arguments) } catch { /* empty args */ }

    return { serverId: match[1], toolName: match[2], args }
  }

  registerNotificationHandlers(
    onUpdate?: (info: Partial<{ tools: MCPTool[]; resources: MCPResource[]; prompts: MCPPrompt[] }>) => void,
  ): void {
    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async () => {
        try {
          const { tools } = await this.client.listTools()
          this._tools = tools.map(t => this.mapTool(t))
          onUpdate?.({ tools: this._tools })
        } catch { /* ignore */ }
      },
    )

    this.client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      async () => {
        try {
          const { resources } = await this.client.listResources()
          this._resources = resources.map(r => this.mapResource(r))
          onUpdate?.({ resources: this._resources })
        } catch { /* ignore */ }
      },
    )

    this.client.setNotificationHandler(
      PromptListChangedNotificationSchema,
      async () => {
        try {
          const { prompts } = await this.client.listPrompts()
          this._prompts = prompts.map(p => this.mapPrompt(p))
          onUpdate?.({ prompts: this._prompts })
        } catch { /* ignore */ }
      },
    )

    this.client.onerror = (error) => {
      console.error(`MCP transport error [${this.config.id}]:`, error)
    }

    this.client.onclose = () => {
      this._connected = false
    }
  }

  private mapTool(sdkTool: Tool): MCPTool {
    return {
      name: sdkTool.name,
      description: sdkTool.description,
      inputSchema: sdkTool.inputSchema as MCPTool['inputSchema'],
    }
  }

  private mapResource(sdkResource: Resource): MCPResource {
    return {
      uri: sdkResource.uri,
      name: sdkResource.name,
      description: sdkResource.description,
      mimeType: sdkResource.mimeType,
    }
  }

  private mapPrompt(sdkPrompt: Prompt): MCPPrompt {
    return {
      name: sdkPrompt.name,
      description: sdkPrompt.description,
      arguments: sdkPrompt.arguments?.map(a => ({
        name: a.name,
        description: a.description,
        required: a.required,
      })),
    }
  }
}
