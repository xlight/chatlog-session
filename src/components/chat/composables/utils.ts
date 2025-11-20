import { FILE_SIZE_BASE, FILE_SIZE_UNITS } from './constants'

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(FILE_SIZE_BASE))
  return Math.round((bytes / Math.pow(FILE_SIZE_BASE, i)) * 100) / 100 + ' ' + FILE_SIZE_UNITS[i]
}

/**
 * 获取媒体消息的文本描述
 */
export function getMediaPlaceholder(type: number, subType?: number, fileName?: string): string {
  if (type === 3) return '[图片]'
  if (type === 34) return '[语音]'
  if (type === 43) return '[视频]'
  if (type === 47) return '[表情]'
  if (type === 49) {
    if (subType === 5) return '[链接]'
    if (subType === 6) return fileName ? `[文件] ${fileName}` : '[文件]'
    if (subType === 19) return '[聊天记录]'
  }
  return '[媒体]'
}