/**
 * HTTP 请求封装
 * 基于 axios 封装统一的请求处理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, ApiError } from '@/types/api'

/**
 * UI 错误处理回调（由应用层注入，解耦 request.ts 对 element-plus 的依赖）
 */
let onErrorCallback: ((message: string) => void) | null = null

/**
 * 注入 UI 错误处理回调
 */
export function setOnErrorCallback(callback: (message: string) => void): void {
  onErrorCallback = callback
}

/**
 * 显示错误消息（通过注入的回调或 console.error）
 */
function showError(message: string): void {
  if (onErrorCallback) {
    onErrorCallback(message)
  } else {
    console.error('[Request Error]', message)
  }
}

/**
 * 扩展 axios 配置类型，支持重试
 */
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: number
      retryCount?: number
    }
  }
}

/**
 * 从 localStorage 读取设置
 */
const getSettings = () => {
  try {
    const settings = localStorage.getItem('chatlog-settings')
    return settings ? JSON.parse(settings) : {}
  } catch {
    return {}
  }
}

/**
 * 获取 API Base URL
 * 优先从独立的 apiBaseUrl key 读取，其次从 settings 读取
 */
export const getApiBaseUrl = (): string => {
  // 优先使用独立的 apiBaseUrl
  const directUrl = localStorage.getItem('apiBaseUrl')
  if (directUrl) {
    return directUrl
  }
  
  // 其次从 settings 读取
  const settings = getSettings()
  if (settings.apiBaseUrl) {
    return settings.apiBaseUrl
  }
  
  // 最后使用环境变量或默认值
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5030'
}

/**
 * 获取动态配置
 */
const getDynamicConfig = (): AxiosRequestConfig => {
  const settings = getSettings()
  
  return {
    baseURL: getApiBaseUrl(),
    timeout: settings.apiTimeout || Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  }
}

/**
 * 模块级配置缓存
 * - cachedApiBaseUrl/cachedTimeout: 复用 getDynamicConfig 结果
 * - cachedEnableDebug/cachedApiRetryCount/cachedApiRetryDelay: 从 getSettings() 初始化
 *   （getDynamicConfig L80-90 只读 baseURL/timeout，不含这些字段）
 * 设置变更时通过 invalidateRequestConfig() 失效
 */
let cachedApiBaseUrl: string
let cachedTimeout: number
let cachedEnableDebug: boolean
let cachedApiRetryCount: number
let cachedApiRetryDelay: number

/**
 * 初始化缓存（模块加载时与 invalidate 时调用）
 */
const initRequestConfigCache = (): void => {
  const dynConfig = getDynamicConfig()
  cachedApiBaseUrl = dynConfig.baseURL as string
  cachedTimeout = dynConfig.timeout as number

  // 扩展字段需额外从 getSettings() 读取（getDynamicConfig 不含）
  const settings = getSettings()
  cachedEnableDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true' || settings.enableDebug === true
  cachedApiRetryCount = settings.apiRetryCount ?? 3
  cachedApiRetryDelay = settings.apiRetryDelay ?? 1000
}

/**
 * 失效配置缓存（供 settings 变更时调用）
 * 重新从 localStorage 解析所有 5 个字段
 */
export const invalidateRequestConfig = (): void => {
  initRequestConfigCache()
}

// 模块加载时初始化缓存
initRequestConfigCache()

/**
 * 请求配置
 */
const config: AxiosRequestConfig = getDynamicConfig()

/**
 * 创建 axios 实例
 */
const service: AxiosInstance = axios.create(config)

/**
 * 监听设置变更事件，失效配置缓存
 * - chatlog-settings-updated: 同标签页内设置变更（Settings saveSettings 等）
 * - storage: 跨标签页同步（e.key 为 apiBaseUrl/chatlog-settings 时触发）
 */
if (typeof window !== 'undefined') {
  window.addEventListener('chatlog-settings-updated', () => {
    invalidateRequestConfig()
  })

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'apiBaseUrl' || e.key === 'chatlog-settings') {
      invalidateRequestConfig()
    }
  })
}

/**
 * 实时数据端点清单（需防缓存，自动注入 _t 时间戳）
 * 其余 GET 端点默认可缓存
 */
const REALTIME_ENDPOINTS = [
  '/api/v1/chatlog',
  '/api/v1/session',
  '/api/v1/contact',
  '/api/v1/dashboard',
  '/api/v1/search',
  '/api/v1/diary',
]

/**
 * 判断 URL 是否为实时数据端点
 */
const isRealtimeEndpoint = (url: string | undefined): boolean => {
  if (!url) return false
  return REALTIME_ENDPOINTS.some(endpoint => url === endpoint || url.startsWith(endpoint + '?') || url.startsWith(endpoint + '/'))
}

/**
 * 请求拦截器
 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 初始化元数据
    if (!config.metadata) {
      config.metadata = {}
    }
    config.metadata.startTime = Date.now()
    
    // 初始化重试计数
    if (config.metadata.retryCount === undefined) {
      config.metadata.retryCount = 0
    }
    
    // 动态更新 baseURL 和 timeout（使用模块级缓存，避免每请求解析 localStorage）
    if (cachedApiBaseUrl) {
      config.baseURL = cachedApiBaseUrl
    }

    if (cachedTimeout) {
      config.timeout = cachedTimeout
    }
    
    // 添加默认分页参数（如果没有提供）
    if (config.method?.toLowerCase() === 'get') {
      const userParams = config.params || {}
      
      // 设置默认值，用户参数优先
      config.params = {
        limit: 200,     // 默认值
        offset: 0,      // 默认值
        ...userParams,  // 用户参数会覆盖默认值
        format: 'json', // 始终添加 format
      }

      // 实时数据端点自动注入 _t 时间戳防缓存（补偿移除的全局 _t）
      if (isRealtimeEndpoint(config.url) && !config.params._t) {
        config.params._t = Date.now()
      }
    } else {
      // 非 GET 请求也添加 format 参数
      config.params = {
        ...config.params,
        format: 'json',
      }
    }

    // 添加 token（如果需要）
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 开发环境日志或用户开启了 API 调试（使用缓存）
    if (import.meta.env.DEV && cachedEnableDebug) {
      console.log('📤 API Request:', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''))
      console.log('📤 Request Params:', config.params || config.data)
      console.log('📤 Request Config:', {
        timeout: config.timeout,
        baseURL: config.baseURL
      })
    }
    
    return config
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 开发环境日志或用户开启了 API 调试（使用缓存）
    if (import.meta.env.DEV && cachedEnableDebug) {
      const duration = response.config.metadata?.startTime 
        ? Date.now() - response.config.metadata.startTime 
        : 0
      console.log('📥 API Response:', response.config.url, `(${duration}ms)`)
      console.log('📥 Response Data:', data)
    }

    // 处理 Chatlog API 的响应格式
    // 优先级从高到低处理各种响应格式
    
    // 1. 如果是数组，直接返回（某些旧接口）
    if (Array.isArray(data)) {
      return data as any
    }

    // 2. 如果不是对象，直接返回（字符串、数字等）
    if (!data || typeof data !== 'object') {
      return data as any
    }

    // 3. Chatlog API 标准格式：{ items: [...] }
    if ('items' in data) {
      return data as any
    }

    // 4. 标准 REST API 格式：{ code: 0, data: ..., message: ... }
    if ('code' in data) {
      if (data.code === 0) {
        return data.data
      }
      // 业务错误
      const errorMessage = data.message || '请求失败'
      showError(errorMessage)
      return Promise.reject(new Error(errorMessage))
    }

    // 5. 其他格式，直接返回原始数据
    return data as any
  },
  async (error: AxiosError<ApiError>) => {
    const config = error.config as InternalAxiosRequestConfig
    
    // 获取重试配置（使用缓存）
    const retryCount = cachedApiRetryCount
    const retryDelay = cachedApiRetryDelay
    
    // 判断是否应该重试
    const shouldRetry = config && 
                       config.metadata &&
                       config.metadata.retryCount !== undefined &&
                       config.metadata.retryCount < retryCount &&
                       (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED')
    
    if (shouldRetry && config.metadata) {
      config.metadata.retryCount = (config.metadata.retryCount || 0) + 1
      
      if (cachedEnableDebug) {
        console.warn(`🔄 API Retry (${config.metadata.retryCount}/${retryCount}):`, config.url)
      }
      
      // 等待重试延迟
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      
      // 重新发起请求
      return service(config)
    }
    
    // 记录错误日志
    if (cachedEnableDebug) {
      console.error('❌ API Error:', error.config?.url)
      console.error('❌ Error Details:', {
        status: error.response?.status,
        message: error.message,
        retries: config?.metadata?.retryCount || 0,
        config: {
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout,
          url: error.config?.url
        }
      })
    } else {
      console.error('❌ Response Error:', error.message)
    }

    // 处理不同的错误状态
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          showError(data?.message || '请求参数错误')
          break
        case 401:
          showError('未授权，请登录')
          // 跳转到登录页面
          // router.push('/login')
          break
        case 403:
          showError('拒绝访问')
          break
        case 404:
          showError('请求的资源不存在')
          break
        case 408:
          showError('请求超时')
          break
        case 500:
          showError('服务器内部错误')
          break
        case 503:
          showError('服务不可用')
          break
        default:
          showError(data?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      showError('网络错误，请检查网络连接')
    } else {
      // 请求配置出错
      showError(error.message || '请求配置错误')
    }

    return Promise.reject(error)
  }
)

/**
 * 通用请求方法
 */
class Request {
  /**
   * GET 请求
   */
  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config }) as Promise<T>
  }

  /**
   * POST 请求
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config) as Promise<T>
  }

  /**
   * 下载文件
   */
  download(url: string, filename?: string): Promise<void> {
    // 常见 content-type 到文件后缀的映射
    const CONTENT_TYPE_EXT_MAP: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/amr': 'amr',
      'audio/silk': 'silk',
      'application/pdf': 'pdf',
      'application/zip': 'zip',
      'application/x-zip-compressed': 'zip',
      'application/gzip': 'gz',
      'application/x-rar-compressed': 'rar',
      'application/x-7z-compressed': '7z',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/json': 'json',
      'application/xml': 'xml',
      'application/octet-stream': '',
    }

    function extFromContentType(contentType: string): string {
      if (!contentType) return ''
      const mime = contentType.split(';')[0].trim().toLowerCase()
      return CONTENT_TYPE_EXT_MAP[mime] || ''
    }

    function hasExt(filename: string): boolean {
      const lastDot = filename.lastIndexOf('.')
      if (lastDot === -1) return false
      const ext = filename.slice(lastDot + 1).toLowerCase()
      return ext.length > 0 && ext.length <= 5
    }

    return service
      .get(url, { responseType: 'blob' })
      .then((response: any) => {
        const blob = response instanceof Blob ? response : new Blob([response])
        const contentType = blob.type || ''
        const ext = extFromContentType(contentType)
        let finalName = filename || 'download'
        if (ext && !hasExt(finalName)) {
          finalName = `${finalName}.${ext}`
        }
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = finalName
        link.click()
        window.URL.revokeObjectURL(link.href)
      })
  }

  all<T = any>(requests: Promise<any>[]): Promise<T[]> {
    return Promise.all(requests)
  }
}

/**
 * 导出请求实例
 */
export const request = new Request()

/**
 * 导出 axios 实例（用于特殊情况）
 */
export default service