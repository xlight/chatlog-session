import { ref, onUnmounted } from 'vue'
import { sendmsgAPI, getStageLabel } from '@/api/sendmsg'
import type { SendTask } from '@/api/sendmsg'

export interface UseSendQueueOptions {
  autoRemoveDelay?: number
  onCompleted?: (task: SendTask) => void
  onFailed?: (task: SendTask) => void
  onCancelled?: (task: SendTask) => void
}

const POLLING_INTERVAL = 1000
const POLLING_TIMEOUT = 30000

export function useSendQueue(options: UseSendQueueOptions = {}) {
  const { autoRemoveDelay = 0, onCompleted, onFailed, onCancelled } = options

  const tasks = ref<SendTask[]>([])
  let taskIdCounter = 0

  const pollingTimers = new Map<number, ReturnType<typeof setInterval>>()
  const pollingStartTimes = new Map<number, number>()
  const autoRemoveTimers = new Map<number, ReturnType<typeof setTimeout>>()

  function addTask(contactName: string, content: string, contentPreview?: string): number {
    const id = ++taskIdCounter
    tasks.value.push({
      id,
      contactName,
      content,
      contentPreview: contentPreview ?? content,
      status: 'sending',
      createdAt: Date.now(),
    })
    return id
  }

  /** 注册一个已发送的 task（外部调用 sendmsgAPI.send 后），自动启动轮询 */
  function registerTask(task: Omit<SendTask, 'id'> & { id?: number }): number {
    const id = task.id ?? ++taskIdCounter
    tasks.value.push({
      ...task,
      id,
    } as SendTask)
    if (task.messageId) {
      startPolling(task.messageId, id)
    }
    return id
  }

  /** 注册一个已发送的 task（外部调用 sendmsgAPI.send 后），自动启动轮询 */
  function registerTask(task: Omit<SendTask, 'id'> & { id?: number }): number {
    const id = task.id ?? ++taskIdCounter
    tasks.value.push({
      ...task,
      id,
    } as SendTask)
    if (task.messageId) {
      startPolling(task.messageId, id)
    }
    return id
  }

  function updateTask(id: number, updates: Partial<SendTask>) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      Object.assign(task, updates)
    }
  }

  function removeTask(id: number) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    const autoRemoveTimer = autoRemoveTimers.get(id)
    if (autoRemoveTimer) {
      clearTimeout(autoRemoveTimer)
      autoRemoveTimers.delete(id)
    }
  }

  function scheduleAutoRemove(id: number) {
    if (autoRemoveDelay <= 0) return
    const timer = setTimeout(() => {
      removeTask(id)
    }, autoRemoveDelay)
    autoRemoveTimers.set(id, timer)
  }

  function startPolling(messageId: number, taskId: number) {
    pollingStartTimes.set(messageId, Date.now())

    const timer = setInterval(async () => {
      try {
        const response = await sendmsgAPI.getQueueStatus(messageId)

        const startTime = pollingStartTimes.get(messageId) || Date.now()
        if (Date.now() - startTime > POLLING_TIMEOUT) {
          stopPolling(messageId)
          const task = tasks.value.find(t => t.id === taskId)
          updateTask(taskId, { status: 'failed', error: '发送超时，请到微信确认' })
          if (task) onFailed?.(task)
          scheduleAutoRemove(taskId)
          return
        }

        if (!response.ok || !response.message) return

        const msgStatus = response.message.status

        if (msgStatus === 'completed') {
          stopPolling(messageId)
          const task = tasks.value.find(t => t.id === taskId)
          updateTask(taskId, { status: 'completed' })
          if (task) onCompleted?.(task)
          scheduleAutoRemove(taskId)
        } else if (msgStatus === 'failed') {
          stopPolling(messageId)
          const task = tasks.value.find(t => t.id === taskId)
          updateTask(taskId, { status: 'failed', error: response.message.error_message || '发送失败' })
          if (task) onFailed?.(task)
          scheduleAutoRemove(taskId)
        } else if (msgStatus === 'cancelled') {
          stopPolling(messageId)
          const task = tasks.value.find(t => t.id === taskId)
          updateTask(taskId, { status: 'cancelled', error: '消息已取消' })
          if (task) onCancelled?.(task)
          scheduleAutoRemove(taskId)
        } else if (msgStatus === 'processing') {
          if (response.message.stage) {
            updateTask(taskId, { stage: response.message.stage })
          }
        }
      } catch {
        const startTime = pollingStartTimes.get(messageId) || Date.now()
        if (Date.now() - startTime > POLLING_TIMEOUT) {
          stopPolling(messageId)
          const task = tasks.value.find(t => t.id === taskId)
          updateTask(taskId, { status: 'failed', error: '发送超时，请到微信确认' })
          if (task) onFailed?.(task)
          scheduleAutoRemove(taskId)
        }
      }
    }, POLLING_INTERVAL)

    pollingTimers.set(messageId, timer)
  }

  function stopPolling(messageId: number) {
    const timer = pollingTimers.get(messageId)
    if (timer) {
      clearInterval(timer)
      pollingTimers.delete(messageId)
    }
    pollingStartTimes.delete(messageId)
  }

  function stopAllPolling() {
    for (const timer of pollingTimers.values()) {
      clearInterval(timer)
    }
    pollingTimers.clear()
    pollingStartTimes.clear()
  }

  async function send(
    contactName: string,
    content: string,
    sendFn?: (contactName: string, content: string) => Promise<{ ok: boolean; message_id?: number; error?: string; message?: string }>,
  ): Promise<{ ok: boolean; taskId?: number; messageId?: number; error?: string }> {
    const taskId = addTask(contactName, content)

    try {
      const result = sendFn
        ? await sendFn(contactName, content)
        : await sendmsgAPI.send(contactName, content)

      if (!result.ok) {
        updateTask(taskId, { status: 'failed', error: result.error || result.message || '发送失败' })
        const task = tasks.value.find(t => t.id === taskId)
        if (task) onFailed?.(task)
        scheduleAutoRemove(taskId)
        return { ok: false, taskId, error: result.error || result.message || '发送失败' }
      }

      if (result.message_id !== undefined) {
        updateTask(taskId, { messageId: result.message_id })
        startPolling(result.message_id, taskId)
        return { ok: true, taskId, messageId: result.message_id }
      } else {
        updateTask(taskId, { status: 'completed' })
        const task = tasks.value.find(t => t.id === taskId)
        if (task) onCompleted?.(task)
        scheduleAutoRemove(taskId)
        return { ok: true, taskId }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '发送请求失败'
      updateTask(taskId, { status: 'failed', error: msg })
      const task = tasks.value.find(t => t.id === taskId)
      if (task) onFailed?.(task)
      scheduleAutoRemove(taskId)
      return { ok: false, taskId, error: msg }
    }
  }

  async function cancel(taskId: number) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task?.messageId) return

    try {
      const result = await sendmsgAPI.cancelJob(task.messageId)
      if (result.ok) {
        stopPolling(task.messageId)
        updateTask(taskId, { status: 'cancelled', error: '已取消' })
        onCancelled?.(task)
        scheduleAutoRemove(taskId)
      } else {
        throw new Error(result.error || '取消失败')
      }
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('取消失败')
    }
  }

  onUnmounted(() => {
    stopAllPolling()
    for (const timer of autoRemoveTimers.values()) {
      clearTimeout(timer)
    }
    autoRemoveTimers.clear()
  })

  return {
    tasks,
    send,
    cancel,
    remove: removeTask,
    getStageLabel,
    addTask: registerTask,
  }
}

/** Agent 发送队列单例（可在非组件代码中使用） */
export const agentSendQueue = useSendQueue({ autoRemoveDelay: 0 })
