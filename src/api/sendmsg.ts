/**
 * Sendmsg API
 *
 * 独立封装 wechat-sendmsg 服务的 API，不走 chatlog 的 request.ts 拦截器
 * 默认连接 http://127.0.0.1:8765
 */

import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

/** 创建独立 axios 实例，baseURL 从 settings store 读取 */
function createSendmsgClient() {
  const settingsStore = useSettingsStore()
  const baseURL = settingsStore.sendmsg.apiUrl.replace(/\/+$/, '')

  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/** 发送消息响应 */
export interface SendMessageResponse {
  ok: boolean
  mode?: string
  message_id?: number
  message?: string
  error?: string
}

/** 发送阶段标签映射 */
export const STAGE_LABEL_MAP: Record<string, string> = {
  find_window: '查找微信窗口...',
  search_contact: '搜索联系人...',
  verify_chat: '验证聊天窗口...',
  send_text: '发送消息...',
}

/** 获取发送阶段显示文本 */
export function getStageLabel(stage?: string): string {
  if (!stage) return '发送中...'
  return STAGE_LABEL_MAP[stage] ?? stage
}

/** 统一发送任务 */
export interface SendTask {
  id: number
  contactName: string
  content: string
  contentPreview: string
  messageId?: number
  status: 'sending' | 'completed' | 'failed' | 'cancelled'
  stage?: string
  error?: string
  createdAt: number
}

/** 队列消息详情 */
export interface QueueMessageDetail {
  id: number
  contact_name: string
  message: string
  status: string
  mode: string
  priority: number
  retry_count: number
  max_retries: number
  error_message: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
  stage?: string | null
}

/** 队列消息状态响应 */
export interface QueueMessageStatusResponse {
  ok: boolean
  message?: QueueMessageDetail
  error?: string
}

/** 微信状态详情 */
export interface WechatStatus {
  wechat_available: boolean
  window_handle?: number
  wechat_version?: string
  is_nt_framework?: boolean
  supported?: boolean
  platform?: string
  framework_type?: string
}

/** 服务状态 */
export interface ServiceStatus {
  ok: boolean
  wechat_status?: WechatStatus
  error?: string
}

/** 取消任务响应 */
export interface CancelJobResponse {
  ok: boolean
  message?: string
  error?: string
}

/** 连接测试结果 */
export interface TestConnectionResult {
  success: boolean
  error?: string
}

export const sendmsgAPI = {
  /**
   * 检测 wechat-sendmsg 服务状态
   * GET /api/v1/status
   */
  async status(): Promise<ServiceStatus> {
    const client = createSendmsgClient()
    const { data } = await client.get('/api/v1/status')
    return data
  },

  /**
   * 发送消息
   * POST /api/v1/messages/send
   */
  async send(contactName: string, content: string): Promise<SendMessageResponse> {
    const client = createSendmsgClient()
    const { data } = await client.post('/api/v1/messages/send', {
      contact_name: contactName,
      message: content,
    })
    return data
  },

  /**
   * 发送文件
   * POST /api/v1/messages/send-file
   */
  async sendFile(contactName: string, fileName: string, fileBase64: string, mode = 'queue'): Promise<SendMessageResponse> {
    const client = createSendmsgClient()
    const { data } = await client.post('/api/v1/messages/send-file', {
      contact_name: contactName,
      mode,
      file_name: fileName,
      file_base64: fileBase64,
    })
    return data
  },

  /**
   * 发送图片
   * POST /api/v1/messages/send-image
   */
  async sendImage(contactName: string, fileName: string, fileBase64: string, mode = 'queue'): Promise<SendMessageResponse> {
    const client = createSendmsgClient()
    const { data } = await client.post('/api/v1/messages/send-image', {
      contact_name: contactName,
      mode,
      file_name: fileName,
      file_base64: fileBase64,
    })
    return data
  },

  /**
   * 发送图片（multipart/form-data 上传）
   * POST /api/v1/messages/send-image
   */
  async sendImageUpload(contactName: string, file: File, mode = 'queue'): Promise<SendMessageResponse> {
    const client = createSendmsgClient()
    const formData = new FormData()
    formData.append('contact_name', contactName)
    formData.append('mode', mode)
    formData.append('file', file)
    const { data } = await client.post('/api/v1/messages/send-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * 发送文件（multipart/form-data 上传）
   * POST /api/v1/messages/send-file
   */
  async sendFileUpload(contactName: string, file: File, mode = 'queue'): Promise<SendMessageResponse> {
    const client = createSendmsgClient()
    const formData = new FormData()
    formData.append('contact_name', contactName)
    formData.append('mode', mode)
    formData.append('file', file)
    const { data } = await client.post('/api/v1/messages/send-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * 查询队列消息状态
   * GET /api/v1/queue/messages/{messageId}
   * 响应格式: { ok: true, message: { id, status, ... } }
   */
  async getQueueStatus(messageId: number): Promise<QueueMessageStatusResponse> {
    const client = createSendmsgClient()
    const { data } = await client.get(`/api/v1/queue/messages/${messageId}`)
    return data
  },

  /**
   * 取消队列中的发送任务
   * POST /api/v1/queue/messages/{messageId}/cancel
   */
  async cancelJob(messageId: number): Promise<CancelJobResponse> {
    const client = createSendmsgClient()
    const { data } = await client.post(`/api/v1/queue/messages/${messageId}/cancel`)
    return data
  },

  /**
   * 测试连接是否可用
   */
  async testConnection(): Promise<TestConnectionResult> {
    try {
      const client = createSendmsgClient()
      await client.get('/api/v1/status', { timeout: 5000 })
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '连接失败'
      return { success: false, error: message }
    }
  },
}
