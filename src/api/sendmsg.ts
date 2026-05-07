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
}

/** 队列消息状态 */
export interface QueueMessageStatus {
  id: number
  status: string
  contact_name?: string
  content?: string
  error?: string
  created_at?: string
  updated_at?: string
}

/** 服务状态 */
export interface ServiceStatus {
  status: string
  wechat_logged_in?: boolean
  message?: string
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
      content,
    })
    return data
  },

  /**
   * 查询队列消息状态
   * GET /api/v1/queue/messages/{messageId}
   */
  async getQueueStatus(messageId: number): Promise<QueueMessageStatus> {
    const client = createSendmsgClient()
    const { data } = await client.get(`/api/v1/queue/messages/${messageId}`)
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
