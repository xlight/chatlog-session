import { describe, it, expect } from 'vitest'
import { MessageType, RichMessageSubType } from '@/types/message'
import type { Message } from '@/types/message'
import { getMessageSummary } from '../config'

function createMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    seq: 1,
    time: '2026-06-11T12:00:00.000+08:00',
    createTime: 1747291200,
    talker: 'wxid_test',
    talkerName: 'Test',
    sender: 'wxid_sender',
    senderName: 'Sender',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: MessageType.Text,
    subType: 0,
    content: 'hello',
    ...overrides,
  }
}

describe('getMessageSummary', () => {
  it('文本消息直接返回 content', () => {
    const msg = createMsg({ type: MessageType.Text, content: '你好' })
    expect(getMessageSummary(msg)).toBe('你好')
  })

  it('文本消息 content 为空返回空字符串', () => {
    const msg = createMsg({ type: MessageType.Text, content: '' })
    expect(getMessageSummary(msg)).toBe('')
  })

  it('语音消息追加时长', () => {
    const msg = createMsg({ type: MessageType.Voice, subType: 0, duration: 30 })
    expect(getMessageSummary(msg)).toBe('[语音] 30秒')
  })

  it('语音消息无 duration 不追加', () => {
    const msg = createMsg({ type: MessageType.Voice, subType: 0 })
    expect(getMessageSummary(msg)).toBe('[语音]')
  })

  it('位置消息提取 label', () => {
    const msg = createMsg({ type: MessageType.Location, subType: 0, contents: { label: '北京市天安门' } })
    expect(getMessageSummary(msg)).toBe('[位置] 北京市天安门')
  })

  it('位置消息降级 title', () => {
    const msg = createMsg({ type: MessageType.Location, subType: 0, contents: { title: '某地点' } })
    expect(getMessageSummary(msg)).toBe('[位置] 某地点')
  })

  it('位置消息无地点名只返回占位符', () => {
    const msg = createMsg({ type: MessageType.Location, subType: 0 })
    expect(getMessageSummary(msg)).toBe('[位置]')
  })

  it('语音通话消息追加 content', () => {
    const msg = createMsg({ type: MessageType.VoiceCall, subType: 0, content: '通话 5 分钟' })
    expect(getMessageSummary(msg)).toBe('[语音通话] 通话 5 分钟')
  })

  it('系统消息追加 content', () => {
    const msg = createMsg({ type: MessageType.System, subType: 0, content: '你邀请张三加入了群聊' })
    expect(getMessageSummary(msg)).toBe('[未知消息] 你邀请张三加入了群聊')
  })

  it('链接消息追加标题和 URL', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Link,
      contents: { title: '新闻标题', url: 'https://example.com' },
    })
    expect(getMessageSummary(msg)).toBe('[链接：新闻标题](https://example.com)')
  })

  it('链接消息只有标题时只返回标题', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Link,
      contents: { title: '新闻标题' },
    })
    expect(getMessageSummary(msg)).toBe('[链接：新闻标题]')
  })

  it('链接消息只有 URL 时', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Link,
      contents: { url: 'https://example.com' },
    })
    expect(getMessageSummary(msg)).toBe('[链接](https://example.com)')
  })

  it('视频链接消息追加标题和 URL', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.VideoLink,
      contents: { title: '视频标题', url: 'https://video.com/abc' },
    })
    expect(getMessageSummary(msg)).toBe('[视频链接：视频标题](https://video.com/abc)')
  })

  it('视频链接消息只有标题', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.VideoLink,
      contents: { title: '视频标题' },
    })
    expect(getMessageSummary(msg)).toBe('[视频链接：视频标题]')
  })

  it('视频链接消息只有 URL', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.VideoLink,
      contents: { url: 'https://video.com/abc' },
    })
    expect(getMessageSummary(msg)).toBe('[视频链接](https://video.com/abc)')
  })

  it('子类型 Text(subType=1) 的 contents.title 是 URL', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Text,
      contents: { title: 'https://mp.weixin.qq.com/s/abc' },
    })
    expect(getMessageSummary(msg)).toBe('[链接](https://mp.weixin.qq.com/s/abc)')
  })

  it('子类型 Text(subType=1) 无 URL 时只返回占位符', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Text,
    })
    expect(getMessageSummary(msg)).toBe('[链接]')
  })

  it('引用消息追加引用原文和回复正文', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '是的，我也是这么想的',
      contents: {
        title: '引用的消息内容',
        refer: { content: '今天天气真好', senderName: '张三', type: MessageType.Text },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @张三: "今天天气真好"] 是的，我也是这么想的')
  })

  it('引用消息只有引用原文时仅显示引用', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '',
      contents: {
        title: '引用的消息内容',
        refer: { content: '今天天气真好', senderName: '张三', type: MessageType.Text },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @张三: "今天天气真好"]')
  })

  it('引用消息只有回复内容时回退到纯文本', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '是的，我也是这么想的',
    })
    expect(getMessageSummary(msg)).toBe('[引用消息] 是的，我也是这么想的')
  })

  it('引用消息无任何内容时只返回占位符', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '',
    })
    expect(getMessageSummary(msg)).toBe('[引用消息]')
  })

  it('引用消息引用文件时显示文件描述', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '@杨欢 供应商信息填好了',
      contents: {
        title: '引用的消息内容',
        refer: { senderName: '刘振江xLight', type: MessageType.File, subType: RichMessageSubType.File, fileName: '附件2 供应商收款信息表 (3).xlsx' },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @刘振江xLight: 文件: 附件2 供应商收款信息表 (3).xlsx] @杨欢 供应商信息填好了')
  })

  it('引用消息引用图片时显示图片', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '收到',
      contents: {
        refer: { senderName: '李四', type: MessageType.Image },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @李四: 图片] 收到')
  })

  it('引用消息引用语音时显示语音', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '好的',
      contents: {
        refer: { senderName: '王五', type: MessageType.Voice, duration: 15 },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @王五: 语音(15秒)] 好的')
  })

  it('引用消息引用链接时显示链接描述', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Refer,
      content: '看看这个',
      contents: {
        refer: {
          senderName: '赵六',
          type: MessageType.File,
          subType: RichMessageSubType.Link,
          contents: { title: '新闻标题' },
        },
      },
    })
    expect(getMessageSummary(msg)).toBe('[引用消息 @赵六: 链接: 新闻标题] 看看这个')
  })

  it('转发消息追加标题和条数', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Forwarded,
      contents: { title: '群聊消息', recordInfo: { DataList: { Count: '3' } } },
    })
    expect(getMessageSummary(msg)).toBe('[聊天记录] 群聊消息(3条)')
  })

  it('转发消息无 count 时只返回标题', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Forwarded,
      contents: { title: '群聊消息' },
    })
    expect(getMessageSummary(msg)).toBe('[聊天记录] 群聊消息')
  })

  it('小程序消息标题嵌入括号', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.MiniProgram,
      contents: { title: '企业文件' },
    })
    expect(getMessageSummary(msg)).toBe('[小程序 企业文件]')
  })

  it('小程序消息无标题时只返回占位符', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.MiniProgram,
    })
    expect(getMessageSummary(msg)).toBe('[小程序]')
  })

  it('购物小程序消息标题嵌入括号', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.ShoppingMiniProgram,
      contents: { title: '商品详情' },
    })
    expect(getMessageSummary(msg)).toBe('[购物小程序 商品详情]')
  })

  it('小视频消息标题嵌入括号', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.ShortVideo,
      contents: { title: '搞笑视频' },
    })
    expect(getMessageSummary(msg)).toBe('[小视频 搞笑视频]')
  })

  it('直播消息标题嵌入括号', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Live,
      contents: { title: '正在直播' },
    })
    expect(getMessageSummary(msg)).toBe('[直播 正在直播]')
  })

  it('拍一拍消息追加 content', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Pat,
      content: '你拍了拍张三',
    })
    expect(getMessageSummary(msg)).toBe('[拍一拍] 你拍了拍张三')
  })

  it('转账消息追加 content', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Transfer,
      content: '转账 100 元',
    })
    expect(getMessageSummary(msg)).toBe('[转账] 转账 100 元')
  })

  it('QQ音乐不追加信息', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.QQMusic,
    })
    expect(getMessageSummary(msg)).toBe('[QQ音乐]')
  })

  it('红包不追加信息', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.RedPacket,
    })
    expect(getMessageSummary(msg)).toBe('[红包]')
  })

  it('收藏不追加信息', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.Favorite,
    })
    expect(getMessageSummary(msg)).toBe('[收藏]')
  })

  it('未知消息类型返回占位符', () => {
    const msg = createMsg({ type: 99999 as MessageType, content: '' })
    expect(getMessageSummary(msg)).toBe('[未知消息]')
  })

  it('图片消息不追加信息', () => {
    const msg = createMsg({ type: MessageType.Image, subType: 0 })
    expect(getMessageSummary(msg)).toBe('[图片]')
  })

  it('视频消息不追加信息', () => {
    const msg = createMsg({ type: MessageType.Video, subType: 0 })
    expect(getMessageSummary(msg)).toBe('[视频]')
  })

  it('文件消息显示文件名', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.File,
      fileName: '附件2 供应商收款信息表 (3).xlsx',
    })
    expect(getMessageSummary(msg)).toBe('[文件：附件2 供应商收款信息表 (3).xlsx]')
  })

  it('文件下载中显示文件名', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.FileDownloading,
      fileName: 'document.pdf',
    })
    expect(getMessageSummary(msg)).toBe('[文件：document.pdf]')
  })

  it('文件消息无 fileName 时使用默认占位符', () => {
    const msg = createMsg({
      type: MessageType.File,
      subType: RichMessageSubType.File,
    })
    expect(getMessageSummary(msg)).toBe('[文件]')
  })
})
