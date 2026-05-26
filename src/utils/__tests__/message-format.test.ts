import { describe, it, expect } from 'vitest'
import {
  formatMessagesAsText,
  formatMessagesAsMarkdown,
  formatMessagesAsCSV,
  formatBackupAsText,
  formatBackupAsMarkdown,
} from '@/utils/message-format'
import { createMessage, createMessageBatch } from '@/stores/chat/__tests__/fixtures'

describe('formatMessagesAsText', () => {
  it('returns each message on its own line with time/sender/content', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00Z', senderName: 'Alice', content: 'hi' }),
      createMessage({ time: '2026-05-15T11:00:00Z', senderName: 'Bob', content: 'hello' }),
    ]
    const result = formatMessagesAsText(msgs)
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Alice')
    expect(lines[0]).toContain('hi')
    expect(lines[1]).toContain('Bob')
    expect(lines[1]).toContain('hello')
  })

  it('falls back to "[非文本消息]" when content is missing', () => {
    const result = formatMessagesAsText([createMessage({ content: '' })])
    expect(result).toContain('[非文本消息]')
  })

  it('falls back to sender when senderName missing', () => {
    const result = formatMessagesAsText([
      createMessage({ senderName: '', sender: 'wxid_x', content: 'x' }),
    ])
    expect(result).toContain('wxid_x')
  })

  it('returns empty string for empty array', () => {
    expect(formatMessagesAsText([])).toBe('')
  })
})

describe('formatMessagesAsMarkdown', () => {
  it('includes session name and message count', () => {
    const msgs = createMessageBatch(2)
    const result = formatMessagesAsMarkdown(msgs, 'TestRoom')
    expect(result).toContain('# TestRoom 聊天记录')
    expect(result).toContain('**消息数量:** 2 条')
  })

  it('groups messages by date with H2 headings', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00Z' }),
      createMessage({ time: '2026-05-16T10:00:00Z' }),
    ]
    const result = formatMessagesAsMarkdown(msgs, 's')
    const dateHeadings = result.match(/^## \d{4}-\d{2}-\d{2}/gm) ?? []
    expect(dateHeadings.length).toBe(2)
  })

  it('marks self messages as **自己**', () => {
    const result = formatMessagesAsMarkdown([createMessage({ isSelf: true })], 's')
    expect(result).toContain('**自己**')
  })

  it('renders attachment link when fileUrl is set', () => {
    const result = formatMessagesAsMarkdown(
      [createMessage({ fileUrl: 'http://x/file', fileName: 'a.zip' })],
      's'
    )
    expect(result).toContain('a.zip')
    expect(result).toContain('http://x/file')
  })
})

describe('formatMessagesAsCSV', () => {
  it('starts with the header row', () => {
    const result = formatMessagesAsCSV([])
    expect(result.split('\n')[0]).toBe('seq,time,sender,senderName,isSelf,type,content')
  })

  it('escapes commas, double quotes, and newlines per RFC 4180', () => {
    const result = formatMessagesAsCSV([
      createMessage({ content: 'hello, "world"\nnext' }),
    ])
    const dataRow = result.split('\n').slice(1).join('\n')
    expect(dataRow).toContain('"hello, ""world""\nnext"')
  })

  it('serializes isSelf as 1/0', () => {
    const result = formatMessagesAsCSV([createMessage({ isSelf: true })])
    const row = result.split('\n')[1]
    expect(row.split(',')[4]).toBe('1')
  })
})

describe('formatBackupAsText', () => {
  it('includes export time and session count', () => {
    const data = {
      exportTime: '2026-05-15 10:00:00',
      sessions: [
        {
          sessionName: 'Room1',
          messageCount: 1,
          messages: [createMessage({ content: 'x' })],
        },
      ],
    }
    const result = formatBackupAsText(data)
    expect(result).toContain('2026-05-15 10:00:00')
    expect(result).toContain('会话数量: 1')
    expect(result).toContain('Room1')
  })
})

describe('formatBackupAsMarkdown', () => {
  it('includes top-level title and per-session H2 headings', () => {
    const data = {
      exportTime: '2026-05-15 10:00:00',
      sessions: [
        { sessionName: 'A', messageCount: 1, messages: [createMessage({ content: 'x' })] },
        { sessionName: 'B', messageCount: 0, messages: [] },
      ],
    }
    const result = formatBackupAsMarkdown(data)
    expect(result).toContain('# Chatlog Session 数据备份')
    expect(result).toContain('## A')
    expect(result).toContain('## B')
  })
})