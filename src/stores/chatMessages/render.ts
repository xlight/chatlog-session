/**
 * chatMessages store - render 子模块
 *
 * 消息分组/分类 computed + 分批渲染 + 跳转滚动
 */
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Message } from '@/types/message'
import { formatDateGroup, formatDate } from '@/utils/date'
import type { ChatMessagesCore } from './core'

export interface ChatMessagesRender {
  // State
  scrollTargetId: Ref<number | null>
  isBatchRendering: Ref<boolean>
  batchRenderAbort: Ref<AbortController | null>

  // Getters
  messagesByDate: ComputedRef<Array<{ date: string; formattedDate: string; messages: Message[] }>>
  mediaMessages: ComputedRef<Message[]>
  imageMessages: ComputedRef<Message[]>
  videoMessages: ComputedRef<Message[]>
  fileMessages: ComputedRef<Message[]>

  // Actions
  abortBatchRender: () => void
  batchRenderMessages: (newMessages: Message[], batchSize?: number) => Promise<void>
  jumpToMessage: (messageId: number) => Promise<void>

  // $reset render 部分
  $resetRender: () => void
}

export function useChatMessagesRender(core: ChatMessagesCore): ChatMessagesRender {
  const { appStore, currentMessages, messages, getMessageById } = core

  // ==================== State ====================

  const scrollTargetId = ref<number | null>(null)
  const isBatchRendering = ref(false)
  const batchRenderAbort = ref<AbortController | null>(null)

  // ==================== Getters ====================

  const messagesByDate = computed(() => {
    if (appStore.isDebug) console.time(`[Perf] messagesByDate (${currentMessages.value.length} msgs)`)
    const grouped: Record<string, { formattedDate: string; messages: Message[] }> = {}

    currentMessages.value.forEach(message => {
      const timestamp = message.time || message.createTime

      if (appStore.isDebug && !timestamp) {
        console.warn('⚠️ Message missing time fields:', {
          id: message.id,
          seq: message.seq,
          time: message.time,
          createTime: message.createTime,
        })
        return
      }

      const dateObj =
        typeof timestamp === 'string'
          ? new Date(timestamp)
          : new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp)

      if (isNaN(dateObj.getTime())) {
        if (appStore.isDebug) {
          console.warn('⚠️ Invalid date format:', { timestamp, message })
        }
        return
      }

      const canonicalDate = formatDate(dateObj)
      const formattedDate = formatDateGroup(timestamp)

      if (!grouped[canonicalDate]) {
        grouped[canonicalDate] = {
          formattedDate,
          messages: [],
        }
      }
      grouped[canonicalDate].messages.push(message)
    })

    const result = Object.entries(grouped).map(([date, data]) => ({
      date,
      formattedDate: data.formattedDate,
      messages: data.messages,
    }))
    if (appStore.isDebug) console.timeEnd(`[Perf] messagesByDate (${currentMessages.value.length} msgs)`)
    return result
  })

  /**
   * 消息分类（单遍计算，避免四个 filter computed 独立全量遍历）
   */
  const classifiedMessages = computed(() => {
    const msgs = currentMessages.value
    const media: Message[] = []
    const image: Message[] = []
    const video: Message[] = []
    const file: Message[] = []
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i]
      const t = msg.type
      if (t === 3) {
        image.push(msg)
        media.push(msg)
      } else if (t === 43) {
        video.push(msg)
        media.push(msg)
      } else if (t === 49) {
        file.push(msg)
        media.push(msg)
      } else if (t === 34 || t === 47) {
        media.push(msg)
      }
    }
    return { media, image, video, file }
  })

  const mediaMessages = computed(() => classifiedMessages.value.media)
  const imageMessages = computed(() => classifiedMessages.value.image)
  const videoMessages = computed(() => classifiedMessages.value.video)
  const fileMessages = computed(() => classifiedMessages.value.file)

  // ==================== Actions ====================

  function abortBatchRender() {
    if (batchRenderAbort.value) {
      batchRenderAbort.value.abort()
      batchRenderAbort.value = null
    }
    isBatchRendering.value = false
  }

  async function batchRenderMessages(newMessages: Message[], batchSize: number = 20): Promise<void> {
    abortBatchRender()

    if (newMessages.length <= batchSize) {
      messages.value = newMessages
      return
    }

    const controller = new AbortController()
    batchRenderAbort.value = controller
    isBatchRendering.value = true

    try {
      let index = 0

      while (index < newMessages.length && !controller.signal.aborted) {
        const end = Math.min(index + batchSize, newMessages.length)
        const batch = newMessages.slice(0, end)

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            if (controller.signal.aborted) {
              resolve()
              return
            }
            messages.value = batch
            resolve()
          })
        })

        index = end
      }
    } finally {
      if (batchRenderAbort.value === controller) {
        batchRenderAbort.value = null
        isBatchRendering.value = false
      }
    }
  }

  async function jumpToMessage(messageId: number) {
    const message = getMessageById(messageId)
    if (!message) {
      return
    }
    scrollTargetId.value = messageId
  }

  function $resetRender() {
    scrollTargetId.value = null
  }

  return {
    scrollTargetId,
    isBatchRendering,
    batchRenderAbort,
    messagesByDate,
    mediaMessages,
    imageMessages,
    videoMessages,
    fileMessages,
    abortBatchRender,
    batchRenderMessages,
    jumpToMessage,
    $resetRender,
  }
}
