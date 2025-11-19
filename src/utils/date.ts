/**
 * 日期时间处理工具
 * 提供统一的日期格式化和处理方法
 */

/**
 * 格式化时间戳为可读字符串
 * 
 * @param timestamp 时间戳（秒或毫秒）
 * @param format 格式类型
 * @returns 格式化后的字符串
 */
export function formatTimestamp(
  timestamp: number,
  format: 'full' | 'date' | 'time' | 'datetime' | 'relative' = 'full'
): string {
  if (!timestamp) return ''

  // 统一转换为毫秒
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  const date = new Date(ms)

  switch (format) {
    case 'full':
      return formatFullDate(date)
    case 'date':
      return formatDate(date)
    case 'time':
      return formatTime(date)
    case 'datetime':
      return formatDateTime(date)
    case 'relative':
      return formatRelativeTime(date)
    default:
      return date.toLocaleString('zh-CN')
  }
}

/**
 * 格式化完整日期时间
 * 格式：2025年11月17日 18:30:45
 */
export function formatFullDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = padZero(date.getHours())
  const minute = padZero(date.getMinutes())
  const second = padZero(date.getSeconds())

  return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`
}

/**
 * 格式化日期
 * 格式：2025-11-17
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())

  return `${year}-${month}-${day}`
}

/**
 * 格式化时间
 * 格式：18:30:45
 */
export function formatTime(date: Date): string {
  const hour = padZero(date.getHours())
  const minute = padZero(date.getMinutes())
  const second = padZero(date.getSeconds())

  return `${hour}:${minute}:${second}`
}

/**
 * 格式化日期时间
 * 格式：2025-11-17 18:30:45
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 格式化相对时间
 * 例如：刚刚、5分钟前、今天 18:30、昨天 18:30、11-17 18:30
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  // const days = Math.floor(hours / 24)

  // 刚刚（1分钟内）
  if (minutes < 1) {
    return '刚刚'
  }

  // N分钟前（1小时内）
  if (minutes < 60) {
    return `${minutes}分钟前`
  }

  // N小时前（今天）
  if (isSameDay(date, now)) {
    if (hours < 5) {
      return `${hours}小时前`
    }
    return `今天 ${formatTime(date).slice(0, 5)}`
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return `昨天 ${formatTime(date).slice(0, 5)}`
  }

  // 今年内
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}-${padZero(date.getDate())} ${formatTime(date).slice(0, 5)}`
  }

  // 往年
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`
}

/**
 * 格式化消息时间
 * 用于消息列表中的时间显示
 */
export function formatMessageTime(timestamp: number | string): string {
  if (!timestamp) return ''

  // 支持 ISO 8601 字符串或 Unix 时间戳
  const date = typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp)
  const now = new Date()

  // 今天：只显示时间
  if (isSameDay(date, now)) {
    return formatTime(date).slice(0, 5) // HH:MM
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return `昨天 ${formatTime(date).slice(0, 5)}`
  }

  // 本周内
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  if (date >= weekStart) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekdays[date.getDay()]} ${formatTime(date).slice(0, 5)}`
  }

  // 今年内
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 往年
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 格式化会话列表时间
 * 用于会话列表中最后消息时间的显示
 */
export function formatSessionTime(timestamp: number): string {
  if (!timestamp) return ''

  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  const date = new Date(ms)
  const now = new Date()

  // 今天：只显示时间
  if (isSameDay(date, now)) {
    return formatTime(date).slice(0, 5) // HH:MM
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return '昨天'
  }

  // 本周内
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  if (date >= weekStart) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }

  // 今年内
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 往年
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * 格式化日期分组标题
 * 用于消息列表中按日期分组的标题
 */
export function formatDateGroup(timestamp: number): string {
  if (!timestamp) return ''

  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  const date = new Date(ms)
  const now = new Date()

  // 今天
  if (isSameDay(date, now)) {
    return '今天'
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return '昨天'
  }

  // 前天
  const dayBeforeYesterday = new Date(now)
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
  if (isSameDay(date, dayBeforeYesterday)) {
    return '前天'
  }

  // 本周内
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  if (date >= weekStart) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }

  // 今年内
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 往年
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 判断两个日期是否为同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * 判断是否为今天
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * 判断是否为昨天
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

/**
 * 判断是否为本周
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  return date >= weekStart
}

/**
 * 判断是否为今年
 */
export function isThisYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear()
}

/**
 * 补零
 */
export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

/**
 * 获取时间戳（秒）
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * 获取时间戳（毫秒）
 */
export function getTimestampMs(): number {
  return Date.now()
}

/**
 * 解析时间字符串为时间戳
 * 支持格式：
 * - timestamp (秒或毫秒)
 * - YYYY-MM-DD
 * - YYYY-MM-DD HH:mm:ss
 * - YYYY/MM/DD
 * - start-end (时间范围)
 */
export function parseTimeString(timeStr: string): number | [number, number] {
  if (!timeStr) return 0

  // 时间范围
  if (timeStr.includes('-') && timeStr.split('-').length === 2) {
    const [start, end] = timeStr.split('-')
    return [parseTimeString(start) as number, parseTimeString(end) as number]
  }

  // 纯数字，视为时间戳
  if (/^\d+$/.test(timeStr)) {
    const timestamp = parseInt(timeStr)
    // 如果是毫秒时间戳，转换为秒
    return timestamp > 10000000000 ? Math.floor(timestamp / 1000) : timestamp
  }

  // 日期字符串
  const date = new Date(timeStr.replace(/\//g, '-'))
  return Math.floor(date.getTime() / 1000)
}

/**
 * 格式化持续时间
 * 例如：125 秒 -> 02:05
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${padZero(h)}:${padZero(m)}:${padZero(s)}`
  }

  return `${padZero(m)}:${padZero(s)}`
}

/**
 * 格式化文件时间
 * 用于文件修改时间等
 */
export function formatFileTime(timestamp: number): string {
  return formatTimestamp(timestamp, 'datetime')
}

/**
 * 获取日期范围
 * 
 * @param type 范围类型
 * @returns [开始时间戳, 结束时间戳]
 */
export function getDateRange(
  type: 'today' | 'yesterday' | 'week' | 'month' | 'year'
): [number, number] {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break

    case 'yesterday':
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break

    case 'week':
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break

    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      break

    case 'year':
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11)
      end.setDate(31)
      end.setHours(23, 59, 59, 999)
      break
  }

  return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
}

/**
 * 获取时间差描述
 * 例如：2天3小时前
 */
export function getTimeDiff(timestamp: number): string {
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  const diff = Date.now() - ms
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) {
    return `${years}年前`
  }
  if (months > 0) {
    return `${months}个月前`
  }
  if (days > 0) {
    return `${days}天前`
  }
  if (hours > 0) {
    return `${hours}小时前`
  }
  if (minutes > 0) {
    return `${minutes}分钟前`
  }
  return '刚刚'
}

/**
 * 默认导出
 */
export default {
  formatTimestamp,
  formatFullDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatMessageTime,
  formatSessionTime,
  formatDateGroup,
  formatDuration,
  formatFileTime,
  isSameDay,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  padZero,
  getTimestamp,
  getTimestampMs,
  parseTimeString,
  getDateRange,
  getTimeDiff,
}