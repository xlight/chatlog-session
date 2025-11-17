/**
 * 会话接口
 */
export interface Session {
  talker: string
  talkerName: string
  avatar: string
  remark?: string
  lastMessage: string
  lastTime: string
  lastMessageType: number
  unreadCount: number
  isPinned: boolean
  isChatRoom: boolean
  messageCount: number
}

/**
 * 会话详情接口
 */
export interface SessionDetail extends Session {
  alias?: string
  firstMessageTime?: string
  members?: ChatroomMember[]
  memberCount?: number
  owner?: string
}

/**
 * 群聊成员接口
 */
export interface ChatroomMember {
  wxid: string
  nickname: string
  displayName: string
  avatar?: string
}

/**
 * 会话类型枚举
 */
export enum SessionType {
  Friend = 'friend',
  Chatroom = 'chatroom',
  Official = 'official',
}

/**
 * 会话排序方式
 */
export enum SessionSortType {
  Time = 'time',
  Name = 'name',
  Unread = 'unread',
}