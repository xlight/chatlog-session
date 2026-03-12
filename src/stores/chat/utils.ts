import type { Message } from '@/types/message'
import {
  createEmptyRangeMessage,
  createGapMessage,
  parseTimeRangeStart,
  parseTimeRangeEnd,
} from '@/types/message'
import { toCST, formatCSTRange, subtractDays } from '@/utils/timezone'
import { chatlogAPI } from '@/api'

/**
 * 判断是否为真实消息（排除 Gap / EmptyRange）
 */
export function isRealMessage(message: Message): boolean {
  return !message.isGap && !message.isEmptyRange
}

/**
 * 统一提取消息时间戳（毫秒）
 * 优先使用 time，回退 createTime
 */
export function getMessageTimestamp(message: Message): number {
  if (message.time) {
    const timeValue = new Date(message.time).getTime()
    if (!isNaN(timeValue)) {
      return timeValue
    }
  }

  if (!message.createTime) return 0
  return message.createTime < 10000000000 ? message.createTime * 1000 : message.createTime
}

/**
 * 比较消息先后顺序（旧 -> 新）
 */
export function compareMessageOrder(a: Message, b: Message): number {
  const timeDiff = getMessageTimestamp(a) - getMessageTimestamp(b)
  if (timeDiff !== 0) return timeDiff

  const seqDiff = (a.seq || 0) - (b.seq || 0)
  if (seqDiff !== 0) return seqDiff

  return (a.id || 0) - (b.id || 0)
}

/**
 * 检测批次方向
 */
export function detectBatchOrder(batch: Message[]): 'asc' | 'desc' | 'unknown' {
  if (!batch || batch.length < 2) return 'unknown'

  const firstTime = getMessageTimestamp(batch[0])
  const lastTime = getMessageTimestamp(batch[batch.length - 1])

  if (!firstTime || !lastTime || firstTime === lastTime) return 'unknown'
  return firstTime < lastTime ? 'asc' : 'desc'
}

/**
 * 归一化批次顺序为“旧 -> 新”
 */
export function normalizeBatchToChronological(batch: Message[], isDebug = false): Message[] {
  if (!batch || batch.length <= 1) return batch ? [...batch] : []

  const order = detectBatchOrder(batch)
  if (order === 'desc') {
    if (isDebug) {
      console.log('↩️ Normalize batch order: desc -> asc', {
        count: batch.length,
        first: batch[0]?.time,
        last: batch[batch.length - 1]?.time,
      })
    }
    return [...batch].reverse()
  }

  if (isDebug) {
    console.log('➡️ Keep batch order:', {
      order,
      count: batch.length,
      first: batch[0]?.time,
      last: batch[batch.length - 1]?.time,
    })
  }

  return [...batch]
}

/**
 * 线性合并两个有序消息数组（均为旧 -> 新）
 */
export function mergeChronologicalMessages(existing: Message[], incoming: Message[]): Message[] {
  if (!existing.length) return [...incoming]
  if (!incoming.length) return [...existing]

  const merged: Message[] = []
  let i = 0
  let j = 0

  while (i < existing.length && j < incoming.length) {
    if (compareMessageOrder(existing[i], incoming[j]) <= 0) {
      merged.push(existing[i])
      i++
    } else {
      merged.push(incoming[j])
      j++
    }
  }

  while (i < existing.length) {
    merged.push(existing[i])
    i++
  }

  while (j < incoming.length) {
    merged.push(incoming[j])
    j++
  }

  return merged
}

/**
 * 断言消息顺序是否单调（仅开发调试）
 */
export function assertChronologicalOrder(messages: Message[], isDebug = false, label = 'messages') {
  if (!isDebug || messages.length < 2) return

  for (let i = 1; i < messages.length; i++) {
    if (compareMessageOrder(messages[i - 1], messages[i]) > 0) {
      console.warn('⚠️ Message order violation detected', {
        label,
        index: i,
        prev: {
          id: messages[i - 1].id,
          seq: messages[i - 1].seq,
          time: messages[i - 1].time,
        },
        current: {
          id: messages[i].id,
          seq: messages[i].seq,
          time: messages[i].time,
        },
      })
      return
    }
  }
}

/**
 * 获取消息列表中最新消息的东八区时间
 */
export function getLatestMessageTime(messages: Message[]): string | undefined {
  if (!messages || messages.length === 0) return undefined
  const realMessages = messages.filter(isRealMessage)
  if (realMessages.length === 0) return undefined

  let latest = realMessages[0]
  for (let i = 1; i < realMessages.length; i++) {
    if (compareMessageOrder(realMessages[i], latest) > 0) {
      latest = realMessages[i]
    }
  }
  return latest.time
}

/**
 * 获取消息列表中最老消息的东八区时间
 */
export function getFirstMessageTime(messages: Message[]): string | undefined {
  if (!messages || messages.length === 0) return undefined
  const realMessages = messages.filter(isRealMessage)
  if (realMessages.length === 0) return undefined

  let oldest = realMessages[0]
  for (let i = 1; i < realMessages.length; i++) {
    if (compareMessageOrder(realMessages[i], oldest) < 0) {
      oldest = realMessages[i]
    }
  }
  return oldest.time
}

/**
 * 计算消息密度（条/天）
 * 基于已加载的消息分析时间分布
 */
export function calculateMessageDensity(messages: Message[], talker: string): number {
  const msgs = messages.filter(m => m.talker === talker && isRealMessage(m))
  if (msgs.length < 2) return 0 // 无法计算密度

  let minTime = Number.POSITIVE_INFINITY
  let maxTime = 0
  msgs.forEach(msg => {
    const ts = getMessageTimestamp(msg)
    if (!ts) return
    minTime = Math.min(minTime, ts)
    maxTime = Math.max(maxTime, ts)
  })

  if (!isFinite(minTime) || maxTime <= 0) return 0

  const timeSpanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24)
  if (timeSpanDays < 0.01) return msgs.length * 100 // 消息集中在很短时间内，认为超高密度

  const density = msgs.length / timeSpanDays
  return density
}

/**
 * 根据消息密度和 pageSize 确定初始时间范围（天数）
 */
export function getInitialDaysRange(
  messages: Message[],
  talker: string,
  limit: number,
  isDebug = false
): number {
  const density = calculateMessageDensity(messages, talker)

  if (density <= 0) {
    return Math.max(Math.ceil(limit / 5), 7) // 至少 7 天
  }

  let daysRange = Math.ceil(limit / density)
  const minDays = 0.5 // 最少半天
  const maxDays = 90 // 最多 90 天
  daysRange = Math.max(minDays, Math.min(maxDays, daysRange))

  if (isDebug) {
    console.log('📐 Calculate days range:', {
      density: density.toFixed(2),
      pageSize: limit,
      calculatedDays: Math.ceil(limit / density),
      finalDays: daysRange,
      estimatedMessages: Math.round(daysRange * density),
    })
  }

  return daysRange
}

/**
 * 消息去重
 */
export function deduplicateMessages(
  messages: Message[],
  newMessages: Message[],
  isDebug = false
): Message[] {
  const existingMessagesMap = new Map<string, Message>()
  messages.forEach(msg => {
    const key = `${msg.seq}_${msg.time}_${msg.talker}`
    existingMessagesMap.set(key, msg)
  })

  const uniqueNewMessages = newMessages.filter(newMsg => {
    const key = `${newMsg.seq}_${newMsg.time}_${newMsg.talker}`
    if (existingMessagesMap.has(key)) {
      const existingMsg = existingMessagesMap.get(key)!
      return !(
        existingMsg.sender === newMsg.sender &&
        existingMsg.type === newMsg.type &&
        existingMsg.content === newMsg.content &&
        JSON.stringify(existingMsg.contents) === JSON.stringify(newMsg.contents)
      )
    }
    return true
  })

  if (isDebug && uniqueNewMessages.length < newMessages.length) {
    console.log('🔍 Duplicate messages removed:', {
      total: newMessages.length,
      unique: uniqueNewMessages.length,
      duplicates: newMessages.length - uniqueNewMessages.length,
    })
  }

  return uniqueNewMessages
}

/**
 * 根据消息密度估算时间范围内的消息数量
 * @param messages 已有消息列表
 * @param talker 会话 ID
 * @param startTime 起始时间（毫秒时间戳）
 * @param endTime 结束时间（毫秒时间戳）
 * @returns 预估的消息数量
 */
export function estimateMessageCount(
  messages: Message[],
  talker: string,
  startTime: number,
  endTime: number
): number {
  const density = calculateMessageDensity(messages, talker)

  if (density <= 0) {
    return 0
  }

  const timeSpanDays = (endTime - startTime) / (1000 * 60 * 60 * 24)
  const estimatedCount = Math.round(density * timeSpanDays)

  return Math.max(0, estimatedCount)
}

/**
 * Gap 估算置信度
 */
export function getGapEstimateConfidence(
  messages: Message[],
  talker: string,
  startTime: number,
  endTime: number
): 'high' | 'medium' | 'low' {
  const realMessages = messages.filter(m => m.talker === talker && isRealMessage(m))
  const sampleSize = realMessages.length
  if (sampleSize < 80) return 'low'

  let minTs = Number.POSITIVE_INFINITY
  let maxTs = 0
  const dayBuckets = new Map<string, number>()

  realMessages.forEach(msg => {
    const ts = getMessageTimestamp(msg)
    if (!ts) return
    minTs = Math.min(minTs, ts)
    maxTs = Math.max(maxTs, ts)
    const dayKey = new Date(ts).toISOString().slice(0, 10)
    dayBuckets.set(dayKey, (dayBuckets.get(dayKey) || 0) + 1)
  })

  if (!isFinite(minTs) || maxTs <= minTs) return 'low'

  const spanDays = Math.max(1, (maxTs - minTs) / (1000 * 60 * 60 * 24))
  const values = Array.from(dayBuckets.values())
  const avg = values.reduce((sum, v) => sum + v, 0) / Math.max(values.length, 1)
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / Math.max(values.length, 1)
  const cv = avg > 0 ? Math.sqrt(variance) / avg : Number.POSITIVE_INFINITY

  const center = (minTs + maxTs) / 2
  const windowCenter = (startTime + endTime) / 2
  const windowDistanceDays = Math.abs(windowCenter - center) / (1000 * 60 * 60 * 24)

  if (sampleSize >= 200 && spanDays >= 7 && cv <= 1.2 && windowDistanceDays <= spanDays * 1.5) {
    return 'high'
  }

  if (sampleSize >= 80 && spanDays >= 3 && cv <= 2.0) {
    return 'medium'
  }

  return 'low'
}

/**
 * 解析 Gap 的时间范围（毫秒）
 */
export function parseGapRangeBounds(message: Message): { start: number; end: number } | null {
  if (!message.isGap || !message.gapData?.timeRange) return null

  const start = parseTimeRangeStart(message.gapData.timeRange)
  const end = parseTimeRangeEnd(message.gapData.timeRange)
  if (!start || !end || isNaN(start) || isNaN(end)) return null

  return { start: Math.min(start, end), end: Math.max(start, end) }
}

/**
 * 合并同会话 Gap 窗口
 */
export function mergeAdjacentGapMessages(
  list: Message[],
  talker: string,
  isDebug = false
): Message[] {
  const gaps = list.filter(msg => msg.isGap && msg.talker === talker)
  if (gaps.length <= 1) return list

  const nonGaps = list.filter(msg => !(msg.isGap && msg.talker === talker))
  const sortedGaps = [...gaps].sort((a, b) => {
    const aBounds = parseGapRangeBounds(a)
    const bBounds = parseGapRangeBounds(b)
    if (!aBounds || !bBounds) return compareMessageOrder(a, b)
    return aBounds.start - bBounds.start
  })

  const mergedGaps: Message[] = []
  sortedGaps.forEach(gap => {
    const bounds = parseGapRangeBounds(gap)
    if (!bounds) {
      mergedGaps.push(gap)
      return
    }

    const prev = mergedGaps[mergedGaps.length - 1]
    const prevBounds = prev ? parseGapRangeBounds(prev) : null

    if (!prev || !prevBounds || !isAdjacentOrOverlappingRange(prevBounds, bounds)) {
      mergedGaps.push(gap)
      return
    }

    const mergedStart = Math.min(prevBounds.start, bounds.start)
    const mergedEnd = Math.max(prevBounds.end, bounds.end)
    const mergedCount = (prev.gapData?.estimatedCount || 0) + (gap.gapData?.estimatedCount || 0)
    const confidencePriority: Record<'high' | 'medium' | 'low', number> = {
      low: 1,
      medium: 2,
      high: 3,
    }
    const prevConf = prev.gapData?.estimateConfidence || 'low'
    const curConf = gap.gapData?.estimateConfidence || 'low'
    const mergedConf =
      confidencePriority[prevConf] >= confidencePriority[curConf] ? prevConf : curConf

    mergedGaps[mergedGaps.length - 1] = createGapMessage(
      talker,
      mergedStart,
      mergedEnd,
      mergedCount > 0 ? mergedCount : undefined,
      mergedConf
    )
  })

  const merged = mergeChronologicalMessages(nonGaps, mergedGaps)

  if (isDebug && mergedGaps.length < gaps.length) {
    console.log('🧩 Merged Gap windows:', {
      talker,
      before: gaps.length,
      after: mergedGaps.length,
    })
  }

  return merged
}

/**
 * 获取历史加载锚点时间（优先虚拟消息）
 */
export function getHistoryAnchorBeforeTime(list: Message[]): string | number | undefined {
  const topMessage = list[0]
  if (!topMessage) return undefined

  if (topMessage.isEmptyRange && topMessage.emptyRangeData?.suggestedBeforeTime) {
    return new Date(topMessage.emptyRangeData.suggestedBeforeTime).toISOString()
  }

  if (topMessage.isGap && topMessage.gapData?.beforeTime) {
    return new Date(topMessage.gapData.beforeTime).toISOString()
  }

  return topMessage.time || topMessage.createTime
}

/**
 * 检查新加载的数据是否与已有数据衔接
 * @param newMessages 新加载的消息（原始数据，未去重）
 * @param existingMessages 已有的消息列表
 * @returns 是否衔接
 */
export function checkDataConnection(newMessages: Message[], existingMessages: Message[]): boolean {
  if (newMessages.length === 0) return false

  const existingReal = existingMessages.filter(isRealMessage)
  if (existingReal.length === 0) return false

  const normalizedNew = normalizeBatchToChronological(newMessages)
  const newReal = normalizedNew.filter(isRealMessage)
  if (newReal.length === 0) return false

  const existingSorted = [...existingReal].sort(compareMessageOrder)
  const newSorted = [...newReal].sort(compareMessageOrder)

  const existingFirst = existingSorted[0]
  const existingLast = existingSorted[existingSorted.length - 1]
  const newFirst = newSorted[0]
  const newLast = newSorted[newSorted.length - 1]

  const candidates: Array<[Message, Message]> = [
    [newLast, existingFirst],
    [newFirst, existingLast],
    [newFirst, existingFirst],
    [newLast, existingLast],
  ]

  for (const [a, b] of candidates) {
    if (a.seq === b.seq && a.time === b.time) {
      return true
    }
  }

  return false
}

/**
 * 检测时间间隙
 */
export function detectTimeGap(
  talker: string,
  timeRange: string,
  offset: number,
  newMessages: Message[],
  isDebug = false
): Message | null {
  if (offset === 0 && timeRange && newMessages.length > 0) {
    const requestedStartTime = parseTimeRangeStart(timeRange)
    const oldestReturnedMsg = newMessages[0]
    const oldestMsgTime = getMessageTimestamp(oldestReturnedMsg)

    const timeDiffSeconds = (oldestMsgTime - requestedStartTime) / 1000
    const gapThresholdSeconds = 600 // 600秒

    if (timeDiffSeconds > gapThresholdSeconds) {
      const gapStartDate = new Date(requestedStartTime)
      const gapEndDate = new Date(oldestMsgTime)
      const gapTimeRange = formatCSTRange(gapStartDate, gapEndDate)

      const newestMsgTime = oldestReturnedMsg.time
      const emptyRangeMessage = createEmptyRangeMessage(
        talker,
        gapTimeRange,
        newestMsgTime,
        0,
        requestedStartTime
      )

      if (isDebug) {
        console.log('📝 EmptyRange detected for time gap:', {
          talker,
          requestedStartTime: new Date(requestedStartTime).toISOString(),
          oldestMsgTime: new Date(oldestMsgTime).toISOString(),
          gapDays: (timeDiffSeconds / 86400).toFixed(1),
          gapTimeRange,
          suggestedBeforeTime: new Date(requestedStartTime).toISOString(),
        })
      }

      return emptyRangeMessage
    }
  }
  return null
}

/**
 * 解析 EmptyRange 的时间范围（毫秒）
 */
export function parseEmptyRangeBounds(message: Message): { start: number; end: number } | null {
  if (!message.isEmptyRange || !message.emptyRangeData?.timeRange) return null

  const timeRange = message.emptyRangeData.timeRange
  const start = parseTimeRangeStart(timeRange)
  const end = parseTimeRangeEnd(timeRange)

  if (!start || !end || isNaN(start) || isNaN(end)) return null
  return { start: Math.min(start, end), end: Math.max(start, end) }
}

/**
 * 判断两个时间范围是否相邻或重叠
 */
export function isAdjacentOrOverlappingRange(
  a: { start: number; end: number },
  b: { start: number; end: number },
  thresholdMs = 1000
): boolean {
  return Math.max(a.start, b.start) <= Math.min(a.end, b.end) + thresholdMs
}

/**
 * 合并顶部连续 EmptyRange（同 talker）
 */
export function mergeTopAdjacentEmptyRanges(
  messages: Message[],
  talker: string,
  isDebug = false
): Message[] {
  if (!messages.length) return messages

  const topEmptyRanges: Message[] = []
  let splitIndex = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.isEmptyRange && msg.talker === talker) {
      topEmptyRanges.push(msg)
      splitIndex = i + 1
      continue
    }
    break
  }

  if (topEmptyRanges.length <= 1) {
    return messages
  }

  const sorted = [...topEmptyRanges].sort((a, b) => {
    const aBounds = parseEmptyRangeBounds(a)
    const bBounds = parseEmptyRangeBounds(b)
    if (!aBounds || !bBounds) return compareMessageOrder(a, b)
    return aBounds.start - bBounds.start
  })

  const mergedSegments: Array<{ start: number; end: number; triedTimes: number }> = []
  sorted.forEach(msg => {
    const bounds = parseEmptyRangeBounds(msg)
    if (!bounds) return

    const last = mergedSegments[mergedSegments.length - 1]
    const current = {
      start: bounds.start,
      end: bounds.end,
      triedTimes: msg.emptyRangeData?.triedTimes || 0,
    }

    if (!last) {
      mergedSegments.push(current)
      return
    }

    if (isAdjacentOrOverlappingRange(last, current)) {
      last.start = Math.min(last.start, current.start)
      last.end = Math.max(last.end, current.end)
      last.triedTimes = Math.max(last.triedTimes, current.triedTimes)
    } else {
      mergedSegments.push(current)
    }
  })

  if (mergedSegments.length === topEmptyRanges.length) {
    return messages
  }

  const mergedEmptyMessages = mergedSegments.map(segment => {
    const mergedRange = formatCSTRange(new Date(segment.start), new Date(segment.end))
    return createEmptyRangeMessage(
      talker,
      mergedRange,
      undefined,
      segment.triedTimes,
      segment.start
    )
  })

  if (isDebug) {
    console.log('🧩 Merged top EmptyRange windows:', {
      talker,
      before: topEmptyRanges.length,
      after: mergedEmptyMessages.length,
      mergedSegments,
    })
  }

  return [...mergedEmptyMessages, ...messages.slice(splitIndex)]
}

/**
 * 在指定时间范围内加载消息
 */
export async function loadMessagesInTimeRange(
  talker: string,
  timeRange: string,
  limit: number,
  offset: number
): Promise<Message[]> {
  return await chatlogAPI.getSessionMessages(talker, timeRange, limit, offset, 1)
}

/**
 * 智能获取历史消息（包含重试逻辑）
 */
export async function fetchSmartHistoryMessages(
  messages: Message[],
  talker: string,
  beforeTime: string | number,
  limit: number,
  offset: number,
  isDebug = false
): Promise<{ result: Message[]; finalTimeRange: string; retryCount: number; daysRange: number }> {
  const beforeDate =
    typeof beforeTime === 'string' ? new Date(beforeTime) : new Date(beforeTime * 1000)

  const density = calculateMessageDensity(messages, talker)
  let daysRange = getInitialDaysRange(messages, talker, limit, isDebug)

  if (isDebug) {
    console.log('🔍 Load new time range:', {
      density: density.toFixed(2),
      initialDaysRange: daysRange,
      beforeTime,
      beforeDate: toCST(beforeDate),
      offset,
    })
  }

  let result: Message[] = []
  let finalTimeRange = ''
  let retryCount = 0
  const maxRetries = 3

  while (result.length === 0 && retryCount < maxRetries) {
    const startDate = subtractDays(beforeDate, daysRange)
    const timeRange = formatCSTRange(startDate, beforeDate)
    finalTimeRange = timeRange

    if (isDebug) {
      console.log(`🔄 Loading history attempt ${retryCount + 1}/${maxRetries}:`, {
        timeRange,
        daysRange,
        density: density.toFixed(2),
        offset,
        limit,
      })
    }

    result = await loadMessagesInTimeRange(talker, timeRange, limit, offset)

    if (result.length === 0) {
      daysRange *= 2
      retryCount++
    }
  }

  return { result, finalTimeRange, retryCount, daysRange }
}

/**
 * 处理空结果情况
 */
export function handleEmptyResult(
  messages: Message[],
  talker: string,
  timeRange: string,
  offset: number,
  retryCount: number,
  isDebug = false
): {
  messages: Message[]
  hasMore: boolean
  timeRange: string
  offset: number
  newMessages: Message[]
} {
  if (offset === 0) {
    const suggestedBeforeTime = parseTimeRangeStart(timeRange)
    const newestMsgTime = getFirstMessageTime(messages.filter(m => m.talker === talker))
    const emptyRangeMessage = createEmptyRangeMessage(
      talker,
      timeRange,
      newestMsgTime,
      retryCount,
      suggestedBeforeTime
    )

    if (isDebug) {
      console.log('📝 EmptyRange message created for empty history:', {
        talker,
        timeRange,
        triedTimes: retryCount,
        suggestedBeforeTime: new Date(suggestedBeforeTime).toISOString(),
      })
    }

    const newMessages = [emptyRangeMessage, ...messages]

    return {
      messages: newMessages,
      hasMore: true,
      timeRange,
      offset: 0,
      newMessages: [emptyRangeMessage],
    }
  } else {
    if (isDebug) {
      console.log('✅ Current time range completed, no more messages at offset:', offset)
    }
    return { messages, hasMore: false, timeRange, offset, newMessages: [] }
  }
}
