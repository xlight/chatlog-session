import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const CST_TZ = 'Asia/Shanghai'

/**
 * 将 Date 转换为 CST（中国标准时间）ISO 字符串
 * 使用 dayjs.tz 替代手写 +8h 偏移
 */
export function toCST(date: Date): string {
  return dayjs(date).tz(CST_TZ).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
}

/**
 * 格式化 CST 时间（HH:mm:ss）
 */
export function formatCSTTime(date: Date): string {
  return dayjs(date).tz(CST_TZ).format('HH:mm:ss')
}

/**
 * 格式化 CST 时间范围
 */
export function formatCSTRange(startDate: Date, endDate: Date): string {
  return `${toCST(startDate)}~${toCST(endDate)}`
}

/**
 * 格式化 CST 日期（YYYY-MM-DD）
 */
export function formatCSTDate(date: Date): string {
  return dayjs(date).tz(CST_TZ).format('YYYY-MM-DD')
}

/**
 * 减去指定天数
 */
export function subtractDays(date: Date, days: number): Date {
  return dayjs(date).subtract(days, 'day').toDate()
}
