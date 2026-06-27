/**
 * LLM API
 *
 * OpenAI 兼容协议的客户端封装，使用 openai SDK 统一处理 SSE 流式对话
 * baseURL 从 settings store 动态读取，可指向直连 LLM (DeepSeek) 或后续的 butler 代理
 * 浏览器端需 dangerouslyAllowBrowser: true
 */
import OpenAI from 'openai'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'
import type {
  AIError,
  ChatCompletionChunk,
  ChatMessage,
  ChatStreamRequest,
  ConnectionTestResult,
  ModelCapabilities,
  ModelInfo,
} from '@/types/ai'

/** OpenAI 客户端缓存（避免重复创建） */
let cachedClient: OpenAI | null = null
let cachedConfigKey = ''

/** 从 settings store 创建 OpenAI 客户端 */
export function createClient(): OpenAI {
  const settingsStore = useSettingsStore()
  const baseURL = settingsStore.ai.llmBaseUrl.replace(/\/+$/, '')
  const apiKey = settingsStore.ai.llmApiKey
  const configKey = `${baseURL}|${apiKey.slice(0, 8)}`

  if (cachedClient && cachedConfigKey === configKey) {
    return cachedClient
  }

  cachedClient = new OpenAI({
    baseURL,
    apiKey: apiKey || 'placeholder',
    dangerouslyAllowBrowser: true,
  })
  cachedConfigKey = configKey
  return cachedClient
}

/** 清除客户端缓存（设置变更时调用） */
export function resetClient() {
  cachedClient = null
  cachedConfigKey = ''
}

/** 提取模型能力（OpenAI list response 不直接暴露 x-capabilities，需自行处理） */
function extractCapabilities(raw: unknown): ModelCapabilities {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  return {
    tools: r['tools'] === true,
    tool_names: Array.isArray(r['tool_names']) ? (r['tool_names'] as string[]) : [],
    ...r,
  }
}

/** 将 OpenAI 模型响应转换为 ModelInfo */
function transformModel(raw: unknown): ModelInfo {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(r['id'] ?? ''),
    object: r['object'] ? String(r['object']) : undefined,
    owned_by: r['owned_by'] ? String(r['owned_by']) : undefined,
    created: typeof r['created'] === 'number' ? (r['created'] as number) : undefined,
    capabilities: extractCapabilities(r),
  }
}

/** 流式对话 */
export async function* chatStream(
  request: ChatStreamRequest
): AsyncGenerator<ChatCompletionChunk, void, void> {
  const settingsStore = useSettingsStore()
  const client = createClient()
  const model = request.model ?? settingsStore.ai.llmDefaultModel

  try {
    const stream = await client.chat.completions.create(
      {
        model,
        messages: request.messages as Parameters<
          typeof client.chat.completions.create
        >[0]['messages'],
        stream: true,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        ...(request.tools?.length ? { tools: request.tools as Parameters<
          typeof client.chat.completions.create
        >[0]['tools'] } : {}),
      },
      { signal: request.signal }
    )

    for await (const chunk of stream) {
      yield chunk as unknown as ChatCompletionChunk
    }
  } catch (err) {
    throw mapError(err, request.signal)
  }
}

/** 列出可用模型 */
export async function listModels(): Promise<ModelInfo[]> {
  const client = createClient()
  try {
    const response = await client.models.list()
    const items: unknown[] = []
    for await (const item of response) {
      items.push(item)
    }
    return items.map(transformModel)
  } catch (err) {
    throw mapError(err)
  }
}

/** 测试连接 */
export async function testConnection(): Promise<ConnectionTestResult> {
  const start = performance.now()
  try {
    const models = await listModels()
    const latencyMs = Math.round(performance.now() - start)
    return {
      success: true,
      modelCount: models.length,
      models,
      latencyMs,
    }
  } catch (err) {
    const aiErr = mapError(err)
    return {
      success: false,
      modelCount: 0,
      error: aiErr.message,
    }
  }
}

/** 映射 OpenAI SDK 错误为 AIError */
export function mapError(err: unknown, signal?: AbortSignal): AIError {
  if (signal?.aborted) {
    return {
      type: 'aborted',
      message: '对话已停止',
      retryable: false,
    }
  }

  if (err instanceof OpenAI.APIError) {
    const status = err.status
    if (status === 401) {
      return {
        type: 'auth_error',
        message: 'API Key 无效或已过期',
        code: 'invalid_api_key',
        retryable: false,
      }
    }
    if (status === 429) {
      return {
        type: 'rate_limit',
        message: '请求过于频繁，请稍后再试',
        code: 'rate_limit_exceeded',
        retryable: true,
        retryAfter: 60,
      }
    }
    if (status && status >= 500) {
      return {
        type: 'server_error',
        message: `LLM 服务异常 (${status})`,
        code: 'server_error',
        retryable: true,
      }
    }
    return {
      type: 'unknown_error',
      message: err.message,
      code: err.code ?? undefined,
      retryable: false,
    }
  }

  if (err instanceof OpenAI.APIConnectionError) {
    return {
      type: 'network_error',
      message: '无法连接到 LLM 服务',
      retryable: true,
    }
  }

  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      type: 'timeout',
      message: 'LLM 服务响应超时',
      retryable: true,
    }
  }

  if (err instanceof OpenAI.APIUserAbortError) {
    return {
      type: 'aborted',
      message: '对话已停止',
      retryable: false,
    }
  }

  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return {
        type: 'aborted',
        message: '对话已停止',
        retryable: false,
      }
    }
    return {
      type: 'unknown_error',
      message: err.message,
      retryable: false,
    }
  }

  return {
    type: 'unknown_error',
    message: '未知错误',
    retryable: false,
  }
}

/** 便捷方法：发送单条消息（非流式） */
export async function sendMessage(
  messages: ChatMessage[],
  options?: { model?: string; signal?: AbortSignal }
): Promise<string> {
  let result = ''
  for await (const chunk of chatStream({
    messages,
    model: options?.model,
    signal: options?.signal,
  })) {
    const delta = chunk.choices?.[0]?.delta
    if (delta?.content) {
      result += delta.content
    }
  }
  return result
}

/** 错误提示（统一 toast 入口） */
export function showAIErrorToast(err: AIError) {
  ElMessage.error(err.message)
}

/** 推断 Provider 名称（用于隐私提示） */
export function inferProviderName(baseURL: string): string {
  if (!baseURL) return '未知 LLM 服务'
  const url = baseURL.toLowerCase()
  if (url.includes('deepseek')) return 'DeepSeek'
  if (url.includes('openai')) return 'OpenAI'
  if (url.includes('anthropic')) return 'Anthropic'
  if (url.includes('moonshot') || url.includes('kimi')) return 'Moonshot Kimi'
  if (url.includes('zhipu') || url.includes('glm')) return '智谱 GLM'
  if (url.includes('dashscope') || url.includes('qwen')) return '通义千问'
  if (url.includes('localhost') || url.includes('127.0.0.1')) return '本地 LLM 代理'
  if (url.includes('butler')) return 'wechat-butler'
  try {
    const u = new URL(baseURL)
    return u.hostname
  } catch {
    return baseURL
  }
}
