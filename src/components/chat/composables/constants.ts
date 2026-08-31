/**
 * 文件大小单位
 * @deprecated 使用 `@/types/message` 中的 `FileSizeUnits` 和 `FileSizeBase` 替代。计划在后续清理 change 中移除。
 */
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const
export const FILE_SIZE_BASE = 1024

/**
 * 小写版本
 * @deprecated 使用 `@/types/message` 中的 `FileSizeUnits` 和 `FileSizeBase` 替代。计划在后续清理 change 中移除。
 */
export const fileSizeUnits = ['B', 'KB', 'MB', 'GB'] as const
export const fileSizeBase = 1024