/**
 * 洞察（Insight）数据类型定义
 * 对应后端 /api/v1/insight/contact|emoticon|resource|revoke
 */

/** 联系人标签（对齐后端 model.ContactLabel） */
export interface ContactLabel {
  /** 标签 ID */
  labelId: number
  /** 标签名 */
  labelName: string
  /** 排序 */
  sortOrder: number
}

/** 群规模（对齐后端 model.ChatRoomSize） */
export interface ChatRoomSize {
  /** 群 userName */
  userName: string
  /** 成员数 */
  members: number
}

/** 联系人洞察（verify_flag 为 {中文标签: count} map，透传不转换） */
export interface InsightContactStats {
  /** 联系人类型分布（key 为中文标签） */
  verifyFlag: Record<string, number>
  /** 标签分布 */
  labels: ContactLabel[]
  /** 群规模 */
  roomSizes: ChatRoomSize[]
}

/** 表情洞察（stats 为 {表情标识: 次数} map，透传不转换） */
export interface InsightEmoticonStats {
  stats: Record<string, number>
}

/** 资源类型统计（对齐后端 model.ResourceTypeStat） */
export interface ResourceTypeStat {
  /** 类型 */
  type: string
  /** 媒体类型 */
  mediaType: string
  /** 数量 */
  count: number
  /** 总大小（字节） */
  totalSize: number
}

/** 资源发送者统计（对齐后端 model.ResourceSenderStat） */
export interface ResourceSenderStat {
  /** 发送者 wxid */
  userName: string
  /** 数量 */
  count: number
  /** 总大小（字节） */
  totalSize: number
}

/** 资源月度趋势（对齐后端 model.ResourceMonthlyStat，month/count 无 snake_case） */
export interface ResourceMonthlyStat {
  /** 月份（YYYY-MM） */
  month: string
  /** 数量 */
  count: number
}

/** 资源洞察 */
export interface InsightResourceStats {
  types: ResourceTypeStat[]
  senders: ResourceSenderStat[]
  monthly: ResourceMonthlyStat[]
}

/** 撤回记录（对齐后端 model.RevokeRecord，snake_case） */
export interface RevokeRecord {
  /** 发送者昵称 */
  senderNickname: string
  /** 撤回内容 */
  content: string
  /** 撤回时间（Unix 秒） */
  revokeTime: number
  /** 会话名 */
  sessionName: string
  /** 消息 seq */
  seq: number
  /** 创建时间（Unix 秒） */
  createTime: number
}

/** 撤回记录查询参数 */
export interface InsightRevokeParams {
  /** 时间范围（原样透传，如 2026-01-01~2026-01-31 / last-7d / all） */
  time?: string
  limit?: number
  offset?: number
}

/** 撤回记录列表响应 */
export interface InsightRevokeResponse {
  total: number
  items: RevokeRecord[]
}
