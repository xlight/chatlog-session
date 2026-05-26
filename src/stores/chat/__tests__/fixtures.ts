import type { Message } from '@/types/message'
import { MessageType } from '@/types/message'

export function createMessage(overrides: Partial<Message> = {}): Message {
  const base: Message = {
    id: 1,
    seq: 1,
    time: '2026-05-15T10:00:00.000+08:00',
    createTime: 1747274400,
    talker: 'wxid_user',
    talkerName: 'User',
    sender: 'wxid_sender',
    senderName: 'Sender',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: MessageType.Text,
    subType: 0,
    content: 'hello',
  }
  return { ...base, ...overrides }
}

export function createMessageBatch(count: number, opts: Partial<Message> = {}): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMessage({
      id: i + 1,
      seq: i + 1,
      time: `2026-05-15T10:${String(i).padStart(2, '0')}:00.000+08:00`,
      createTime: 1747274400 + i * 60,
      content: `message-${i}`,
      ...opts,
    })
  )
}

export function createGapMessage(overrides: Partial<Message> = {}): Message {
  return createMessage({
    type: MessageType.Gap,
    isGap: true,
    gapData: {
      timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
      beforeTime: 1747188000000,
      estimatedCount: 100,
      estimateConfidence: 'medium',
    },
    ...overrides,
  })
}

export function createEmptyRangeMessage(overrides: Partial<Message> = {}): Message {
  return createMessage({
    type: MessageType.EmptyRange,
    isEmptyRange: true,
    emptyRangeData: {
      timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
      triedTimes: 1,
      suggestedBeforeTime: 1747188000000,
    },
    ...overrides,
  })
}