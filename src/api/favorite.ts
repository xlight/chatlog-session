/**
 * 收藏内容 API
 * GET /api/v1/favorite
 */

import { request } from '@/utils/request'
import type { Favorite, FavoriteParsed, FavoriteResponse, FavoriteParams, FavoriteTag } from '@/types/social'

/**
 * tag 过滤时的大 limit（后端 /favorite limit<=0 会重置为默认 20，无法全量拉取）
 */
const MAX_FETCH_LIMIT = 5000

/**
 * 后端原始收藏条目（swagger model.Favorite，snake_case）
 */
interface BackendFavorite {
  local_id: number
  server_id: number
  type: number
  update_seq: number
  update_time: number
  version: number
  content?: string
  content_type?: string
  source_id: string
  sync_status: number
  upload_status: number
  from_usr: string
  real_chat_name: string
  parsed?: BackendFavoriteParsed
  tags?: string[]
}

/**
 * 后端收藏解析内容（swagger model.FavoriteParsed，snake_case）
 */
interface BackendFavoriteParsed {
  desc?: string
  link?: string
  title?: string
  cdn_data_url?: string
}

/**
 * 转换后端收藏解析内容（snake_case → camelCase）
 */
function transformFavoriteParsed(backend: BackendFavoriteParsed): FavoriteParsed {
  return {
    desc: backend.desc,
    link: backend.link,
    title: backend.title,
    cdnDataUrl: backend.cdn_data_url,
  }
}

/**
 * 后端原始收藏标签（swagger model.FavoriteTag，snake_case）
 */
interface BackendFavoriteTag {
  local_id: number
  server_id: number
  name: string
  seq: number
}

/**
 * 转换后端收藏到前端格式（snake_case → camelCase，tags string[] → FavoriteTag[]）
 */
function transformFavorite(backend: BackendFavorite): Favorite {
  return {
    localId: backend.local_id,
    serverId: backend.server_id,
    fromUser: backend.from_usr,
    chatName: backend.real_chat_name,
    type: backend.type,
    updateTime: backend.update_time,
    syncStatus: backend.sync_status,
    content: backend.content,
    // contentType 保留后端原值（text/link/image/video/note/unknown），不再一锅归 protobuf
    contentType: (backend.content_type as Favorite['contentType']) || 'unknown',
    parsed: backend.parsed ? transformFavoriteParsed(backend.parsed) : undefined,
    // 后端 tags 为 string[]（无 id），localId/serverId 置 0 占位
    tags: (backend.tags || []).map((name): FavoriteTag => ({ localId: 0, serverId: 0, name })),
  }
}

/**
 * 收藏内容 API 单例
 */
class FavoriteAPI {
  private basePath = '/api/v1/favorite'

  /**
   * 获取收藏列表
   * 后端 /favorite 无 tag 参数（tag 在 /favorite/tag）：传 tag 时拉大 limit 后前端过滤
   */
  async getFavorites(params?: FavoriteParams): Promise<FavoriteResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.type) {
      queryParams.type = params.type
    }
    if (params?.content) {
      queryParams.content = params.content
    }
    if (params?.fromUsr) {
      queryParams.from_usr = params.fromUsr
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }

    const response = await request.get<FavoriteResponse>(this.basePath, queryParams)

    if (!params?.tag) {
      return {
        ...response,
        // 后端响应为 snake_case（local_id/update_time/tags:string[]），转换到前端结构
        items: (response.items as unknown as BackendFavorite[]).map(transformFavorite),
      }
    }

    // tag 前端过滤：拉取大 limit 后按标签过滤，再截取当前页
    const all = await request.get<FavoriteResponse>(this.basePath, {
      type: params.type,
      content: params.content,
      from_usr: params.fromUsr,
      limit: MAX_FETCH_LIMIT,
      offset: 0,
    })
    const filtered = (all.items as unknown as BackendFavorite[])
      .map(transformFavorite)
      .filter(item => item.tags.some(tag => tag.name === params.tag))
    const limit = params.limit || filtered.length
    const offset = params.offset || 0

    return {
      ...all,
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    }
  }

  /**
   * 获取收藏标签列表
   * GET /api/v1/favorite/tag（后端 /favorite 响应无 tags 字段，标签独立端点）
   */
  async getTags(): Promise<FavoriteTag[]> {
    const response = await request.get<{ items: BackendFavoriteTag[] }>('/api/v1/favorite/tag')
    return (response.items || []).map(tag => ({
      localId: tag.local_id,
      serverId: tag.server_id,
      name: tag.name,
    }))
  }
}

export const favoriteAPI = new FavoriteAPI()
export default favoriteAPI
