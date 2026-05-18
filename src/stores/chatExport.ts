/**
 * Chat Export 子 Store
 *
 * 将 ChatExportDialog.vue 中的导出状态和逻辑下沉到 store
 * chat.ts 的 exportSelectedMessages 是空 stub，真正的导出逻辑在此
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { chatlogAPI } from '@/api/chatlog'
import { downloadJSON, downloadText, downloadMarkdown } from '@/utils/download'
import { formatMessagesAsText, formatMessagesAsMarkdown, formatMessagesAsCSV } from '@/utils/message-format'
import type { Message } from '@/types/message'
import dayjs from 'dayjs'

/**
 * 导出阶段类型
 */
export type ExportStage = 'config' | 'progress' | 'complete' | 'error'

/**
 * 导出格式类型
 */
export type ExportFormat = 'json' | 'csv' | 'txt' | 'markdown'

/**
 * 导出模式类型
 */
export type ExportMode = 'file' | 'clipboard'

/**
 * 时间范围类型
 */
export type TimeRangeType = 'all' | 'last7Days' | 'last30Days' | 'custom'

export const useChatExportStore = defineStore('chatExport', () => {
  // ==================== State ====================

  const stage = ref<ExportStage>('config')
  const exportFormat = ref<ExportFormat>('json')
  const exportMode = ref<ExportMode>('file')
  const timeRangeType = ref<TimeRangeType>('all')
  const customStartDate = ref('')
  const customEndDate = ref('')
  const messageTypeFilter = ref<'all' | 'text' | 'withMedia'>('all')
  const progress = ref(0)
  const processedCount = ref(0)
  const totalEstimate = ref(0)
  const estimatedTimeRemaining = ref(0)
  const errorMessage = ref('')
  const exportedFilename = ref('')
  const exportStartTime = ref<Date | null>(null)
  const abortController = ref<AbortController | null>(null)

  // ==================== Getters ====================

  const dialogTitle = computed(() => {
    switch (stage.value) {
      case 'config':
        return '导出聊天记录'
      case 'progress':
        return '正在导出...'
      case 'complete':
        return '导出完成'
      case 'error':
        return '导出失败'
      default:
        return '导出聊天记录'
    }
  })

  const isTimeRangeValid = computed(() => {
    if (timeRangeType.value !== 'custom') {
      return true
    }
    if (!customStartDate.value || !customEndDate.value) {
      return false
    }
    const start = dayjs(customStartDate.value)
    const end = dayjs(customEndDate.value)
    return start.isValid() && end.isValid() && !start.isAfter(end)
  })

  const estimatedTimeText = computed(() => {
    if (estimatedTimeRemaining.value <= 0) {
      return '计算中...'
    }
    if (estimatedTimeRemaining.value < 60) {
      return `${Math.ceil(estimatedTimeRemaining.value)} 秒`
    }
    const minutes = Math.ceil(estimatedTimeRemaining.value / 60)
    return `${minutes} 分钟`
  })

  const currentTimeRange = computed(() => {
    const now = dayjs()

    switch (timeRangeType.value) {
      case 'last7Days':
        return `${now.subtract(7, 'day').format('YYYY-MM-DD')}~${now.format('YYYY-MM-DD')}`
      case 'last30Days':
        return `${now.subtract(30, 'day').format('YYYY-MM-DD')}~${now.format('YYYY-MM-DD')}`
      case 'custom':
        if (customStartDate.value && customEndDate.value) {
          return `${customStartDate.value}~${customEndDate.value}`
        }
        return now.format('YYYY-MM-DD')
      case 'all':
      default:
        return `2010-01-01~${now.format('YYYY-MM-DD')}`
    }
  })

  // ==================== Actions ====================

  function handleProgressUpdate(current: number, total: number) {
    processedCount.value = current
    totalEstimate.value = total
    progress.value = total > 0 ? Math.round((current / total) * 100) : 0

    if (exportStartTime.value && current > 0) {
      const elapsed = (Date.now() - exportStartTime.value.getTime()) / 1000
      const rate = current / elapsed
      const remaining = (total - current) / rate
      estimatedTimeRemaining.value = Math.max(0, remaining)
    }
  }

  function filterMessagesByType(messages: Message[]): Message[] {
    switch (messageTypeFilter.value) {
      case 'text':
        return messages.filter(msg => msg.type === 1 && msg.content)
      case 'withMedia':
        return messages.filter(msg => msg.type === 1 || msg.fileUrl)
      case 'all':
      default:
        return messages
    }
  }

  function formatMessagesForClipboard(messages: Message[], sessionName: string): string {
    switch (exportFormat.value) {
      case 'json':
        return JSON.stringify(messages, null, 2)
      case 'txt':
        return formatMessagesAsText(messages)
      case 'markdown':
        return formatMessagesAsMarkdown(messages, sessionName)
      case 'csv':
        return formatMessagesAsCSV(messages)
    }
  }

  async function exportMessages(messages: Message[], sessionId: string, sessionName: string) {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
    const safeSessionName = (sessionName || '聊天记录').replace(/[\\/:*?"<>|]/g, '_')

    switch (exportFormat.value) {
      case 'json':
        exportedFilename.value = `${safeSessionName}_聊天记录_${timestamp}.json`
        downloadJSON(messages, exportedFilename.value.replace('.json', ''))
        break
      case 'txt':
        exportedFilename.value = `${safeSessionName}_聊天记录_${timestamp}.txt`
        const textContent = formatMessagesAsText(messages)
        downloadText(textContent, exportedFilename.value.replace('.txt', ''))
        break
      case 'markdown':
        exportedFilename.value = `${safeSessionName}_聊天记录_${timestamp}.md`
        const markdownContent = formatMessagesAsMarkdown(messages, safeSessionName)
        downloadMarkdown(markdownContent, exportedFilename.value.replace('.md', ''))
        break
      case 'csv':
        exportedFilename.value = `${safeSessionName}_聊天记录_${timestamp}.csv`
        await chatlogAPI.exportCSV(
          { talker: sessionId, time: currentTimeRange.value },
          exportedFilename.value
        )
        break
    }
  }

  async function startExport(sessionId: string, sessionName: string) {
    if (!isTimeRangeValid.value || !sessionId) {
      return
    }

    stage.value = 'progress'
    exportStartTime.value = new Date()
    abortController.value = new AbortController()

    try {
      const timeRange = currentTimeRange.value

      const messages = await chatlogAPI.exportWithProgress(sessionId, timeRange, {
        signal: abortController.value.signal,
        onProgress: handleProgressUpdate,
      })

      const filteredMessages = filterMessagesByType(messages)

      await exportMessages(filteredMessages, sessionId, sessionName)

      stage.value = 'complete'
    } catch (error) {
      if (error instanceof Error && error.message === '导出已取消') {
        resetState()
      } else {
        errorMessage.value = error instanceof Error ? error.message : '导出失败，请重试'
        stage.value = 'error'
      }
    }
  }

  async function startCopyToClipboard(sessionId: string, sessionName: string) {
    if (!isTimeRangeValid.value || !sessionId) {
      return
    }

    exportMode.value = 'clipboard'
    stage.value = 'progress'
    exportStartTime.value = new Date()
    abortController.value = new AbortController()

    try {
      const timeRange = currentTimeRange.value

      const messages = await chatlogAPI.exportWithProgress(sessionId, timeRange, {
        signal: abortController.value.signal,
        onProgress: handleProgressUpdate,
      })

      const filteredMessages = filterMessagesByType(messages)
      const text = formatMessagesForClipboard(filteredMessages, sessionName)

      await navigator.clipboard.writeText(text)

      stage.value = 'complete'
      ElMessage.success('已复制到剪贴板')
    } catch (error) {
      if (error instanceof Error && error.message === '导出已取消') {
        resetState()
      } else if (error instanceof Error && error.name === 'NotAllowedError') {
        errorMessage.value = '复制失败，请检查浏览器权限'
        stage.value = 'error'
        ElMessage.error(errorMessage.value)
      } else {
        errorMessage.value = error instanceof Error ? error.message : '复制失败，请重试'
        stage.value = 'error'
        ElMessage.error(errorMessage.value)
      }
    }
  }

  function cancelExport() {
    if (abortController.value) {
      abortController.value.abort()
    }
  }

  function retryExport() {
    stage.value = 'config'
    errorMessage.value = ''
  }

  function resetState() {
    stage.value = 'config'
    exportFormat.value = 'json'
    exportMode.value = 'file'
    timeRangeType.value = 'all'
    customStartDate.value = ''
    customEndDate.value = ''
    messageTypeFilter.value = 'all'
    progress.value = 0
    processedCount.value = 0
    totalEstimate.value = 0
    estimatedTimeRemaining.value = 0
    errorMessage.value = ''
    exportedFilename.value = ''
    exportStartTime.value = null
    abortController.value = null
  }

  function $reset() {
    resetState()
  }

  return {
    // State
    stage,
    exportFormat,
    exportMode,
    timeRangeType,
    customStartDate,
    customEndDate,
    messageTypeFilter,
    progress,
    processedCount,
    totalEstimate,
    estimatedTimeRemaining,
    errorMessage,
    exportedFilename,
    exportStartTime,

    // Getters
    dialogTitle,
    isTimeRangeValid,
    estimatedTimeText,
    currentTimeRange,

    // Actions
    startExport,
    startCopyToClipboard,
    cancelExport,
    retryExport,
    resetState,
    $reset,
  }
})
