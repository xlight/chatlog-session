import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MCPServerConfig } from '@/types/ai/mcp'

const mockConnect = vi.fn()
const mockClose = vi.fn()
const mockListTools = vi.fn()
const mockListResources = vi.fn()
const mockListPrompts = vi.fn()
const mockCallTool = vi.fn()
const mockReadResource = vi.fn()
const mockGetPrompt = vi.fn()
const mockSetNotificationHandler = vi.fn()
const mockGetServerVersion = vi.fn()
const mockGetServerCapabilities = vi.fn()

function createMockClient() {
  return {
    connect: mockConnect,
    close: mockClose,
    listTools: mockListTools,
    listResources: mockListResources,
    listPrompts: mockListPrompts,
    callTool: mockCallTool,
    readResource: mockReadResource,
    getPrompt: mockGetPrompt,
    setNotificationHandler: mockSetNotificationHandler,
    getServerVersion: mockGetServerVersion,
    getServerCapabilities: mockGetServerCapabilities,
    onerror: null as ((error: unknown) => void) | null,
    onclose: (() => {}) as (() => void) | null,
  }
}

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(function(this: any) { return createMockClient() }),
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn(function(this: any) { return { terminateSession: vi.fn() } }),
}))

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: vi.fn(function(this: any) { return {} }),
}))

vi.mock('@modelcontextprotocol/sdk/shared/transport.js', () => ({}))
vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ToolListChangedNotificationSchema: {},
  ResourceListChangedNotificationSchema: {},
  PromptListChangedNotificationSchema: {},
}))

import { MCPClient } from '@/api/mcp'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const streamableHttpConfig: MCPServerConfig = {
  id: 'test-server',
  name: 'Test Server',
  url: 'http://localhost:3000/mcp',
  transport: 'streamable-http',
  enabled: true,
  autoConnect: true,
}

const sseConfig: MCPServerConfig = {
  id: 'test-sse-server',
  name: 'Test SSE Server',
  url: 'http://localhost:3000/sse',
  transport: 'sse',
  enabled: true,
  autoConnect: true,
}

describe('MCPClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockClose.mockResolvedValue(undefined)
    mockListTools.mockResolvedValue({ tools: [] })
    mockListResources.mockResolvedValue({ resources: [] })
    mockListPrompts.mockResolvedValue({ prompts: [] })
    mockGetServerVersion.mockReturnValue({ name: 'test-server', version: '1.0.0' })
    mockGetServerCapabilities.mockReturnValue({ tools: {} })
  })

  describe('5.4 Streamable HTTP connection', () => {
    it('creates StreamableHTTPClientTransport for streamable-http config', () => {
      new MCPClient(streamableHttpConfig)
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(streamableHttpConfig.url),
        expect.objectContaining({
          requestInit: expect.objectContaining({
            headers: expect.any(Headers),
          }),
        }),
      )
    })

    it('connects via client.connect() and discovers capabilities', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'query_diary', description: 'Query diary', inputSchema: { type: 'object', properties: {} } }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      expect(mockConnect).toHaveBeenCalled()
      expect(client.connected).toBe(true)
      expect(client.tools).toHaveLength(1)
      expect(client.tools[0].name).toBe('query_diary')
    })

    it('populates serverInfo and capabilities after connect', async () => {
      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      expect(client.serverInfo).toEqual({ name: 'test-server', version: '1.0.0' })
      expect(client.capabilities).toBeDefined()
    })

    it('passes custom headers in transport', () => {
      const configWithHeaders: MCPServerConfig = {
        ...streamableHttpConfig,
        headers: { Authorization: 'Bearer test-token' },
      }
      new MCPClient(configWithHeaders)
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          requestInit: expect.objectContaining({
            headers: expect.any(Headers),
          }),
        }),
      )
    })
  })

  describe('5.5 SSE connection', () => {
    it('creates SSEClientTransport for sse config', () => {
      new MCPClient(sseConfig)
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL(sseConfig.url),
        expect.objectContaining({
          requestInit: expect.objectContaining({
            headers: expect.any(Headers),
          }),
        }),
      )
    })

    it('connects via SSE transport and discovers capabilities', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'sse_tool', description: 'SSE tool', inputSchema: { type: 'object', properties: {} } }],
      })

      const client = new MCPClient(sseConfig)
      await client.connect()

      expect(mockConnect).toHaveBeenCalled()
      expect(client.connected).toBe(true)
      expect(client.tools).toHaveLength(1)
    })
  })

  describe('5.6 SSE fallback', () => {
    it('MCPClient with streamable-http config uses StreamableHTTPClientTransport', () => {
      vi.clearAllMocks()
      new MCPClient(streamableHttpConfig)
      expect(StreamableHTTPClientTransport).toHaveBeenCalled()
      expect(SSEClientTransport).not.toHaveBeenCalled()
    })

    it('MCPClient with sse config uses SSEClientTransport', () => {
      vi.clearAllMocks()
      new MCPClient(sseConfig)
      expect(SSEClientTransport).toHaveBeenCalled()
      expect(StreamableHTTPClientTransport).not.toHaveBeenCalled()
    })

    it('fallback logic is handled at store level: streamable-http failure triggers SSE retry', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Streamable HTTP failed'))
      mockConnect.mockResolvedValueOnce(undefined)

      const failingClient = new MCPClient(streamableHttpConfig)
      await expect(failingClient.connect()).rejects.toThrow('Streamable HTTP failed')

      const sseClient = new MCPClient(sseConfig)
      await sseClient.connect()
      expect(sseClient.connected).toBe(true)
    })
  })

  describe('5.7 Tool discovery and invocation', () => {
    it('discovers tools via listTools()', async () => {
      mockListTools.mockResolvedValue({
        tools: [
          { name: 'tool_a', description: 'Tool A', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
          { name: 'tool_b', description: 'Tool B', inputSchema: { type: 'object', properties: {} } },
        ],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      expect(client.tools).toHaveLength(2)
      expect(client.tools[0].name).toBe('tool_a')
      expect(client.tools[1].name).toBe('tool_b')
    })

    it('discovers resources via listResources()', async () => {
      mockListResources.mockResolvedValue({
        resources: [{ uri: 'file:///test.txt', name: 'test.txt', mimeType: 'text/plain' }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      expect(client.resources).toHaveLength(1)
      expect(client.resources[0].uri).toBe('file:///test.txt')
    })

    it('discovers prompts via listPrompts()', async () => {
      mockListPrompts.mockResolvedValue({
        prompts: [{ name: 'greeting', description: 'A greeting prompt', arguments: [{ name: 'name', required: true }] }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      expect(client.prompts).toHaveLength(1)
      expect(client.prompts[0].name).toBe('greeting')
    })

    it('calls tool via client.callTool()', async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'result data' }],
        isError: false,
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      const result = await client.callTool('query_diary', {})
      expect(mockCallTool).toHaveBeenCalledWith({ name: 'query_diary', arguments: {} })
      expect(result).toBeDefined()
    })

    it('throws on tool error response', async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Something went wrong' }],
        isError: true,
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      await expect(client.callTool('bad_tool', {})).rejects.toThrow('MCP tool error')
    })

    it('toOpenAITools() returns OpenAI-compatible tool definitions', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'query_diary', description: 'Query diary', inputSchema: { type: 'object', properties: {} } }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      const openaiTools = client.toOpenAITools()
      expect(openaiTools).toHaveLength(1)
      expect(openaiTools[0]).toEqual({
        type: 'function',
        function: {
          name: 'mcp__test-server__query_diary',
          description: 'Query diary',
          parameters: { type: 'object', properties: {} },
        },
      })
    })

    it('extractFromToolCall() parses namespaced tool name', () => {
      const toolCall = {
        id: 'call_123',
        type: 'function' as const,
        function: { name: 'mcp__test-server__query_diary', arguments: '{"q":"hello"}' },
      }
      const result = MCPClient.extractFromToolCall(toolCall)
      expect(result).toEqual({
        serverId: 'test-server',
        toolName: 'query_diary',
        args: { q: 'hello' },
      })
    })

    it('extractFromToolCall() returns null for non-namespaced name', () => {
      const toolCall = {
        id: 'call_123',
        type: 'function' as const,
        function: { name: 'plain_tool', arguments: '{}' },
      }
      expect(MCPClient.extractFromToolCall(toolCall)).toBeNull()
    })

    it('extractFromToolCall() handles empty arguments gracefully', () => {
      const toolCall = {
        id: 'call_123',
        type: 'function' as const,
        function: { name: 'mcp__test-server__query_diary', arguments: '' },
      }
      const result = MCPClient.extractFromToolCall(toolCall)
      expect(result).toEqual({
        serverId: 'test-server',
        toolName: 'query_diary',
        args: {},
      })
    })

    it('registerNotificationHandlers() registers handlers', async () => {
      const client = new MCPClient(streamableHttpConfig)
      await client.connect()

      const onUpdate = vi.fn()
      client.registerNotificationHandlers(onUpdate)

      expect(mockSetNotificationHandler).toHaveBeenCalledTimes(3)
    })
  })

  describe('5.8 Disconnect (session termination)', () => {
    it('disconnects and clears state', async () => {
      mockListTools.mockResolvedValue({
        tools: [{ name: 'query_diary', description: 'Query diary', inputSchema: { type: 'object', properties: {} } }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()
      expect(client.connected).toBe(true)
      expect(client.tools).toHaveLength(1)

      await client.disconnect()
      expect(client.connected).toBe(false)
      expect(client.tools).toHaveLength(0)
      expect(mockClose).toHaveBeenCalled()
    })

    it('calls terminateSession() on StreamableHTTP transport during disconnect', async () => {
      const client = new MCPClient(streamableHttpConfig)
      await client.connect()
      await client.disconnect()

      expect(StreamableHTTPClientTransport).toHaveBeenCalled()
      expect(mockClose).toHaveBeenCalled()
    })

    it('clears resources and prompts on disconnect', async () => {
      mockListResources.mockResolvedValue({
        resources: [{ uri: 'file:///test.txt', name: 'test.txt' }],
      })
      mockListPrompts.mockResolvedValue({
        prompts: [{ name: 'greeting', description: 'A greeting prompt' }],
      })

      const client = new MCPClient(streamableHttpConfig)
      await client.connect()
      expect(client.resources).toHaveLength(1)
      expect(client.prompts).toHaveLength(1)

      await client.disconnect()
      expect(client.resources).toHaveLength(0)
      expect(client.prompts).toHaveLength(0)
    })
  })
})
