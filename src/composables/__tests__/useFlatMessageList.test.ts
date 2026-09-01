/**
 * useFlatMessageList 等价性基线测试
 *
 * 锁定当前 flatItems 计算行为：
 * - shouldDiffFromPrev: 不同发送者或时间间隔 > 5min 显示头像
 * - shouldShowTime: 时间间隔 > 5min 显示时间
 * - shouldShowName: 等价 shouldDiffFromPrev
 * - Gap/EmptyRange 消息作为独立虚拟项
 * - 日期分隔符 + load-more/no-more + bottom-hint
 *
 * 合并三元判断后全量跑通即证明等价。
 */
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useFlatMessageList } from '@/composables/useFlatMessageList'
import type { Message, MessageGroup } from '@/types/message'

function makeMessage(
  id: number,
  sender: string,
  createTime: number,
  type = 1,
  content = '',
): Message {
  return {
    id,
    seq: id,
    time: new Date(createTime * 1000).toISOString(),
    createTime,
    talker: 'wxid_test',
    talkerName: '测试',
    sender,
    senderName: sender,
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: type as never,
    subType: 0,
    content,
  }
}

function makeGroups(messages: Message[]): MessageGroup[] {
  if (messages.length === 0) return []
  const date = '2026-01-01'
  return [{
    date,
    formattedDate: '2026年1月1日',
    messages,
  }]
}

describe('useFlatMessageList 基线测试', () => {
  it('空消息列表只含 load-more + bottom-hint', () => {
    const groups = ref<MessageGroup[]>([])
    const hasMore = ref(true)
    const loadMsg = ref('')
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => hasMore.value),
      computed(() => loadMsg.value),
    )
    expect(flatItems.value).toEqual([
      { type: 'load-more', key: 'load-more' },
      { type: 'bottom-hint', key: 'bottom-hint' },
    ])
  })

  it('hasMoreHistory=false 时显示 no-more', () => {
    const groups = ref<MessageGroup[]>([])
    const hasMore = ref(false)
    const loadMsg = ref('')
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => hasMore.value),
      computed(() => loadMsg.value),
    )
    expect(flatItems.value[0]).toEqual({ type: 'no-more', key: 'no-more' })
  })

  it('historyLoadMessage 有值时不显示 load-more/no-more', () => {
    const groups = ref<MessageGroup[]>([])
    const hasMore = ref(true)
    const loadMsg = ref('加载中...')
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => hasMore.value),
      computed(() => loadMsg.value),
    )
    expect(flatItems.value[0]).not.toEqual({ type: 'load-more', key: 'load-more' })
    expect(flatItems.value[0]).not.toEqual({ type: 'no-more', key: 'no-more' })
  })

  it('单条消息：showAvatar=true, showTime=true, showName=true', () => {
    const msg = makeMessage(1, 'userA', 1735689600)
    const groups = ref(makeGroups([msg]))
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    expect(items[0]).toMatchObject({ type: 'no-more' })
    expect(items[1]).toMatchObject({ type: 'date', date: '2026-01-01' })
    expect(items[2]).toMatchObject({
      type: 'message',
      message: msg,
      showAvatar: true,
      showTime: true,
      showName: true,
    })
    expect(items[3]).toMatchObject({ type: 'bottom-hint' })
  })

  it('连续同一发送者且 < 5min：showAvatar=false, showName=false', () => {
    const msg1 = makeMessage(1, 'userA', 1735689600)
    const msg2 = makeMessage(2, 'userA', 1735689600 + 60) // 1min 后
    const groups = ref(makeGroups([msg1, msg2]))
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    // msg1 (index 0): showAvatar=true
    expect(items[2]).toMatchObject({ type: 'message', showAvatar: true, showName: true })
    // msg2 (index 1): 同一发送者，< 5min，showAvatar=false
    expect(items[3]).toMatchObject({ type: 'message', showAvatar: false, showName: false })
  })

  it('不同发送者：showAvatar=true, showName=true', () => {
    const msg1 = makeMessage(1, 'userA', 1735689600)
    const msg2 = makeMessage(2, 'userB', 1735689600 + 60)
    const groups = ref(makeGroups([msg1, msg2]))
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    expect(items[3]).toMatchObject({ type: 'message', showAvatar: true, showName: true })
  })

  it('同一发送者但 > 5min：showAvatar=true, showTime=true', () => {
    const msg1 = makeMessage(1, 'userA', 1735689600)
    const msg2 = makeMessage(2, 'userA', 1735689600 + 6 * 60) // 6min 后
    const groups = ref(makeGroups([msg1, msg2]))
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    expect(items[3]).toMatchObject({
      type: 'message',
      showAvatar: true,
      showTime: true,
      showName: true,
    })
  })

  it('同一发送者且 < 5min：showTime=false', () => {
    const msg1 = makeMessage(1, 'userA', 1735689600)
    const msg2 = makeMessage(2, 'userA', 1735689600 + 60)
    const groups = ref(makeGroups([msg1, msg2]))
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    expect(items[3]).toMatchObject({ type: 'message', showTime: false })
  })

  it('多日期分组：每组都有 date 分隔符', () => {
    const msg1 = makeMessage(1, 'userA', 1735689600)
    const msg2 = makeMessage(2, 'userA', 1735776000) // 次日
    const groups = ref([
      { date: '2026-01-01', formattedDate: '1月1日', messages: [msg1] },
      { date: '2026-01-02', formattedDate: '1月2日', messages: [msg2] },
    ])
    const { flatItems } = useFlatMessageList(
      computed(() => groups.value),
      computed(() => false),
      computed(() => ''),
    )
    const items = flatItems.value
    const dateItems = items.filter(i => i.type === 'date')
    expect(dateItems).toHaveLength(2)
    expect(dateItems[0]).toMatchObject({ date: '2026-01-01' })
    expect(dateItems[1]).toMatchObject({ date: '2026-01-02' })
  })
})
