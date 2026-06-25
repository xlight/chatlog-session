/**
 * 格式化工具
 * 提供各种数据格式化方法
 */

import DOMPurify from 'dompurify'
import { MessageTypeNames, MessageType } from '@/types/message'

/**
 * 格式化文件大小
 * 
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  if (!bytes || bytes < 0) return '-'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

  return `${size} ${sizes[i]}`
}

/**
 * 格式化数字
 * 添加千分位分隔符
 * 
 * @param num 数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  if (!num && num !== 0) return '-'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化百分比
 * 
 * @param value 值
 * @param total 总数
 * @param decimals 小数位数
 * @returns 百分比字符串
 */
export function formatPercent(value: number, total: number, decimals = 2): string {
  if (!total || total === 0) return '0%'
  const percent = (value / total) * 100
  return `${percent.toFixed(decimals)}%`
}

/**
 * 格式化手机号
 * 中间四位显示为 *
 * 
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function formatPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 格式化身份证号
 * 中间部分显示为 *
 * 
 * @param idCard 身份证号
 * @returns 格式化后的身份证号
 */
export function formatIdCard(idCard: string): string {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

/**
 * 格式化银行卡号
 * 每四位添加空格
 * 
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号
 */
export function formatBankCard(cardNumber: string): string {
  if (!cardNumber) return ''
  return cardNumber.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * 格式化消息内容
 * 处理特殊字符、表情等
 * 
 * @param content 消息内容
 * @param maxLength 最大长度
 * @returns 格式化后的内容
 */
export function formatMessageContent(content: string, maxLength?: number): string {
  if (!content) return ''

  // 移除多余的空白字符
  let formatted = content.replace(/\s+/g, ' ').trim()

  // 如果有最大长度限制，进行截断
  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '...'
  }

  return formatted
}

/**
 * 格式化消息预览
 * 根据消息类型显示不同的预览文本
 * 
 * @param type 消息类型
 * @param content 消息内容
 * @returns 预览文本
 */
export function formatMessagePreview(type: number, content?: string): string {
  if (type === MessageType.Text) {
    return content || '[文本消息]'
  }

  const label = MessageTypeNames[type as MessageType]
  return label ? `[${label}]` : '[未知消息]'
}

/**
 * 格式化联系人名称
 * 优先级：备注 > 昵称 > 别名 > 微信号
 * 
 * @param contact 联系人对象
 * @returns 显示名称
 */
export function formatContactName(contact: {
  remark?: string
  nickname?: string
  alias?: string
  wxid?: string
}): string {
  return contact.remark || contact.nickname || contact.alias || contact.wxid || '未知联系人'
}

/**
 * 格式化语音时长
 * 
 * @param duration 时长（秒）
 * @returns 格式化后的时长
 */
export function formatVoiceDuration(duration: number): string {
  if (!duration || duration < 0) return '0″'
  
  if (duration < 60) {
    return `${Math.ceil(duration)}″`
  }

  const minutes = Math.floor(duration / 60)
  const seconds = Math.ceil(duration % 60)
  return `${minutes}′${seconds}″`
}

/**
 * 格式化视频时长
 * 
 * @param duration 时长（秒）
 * @returns 格式化后的时长 (MM:SS 或 HH:MM:SS)
 */
export function formatVideoDuration(duration: number): string {
  if (!duration || duration < 0) return '00:00'

  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = Math.floor(duration % 60)

  const pad = (num: number) => num.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * 格式化 URL
 * 确保 URL 有协议前缀
 * 
 * @param url URL 字符串
 * @returns 格式化后的 URL
 */
export function formatUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

/**
 * 截断文本
 * 
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * 高亮关键词
 * 
 * @param text 文本
 * @param keyword 关键词
 * @param highlightClass CSS 类名
 * @returns 高亮后的 HTML
 */
export function highlightKeyword(
  text: string,
  keyword: string,
  highlightClass = 'highlight'
): string {
  if (!text || !keyword) return escapeHtml(text)

  const escapedText = escapeHtml(text)
  const escapedKeyword = escapeHtml(keyword)
  const regex = new RegExp(`(${escapeRegExp(escapedKeyword)})`, 'gi')
  const html = escapedText.replace(regex, `<span class="${highlightClass}">$1</span>`)
  return DOMPurify.sanitize(html)
}

/**
 * 转义正则表达式特殊字符
 * 
 * @param str 字符串
 * @returns 转义后的字符串
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 转义 HTML 特殊字符
 * 
 * @param str 字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return str.replace(/[&<>"']/g, char => htmlEscapes[char])
}

/**
 * 解析 XML 内容（简单版）
 * 用于解析微信消息中的 XML 内容
 * 
 * @param xml XML 字符串
 * @returns 解析后的对象
 */
export function parseXmlContent(xml: string): Record<string, any> {
  const result: Record<string, any> = {}

  if (!xml) return result

  try {
    // 简单的 XML 解析（实际项目中应使用专业的 XML 解析库）
    const regex = /<(\w+)>([^<]*)<\/\1>/g
    let match

    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2]
    }

    return result
  } catch (error) {
    console.error('Parse XML failed:', error)
    return result
  }
}

/**
 * 格式化 JSON
 * 
 * @param obj 对象
 * @param indent 缩进空格数
 * @returns 格式化后的 JSON 字符串
 */
export function formatJson(obj: any, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent)
  } catch (error) {
    console.error('Format JSON failed:', error)
    return ''
  }
}

/**
 * 解析 JSON（安全）
 * 
 * @param str JSON 字符串
 * @param defaultValue 默认值
 * @returns 解析后的对象
 */
export function parseJson<T = any>(str: string, defaultValue: T | null = null): T | null {
  try {
    return JSON.parse(str) as T
  } catch (error) {
    console.error('Parse JSON failed:', error)
    return defaultValue
  }
}

/**
 * 格式化查询参数
 * 
 * @param params 参数对象
 * @returns 查询字符串
 */
export function formatQueryString(params: Record<string, any>): string {
  const queryParts: string[] = []

  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  })

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
}

/**
 * 解析查询参数
 * 
 * @param queryString 查询字符串
 * @returns 参数对象
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {}

  if (!queryString) return params

  const search = queryString.startsWith('?') ? queryString.slice(1) : queryString
  const pairs = search.split('&')

  pairs.forEach(pair => {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '')
    }
  })

  return params
}

/**
 * 格式化用户状态
 * 
 * @param status 状态值
 * @returns 状态文本
 */
export function formatUserStatus(status: number | string): string {
  const statusMap: Record<string | number, string> = {
    0: '离线',
    1: '在线',
    2: '忙碌',
    3: '离开',
    offline: '离线',
    online: '在线',
    busy: '忙碌',
    away: '离开',
  }

  return statusMap[status] || '未知'
}

/**
 * 格式化错误信息
 * 
 * @param error 错误对象
 * @returns 错误信息
 */
export function formatError(error: any): string {
  if (!error) return '未知错误'

  if (typeof error === 'string') return error

  if (error.message) return error.message

  if (error.msg) return error.msg

  return JSON.stringify(error)
}

/**
 * 驼峰转下划线
 * 
 * @param str 字符串
 * @returns 下划线格式
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * 下划线转驼峰
 * 
 * @param str 字符串
 * @returns 驼峰格式
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 首字母大写
 * 
 * @param str 字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 默认导出
 */
export default {
  formatFileSize,
  formatNumber,
  formatPercent,
  formatPhone,
  formatIdCard,
  formatBankCard,
  formatMessageContent,
  formatMessagePreview,
  formatContactName,
  formatVoiceDuration,
  formatVideoDuration,
  formatUrl,
  truncateText,
  highlightKeyword,
  escapeRegExp,
  escapeHtml,
  parseXmlContent,
  formatJson,
  parseJson,
  formatQueryString,
  parseQueryString,
  formatUserStatus,
  formatError,
  camelToSnake,
  snakeToCamel,
  capitalize,
}