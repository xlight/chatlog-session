/**
 * 消息格式化工具
 * 提供消息导出为纯文本、Markdown 和 CSV 格式的统一实现
 */

import dayjs from 'dayjs'
import type { Message } from '@/types/message'

/**
 * 将消息列表格式化为纯文本
 *
 * @param messages 消息列表
 * @returns 纯文本格式的消息内容
 */
export function formatMessagesAsText(messages: Message[]): string {
  const lines = messages.map(msg => {
    const time = dayjs(msg.time).format('YYYY-MM-DD HH:mm:ss')
    const sender = msg.senderName || msg.sender
    const content = msg.content || '[非文本消息]'
    return `[${time}] ${sender}: ${content}`
  })

  return lines.join('\n')
}

/**
 * 将消息列表格式化为 Markdown
 *
 * @param messages 消息列表
 * @param sessionName 会话名称
 * @returns Markdown 格式的消息内容
 */
export function formatMessagesAsMarkdown(messages: Message[], sessionName: string): string {
  const lines: string[] = []

  // 添加标题
  lines.push(`# ${sessionName} 聊天记录`)
  lines.push('')
  lines.push(`**导出时间:** ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)
  lines.push(`**消息数量:** ${messages.length} 条`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // 按日期分组
  let currentDate = ''

  for (const msg of messages) {
    const msgDate = dayjs(msg.time).format('YYYY-MM-DD')
    const msgTime = dayjs(msg.time).format('HH:mm:ss')
    const sender = msg.senderName || msg.sender

    // 如果日期变化，添加日期标题
    if (msgDate !== currentDate) {
      currentDate = msgDate
      lines.push(`## ${msgDate}`)
      lines.push('')
    }

    // 添加消息
    const isSelf = msg.isSelf ? '**自己**' : sender
    const content = msg.content || '[非文本消息]'

    lines.push(`**${isSelf}** *${msgTime}*`)
    lines.push('')
    lines.push(content)
    lines.push('')

    // 如果有媒体文件，添加链接
    if (msg.fileUrl) {
      lines.push(`[📎 附件: ${msg.fileName || '媒体文件'}](${msg.fileUrl})`)
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * CSV 字段转义（RFC 4180）
 * 含逗号、双引号或换行的字段用双引号包裹，内部双引号双写
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * 将消息列表格式化为 CSV（RFC 4180 兼容）
 *
 * @param messages 消息列表
 * @returns CSV 格式的消息内容
 */
export function formatMessagesAsCSV(messages: Message[]): string {
  const header = ['seq', 'time', 'sender', 'senderName', 'isSelf', 'type', 'content']
  const rows = [header.join(',')]

  for (const msg of messages) {
    const row = [
      escapeCSVField(String(msg.seq ?? '')),
      escapeCSVField(dayjs(msg.time).format('YYYY-MM-DD HH:mm:ss')),
      escapeCSVField(msg.sender || ''),
      escapeCSVField(msg.senderName || ''),
      escapeCSVField(String(msg.isSelf ? 1 : 0)),
      escapeCSVField(String(msg.type ?? '')),
      escapeCSVField(msg.content || ''),
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * 将备份数据格式化为纯文本（多会话）
 *
 * @param data 备份数据，包含 sessions 数组
 * @returns 纯文本格式的备份内容
 */
export function formatBackupAsText(data: { exportTime: string; sessions: Array<{ sessionName: string; messageCount: number; messages: Message[] }> }): string {
  const lines: string[] = []
  lines.push(`备份时间: ${data.exportTime}`)
  lines.push(`会话数量: ${data.sessions.length}`)
  lines.push('='.repeat(50))

  for (const session of data.sessions) {
    lines.push(`\n【${session.sessionName}】(${session.messageCount} 条消息)`)
    lines.push('-'.repeat(50))

    for (const msg of session.messages) {
      const time = dayjs(msg.time).format('YYYY-MM-DD HH:mm:ss')
      const sender = msg.senderName || msg.sender
      const content = msg.content || '[非文本消息]'
      lines.push(`[${time}] ${sender}: ${content}`)
    }
  }

  return lines.join('\n')
}

/**
 * 将备份数据格式化为 Markdown（多会话）
 *
 * @param data 备份数据，包含 sessions 数组
 * @returns Markdown 格式的备份内容
 */
export function formatBackupAsMarkdown(data: { exportTime: string; sessions: Array<{ sessionName: string; messageCount: number; messages: Message[] }> }): string {
  const lines: string[] = []
  lines.push(`# Chatlog Session 数据备份`)
  lines.push('')
  lines.push(`**备份时间:** ${data.exportTime}`)
  lines.push(`**会话数量:** ${data.sessions.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const session of data.sessions) {
    lines.push(`## ${session.sessionName}`)
    lines.push('')
    lines.push(`**消息数量:** ${session.messageCount}`)
    lines.push('')

    for (const msg of session.messages) {
      const time = dayjs(msg.time).format('YYYY-MM-DD HH:mm:ss')
      const sender = msg.senderName || msg.sender
      const content = msg.content || '[非文本消息]'

      lines.push(`**${sender}** *${time}*`)
      lines.push('')
      lines.push(content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}
