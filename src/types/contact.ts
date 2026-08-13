/**
 * 联系人类型枚举
 */
export enum ContactType {
  Friend = 'friend',
  Chatroom = 'chatroom',
  Official = 'official',
  Enterprise = 'enterprise',
}

/**
 * 联系人接口
 */
export interface Contact {
  wxid: string
  nickname?: string
  remark?: string
  alias?: string
  avatar?: string
  type: ContactType
  gender?: number
  province?: string
  city?: string
  signature?: string
  labelIds?: string[]
  labels?: string[]
  isStarred?: boolean
  starredAt?: number
  lastContactTime?: number
  memberList?: string[]
  // 后端新增字段
  isPinned?: boolean
  isMinimized?: boolean
  bigHeadImgUrl?: string
  smallHeadImgUrl?: string
  headImgMd5?: string
  // 索引和排序相关字段（缓存）
  pinyinInitial?: string
  sortKey?: string
}

/**
 * 群聊接口
 */
export interface Chatroom {
  chatroomId: string
  name: string
  avatar: string
  memberCount: number
  owner: string
  members: ChatroomMember[]
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
 * 联系人标签接口
 */
export interface ContactLabel {
  id: string
  name: string
  color?: string
}

/**
 * 性别枚举
 */
export enum Gender {
  Unknown = 0,
  Male = 1,
  Female = 2,
}

/**
 * 性别显示名称
 */
export const GenderNames: Record<Gender, string> = {
  [Gender.Unknown]: '未知',
  [Gender.Male]: '男',
  [Gender.Female]: '女',
}

/**
 * 群聊 API 响应接口
 */
export interface ChatroomApiResponse {
  items: ChatroomApiItem[]
}

/**
 * 群聊 API 单项数据
 */
export interface ChatroomApiItem {
  name: string
  owner: string
  users: ChatroomUserApiItem[]
  remark: string
  nickName: string
}

/**
 * 群聊用户 API 数据
 */
export interface ChatroomUserApiItem {
  userName: string
  displayName: string
}

/**
 * 后端返回的联系人数据结构
 */
export interface BackendContact {
  userName: string
  alias: string
  remark: string
  nickName: string
  isFriend: boolean
  isPinned?: boolean
  isMinimized?: boolean
  bigHeadImgUrl?: string
  smallHeadImgUrl?: string
  headImgMd5?: string
  /**
   * 认证标记（swagger model.Contact）：0=个人、8/24=公众号、29=服务号、其余大值=公众号认证
   */
  verifyFlag?: number
}

/**
 * 公众号画像（对齐后端 model.OfficialAccount，snake_case；
 * 区别于 getOfficialAccounts 返回的 Contact 子集——前者是画像维度，后者是列表筛选）
 */
export interface OfficialAccountProfile {
  /** 公众号 userName（gh_ 开头） */
  userName: string
  /** 品牌图标 URL */
  brandIconUrl: string
  /** 品牌标记 */
  brandFlag: number
  /** 品牌信息 */
  brandInfo: string
  /** 注册主体 */
  company: string
  /** 外部信息 */
  externalInfo: string
  /** 类目 */
  category: string
  /** 关联小程序 */
  miniPrograms: string[]
}

/**
 * 群公告（对齐后端 model.ChatroomAnnouncement，snake_case）
 */
export interface ChatroomAnnouncement {
  /** 群 ID（int64，前端 number 有精度边界，微信群 ID 在安全范围） */
  roomId: number
  /** 发布者 userName */
  userName: string
  /** 公告内容 */
  announcement: string
  /** 编辑者 */
  editor: string
  /** 发布时间（Unix 秒） */
  publishTime: number
  /** XML 原始公告 */
  xmlAnnouncement: string
}

/** 公众号画像查询参数 */
export interface OfficialAccountProfilesParams {
  /** 关键词模糊匹配 */
  keyword?: string
  limit?: number
  offset?: number
}

/** 群公告查询参数 */
export interface ChatroomAnnouncementsParams {
  /** 内容关键词模糊匹配 */
  content?: string
  limit?: number
  offset?: number
}