/**
 * 表情 & 表情包 API
 * GET /api/v1/emoticon、GET /api/v1/emoticon/package
 */

import { request } from '@/utils/request'
import type {
  Emoticon,
  EmoticonPackage,
  EmoticonParams,
  EmoticonPackageParams,
  EmoticonResponse,
  EmoticonPackageResponse,
} from '@/types/emoticon'

/**
 * 后端原始表情（swagger model.Emoticon，snake_case）
 */
interface BackendEmoticon {
  md5: string
  caption: string
  cdn_url: string
  thumb_url: string
  type: number
}

/**
 * 后端原始表情包（swagger model.EmoticonPackage，snake_case）
 */
interface BackendEmoticonPackage {
  package_id: number
  package_name: string
  payment_status: number
  download_status: number
  install_time: number
  sort_order: number
  author: string
  count: number
}

/**
 * 转换后端表情到前端格式（snake_case → camelCase）
 */
function transformEmoticon(backend: BackendEmoticon): Emoticon {
  return {
    md5: backend.md5,
    caption: backend.caption,
    cdnUrl: backend.cdn_url,
    thumbUrl: backend.thumb_url,
    type: backend.type,
  }
}

/**
 * 转换后端表情包到前端格式（snake_case → camelCase）
 */
function transformEmoticonPackage(backend: BackendEmoticonPackage): EmoticonPackage {
  return {
    packageId: backend.package_id,
    packageName: backend.package_name,
    paymentStatus: backend.payment_status,
    downloadStatus: backend.download_status,
    installTime: backend.install_time,
    sortOrder: backend.sort_order,
    author: backend.author,
    count: backend.count,
  }
}

/**
 * 表情 & 表情包 API 单例
 */
class EmoticonAPI {
  /**
   * 获取表情列表
   * 显式传 limit 默认 50 对齐后端（拦截器会注入 limit:200，不传则覆盖后端默认值）
   */
  async getEmoticons(params?: EmoticonParams): Promise<EmoticonResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.caption) {
      queryParams.caption = params.caption
    }
    queryParams.limit = params?.limit ?? 50
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{ items: BackendEmoticon[]; total: number }>(
      '/api/v1/emoticon',
      queryParams,
    )
    return {
      items: (response.items || []).map(transformEmoticon),
      total: response.total,
    }
  }

  /**
   * 获取表情包列表
   * 显式传 limit 默认 50 对齐后端
   */
  async getEmoticonPackages(params?: EmoticonPackageParams): Promise<EmoticonPackageResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.name) {
      queryParams.name = params.name
    }
    if (params?.author) {
      queryParams.author = params.author
    }
    queryParams.limit = params?.limit ?? 50
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{ items: BackendEmoticonPackage[]; total: number }>(
      '/api/v1/emoticon/package',
      queryParams,
    )
    return {
      items: (response.items || []).map(transformEmoticonPackage),
      total: response.total,
    }
  }
}

export const emoticonAPI = new EmoticonAPI()
export default emoticonAPI
