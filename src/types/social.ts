/**
 * 社交 & 财务数据类型定义
 * 对应后端 /api/v1/transfer, /redpacket, /favorite, /moments
 */

// ==================== 转账记录 ====================

/** 转账记录（对齐后端 model.Transfer，字段为 snake_case 转换后） */
export interface Transfer {
  /** 转账唯一 ID */
  transferId: string
  /** 交易 ID */
  transcationId: string
  /** 消息服务 ID */
  messageServerId: number
  /** 第二消息服务 ID */
  secondMessageServerId: number
  /** 会话名（wxid/群 ID） */
  sessionName: string
  /** 支付子类型 */
  paySubType: number
  /** 收款方 wxid */
  payReceiver: string
  /** 付款方 wxid */
  payPayer: string
  /** 转账发起时间（Unix 秒） */
  beginTransferTime: number
  /** 最后修改时间（Unix 秒） */
  lastModifiedTime: number
  /** 失效时间（Unix 秒） */
  invalidTime: number
  /** 最后更新时间（Unix 秒） */
  lastUpdateTime: number
  /** 延迟确认标记：0=即时到账，1=延迟到账 */
  delayConfirmFlag: number
  /** 金额（元），自消息 XML <feedesc> 解析，失败为 0 */
  amount: number
  /** 是否本人发出（direction=sent/received 时由后端方向推导；all 时为 false） */
  isSender: boolean
}

/** 转账统计（后端未提供 stats 字段，前端不再消费） */
export interface TransferStats {
  /** 发出笔数 */
  sentCount: number
  /** 收到笔数 */
  receivedCount: number
}

/** 转账列表响应（后端不返回 stats，保留字段声明仅供兼容） */
export interface TransferResponse {
  total: number
  items: Transfer[]
  stats?: TransferStats
}

/** 转账查询参数 */
export interface TransferParams {
  /** 方向：sent=发出/received=收到（后端枚举，swagger Enums(sent, received)） */
  direction?: 'all' | 'sent' | 'received'
  year?: number
  limit?: number
  offset?: number
}

// ==================== 红包记录 ====================

/** 红包记录（对齐后端 model.RedPacket；后端无金额字段） */
export interface RedPacket {
  /** 消息服务 ID */
  messageServerId: number
  /** 会话名（wxid/群 ID） */
  sessionName: string
  /** 发送方 wxid */
  senderUserName: string
  /** 红包 URL */
  nativeUrl: string
  /** 发送 ID */
  sendId: string
  /** 场景 ID */
  sceneId: number
  /** 红包状态 */
  hbStatus: number
  /** 红包类型 */
  hbType: number
  /** 领取状态 */
  receiveStatus: number
  /** 份数（native_url total_num 解析，失败为 0） */
  totalNum: number
  /** 祝福语（消息 XML 解析，本地不可得时为空） */
  blessing: string
  /** 是否本人发出（direction=sent/received 时由后端方向推导；all 时为 false） */
  isSender: boolean
}

/** 红包统计（后端未提供 stats 字段，前端不再消费） */
export interface RedPacketStats {
  /** 发出个数 */
  sentCount: number
  /** 收到个数 */
  receivedCount: number
}

/** 红包列表响应（后端不返回 stats，保留字段声明仅供兼容） */
export interface RedPacketResponse {
  total: number
  items: RedPacket[]
  stats?: RedPacketStats
}

/** 红包查询参数 */
export interface RedPacketParams {
  /** 方向：sent=发出/received=收到（后端枚举，swagger Enums(sent, received)） */
  direction?: 'all' | 'sent' | 'received'
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

/** 朋友圈动态（对齐后端 model.ParsedMoment；likes/comments 后端 omitempty 缺失时为空数组） */
export interface Moment {
  /** 时间线 ID */
  tid: number
  /** 发布者用户名 */
  username: string
  /** 发布者昵称 */
  nickname: string
  /** 创建时间（Unix 时间戳） */
  createTime: number
  /** 内容类型（后端 text/image/link/video/unknown，前端仅 text 可预览） */
  contentType: 'text' | 'protobuf'
  /** 文本内容 */
  content?: string
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
