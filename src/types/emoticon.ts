/**
 * 表情（Emoticon）数据类型定义
 * 对应后端 /api/v1/emoticon、/api/v1/emoticon/package
 */

/** 表情（对齐后端 model.Emoticon） */
export interface Emoticon {
  /** 表情 MD5 */
  md5: string
  /** 表情描述 */
  caption: string
  /** CDN URL */
  cdnUrl: string
  /** 缩略图 URL */
  thumbUrl: string
  /** 表情类型 */
  type: number
}

/** 表情包（对齐后端 model.EmoticonPackage） */
export interface EmoticonPackage {
  /** 包 ID */
  packageId: number
  /** 包名 */
  packageName: string
  /** 支付状态 */
  paymentStatus: number
  /** 下载状态 */
  downloadStatus: number
  /** 安装时间（Unix 秒） */
  installTime: number
  /** 排序 */
  sortOrder: number
  /** 作者 */
  author: string
  /** 表情数量 */
  count: number
}

/** 表情查询参数 */
export interface EmoticonParams {
  /** 描述模糊匹配 */
  caption?: string
  limit?: number
  offset?: number
}

/** 表情包查询参数 */
export interface EmoticonPackageParams {
  /** 包名模糊匹配 */
  name?: string
  /** 作者模糊匹配 */
  author?: string
  limit?: number
  offset?: number
}

/** 表情列表响应 */
export interface EmoticonResponse {
  total: number
  items: Emoticon[]
}

/** 表情包列表响应 */
export interface EmoticonPackageResponse {
  total: number
  items: EmoticonPackage[]
}
