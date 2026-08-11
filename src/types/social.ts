/**
 * 社交 & 财务数据类型定义
 * 对应后端 /api/v1/transfer, /redpacket, /favorite, /moments
 */

// ==================== 转账记录 ====================

/** 转账记录 */
export interface Transfer {
  /** 转账 URL（唯一标识） */
  nativeUrl: string
  /** 消息 ID */
  msgId: string
  /** 发送方 ID */
  sendId: string
  /** 接收方 ID */
  receiveId: string
  /** 状态 */
  status: number
  /** 是否本人发出 */
  isSender: number
  /** 是否群聊 */
  isChatRoom: number
  /** 金额（分） */
  amount: number
  /** 币种 */
  currency: string
  /** 转账时间（Unix 时间戳） */
  transferTime: number
  /** 描述 */
  desc: string
  /** 类型 */
  type: number
}

/** 转账统计 */
export interface TransferStats {
  /** 发出笔数 */
  sentCount: number
  /** 收到笔数 */
  receivedCount: number
}

/** 转账列表响应 */
export interface TransferResponse {
  total: number
  items: Transfer[]
  stats: TransferStats
}

/** 转账查询参数 */
export interface TransferParams {
  direction?: 'all' | 'out' | 'in'
  year?: number
  limit?: number
  offset?: number
}

// ==================== 红包记录 ====================

/** 红包记录 */
export interface RedPacket {
  /** 红包 URL */
  nativeUrl: string
  /** 消息 ID */
  msgId: string
  /** 发送 ID */
  sendId: string
  /** 接收 ID */
  receiveId: string
  /** 状态 */
  status: number
  /** 是否本人发出 */
  isSender: number
  /** 是否群聊 */
  isChatRoom: number
  /** 金额（分） */
  amount: number
  /** 类型 */
  type: number
  /** 祝福语 */
  wish: string
  /** 时间（Unix 时间戳） */
  time: number
}

/** 红包统计 */
export interface RedPacketStats {
  /** 发出个数 */
  sentCount: number
  /** 收到个数 */
  receivedCount: number
}

/** 红包列表响应 */
export interface RedPacketResponse {
  total: number
  items: RedPacket[]
  stats: RedPacketStats
}

/** 红包查询参数 */
export interface RedPacketParams {
  direction?: 'all' | 'out' | 'in'
  limit?: number
  offset?: number
}

// ==================== 收藏 ====================

/** 收藏标签 */
export interface FavoriteTag {
  /** 本地 ID */
  localId: number
  /** 服务端 ID */
  serverId: number
  /** 标签名 */
  name: string
  /** 标签下收藏数量 */
  count?: number
}

/** 收藏条目 */
export interface Favorite {
  /** 本地 ID */
  localId: number
  /** 服务端 ID */
  serverId: number
  /** 来源用户 */
  fromUser: string
  /** 聊天名称 */
  chatName: string
  /** 类型 */
  type: number
  /** 更新时间（Unix 时间戳） */
  updateTime: number
  /** 同步状态 */
  syncStatus: number
  /** 内容（text-decodable 时返回） */
  content?: string
  /** 内容类型 */
  contentType: 'text' | 'protobuf'
  /** 内容大小（protobuf 时返回） */
  contentSize?: number
  /** 关联标签 */
  tags: FavoriteTag[]
}

/** 收藏列表响应 */
export interface FavoriteResponse {
  total: number
  items: Favorite[]
  tags: FavoriteTag[]
}

/** 收藏查询参数 */
export interface FavoriteParams {
  tag?: string
  type?: number
  keyword?: string
  limit?: number
  offset?: number
}

/** 收藏类型映射 */
export const FAVORITE_TYPE_MAP: Record<number, string> = {
  1: '文本',
  2: '图片',
  3: '语音',
  4: '视频',
  5: '链接',
  6: '文件',
  14: '位置',
  15: '音乐',
  16: '聊天记录',
}

// ==================== 朋友圈 ====================

/** 朋友圈评论 */
export interface MomentComment {
  /** 评论者用户名 */
  fromUsername: string
  /** 评论者昵称 */
  fromNickname: string
  /** 评论内容 */
  content: string
  /** 评论时间（Unix 时间戳） */
  createTime: number
}

/** 朋友圈点赞 */
export interface MomentLike {
  /** 点赞者用户名 */
  fromUsername: string
  /** 点赞者昵称 */
  fromNickname: string
}

/** 朋友圈动态 */
export interface Moment {
  /** 时间线 ID */
  tid: number
  /** 发布者用户名 */
  username: string
  /** 发布者昵称 */
  nickname: string
  /** 创建时间（Unix 时间戳） */
  createTime: number
  /** 类型 */
  type: number
  /** 内容 */
  content?: string
  /** 内容类型 */
  contentType: 'text' | 'protobuf'
  /** 评论列表 */
  comments: MomentComment[]
  /** 点赞列表 */
  likes: MomentLike[]
}

/** 朋友圈列表响应 */
export interface MomentsResponse {
  total: number
  items: Moment[]
}

/** 朋友圈查询参数 */
export interface MomentsParams {
  username?: string
  limit?: number
  offset?: number
}
