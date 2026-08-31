import { formatFileSize } from '@/utils/format'
import { getMessagePlaceholder as getPlaceholderFromConfig } from '../message-types/config'

/**
 * 格式化文件大小（向后兼容转发）
 * @deprecated 新代码请直连 `@/utils/format` 的 `formatFileSize`。计划在后续清理 change 中移除。
 */
// Re-export formatFileSize for backward compatibility
export { formatFileSize }

/**
 * 获取媒体消息的文本描述
 * 现在使用集中配置
 * @deprecated 新代码请直连 `message-types/config` 的 `getMessagePlaceholder`。计划在后续清理 change 中移除。
 */
export function getMediaPlaceholder(type: number, subType?: number, fileName?: string): string {

  return getPlaceholderFromConfig(type, subType, fileName)
}

