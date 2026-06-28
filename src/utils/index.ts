/**
 * 工具函数统一导出
 */

export * from './request'
export * from './storage'
export * from './date'
export * from './format'

// 默认导出
export { default as request } from './request'
export { default as dateUtils } from './date'
export { default as storage } from './storage'
export { default as formatUtils } from './format'

/**
 * 常用工具快捷导出
 */
export {
  // Date utils
  formatTimestamp,
  formatMessageTime,
  formatSessionTime,
  formatDateGroup,
  formatDuration,
  isSameDay,
  isToday,
  getTimestamp,
} from './date'

export {
  // Storage utils
  setLocal,
  getLocal,
  removeLocal,
  clearLocal,
  setSession,
  getSession,
  removeSession,
  clearSession,
} from './storage'

export {
  formatFileSize,
  formatNumber,
} from './format'