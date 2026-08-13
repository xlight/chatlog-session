/**
 * 朋友圈 API
 * GET /api/v1/moment（后端路由为单数，route.go:92）
 */

import { request } from '@/utils/request'
import type { Moment, MomentsResponse, MomentsParams } from '@/types/social'

/**
 * 后端原始朋友圈动态（swagger model.ParsedMoment，snake_case；
 * comments/likes 为 omitempty，无互动时 JSON 缺失）
 */
interface BackendMomentComment {
  from_username: string
  from_nickname?: string
  to_username?: string
  to_nickname?: string
  content?: string
  create_time?: number
}

interface BackendMomentLike {
  from_username: string
  from_nickname?: string
}

interface BackendMomentMedia {
  type?: number
  thumb?: string
  hd_thumb?: string
  url?: string
  description?: string
}

interface BackendMomentLocation {
  lat: number
  lng: number
  poi_name?: string
  poi_address?: string
}

interface BackendMoment {
  tid: number
  user_name: string
  nickname?: string
  content_type: string
  text_content?: string
  title?: string
  url?: string
  source_nick_name?: string
  is_top?: boolean
  location?: BackendMomentLocation
  media_list?: BackendMomentMedia[]
  create_time?: number
  comments?: BackendMomentComment[]
  likes?: BackendMomentLike[]
}

/**
 * 转换后端朋友圈动态到前端格式（snake_case → camelCase；
 * contentType 保留后端原值（text/image/link/video/unknown）；likes/comments 兜底空数组防渲染崩溃）
 */
function transformMoment(backend: BackendMoment): Moment {
  return {
    tid: backend.tid,
    username: backend.user_name,
    nickname: backend.nickname ?? '',
    createTime: backend.create_time ?? 0,
    contentType: (backend.content_type as Moment['contentType']) || 'unknown',
    content: backend.text_content ?? '',
    title: backend.title,
    url: backend.url,
    sourceNickName: backend.source_nick_name,
    isTop: backend.is_top,
    location: backend.location
      ? {
          lat: backend.location.lat,
          lng: backend.location.lng,
          poiName: backend.location.poi_name,
          poiAddress: backend.location.poi_address,
        }
      : undefined,
    mediaList: (backend.media_list ?? []).map(media => ({
      type: media.type,
      thumb: media.thumb,
      hdThumb: media.hd_thumb,
      url: media.url,
      description: media.description,
    })),
    comments: (backend.comments ?? []).map(comment => ({
      fromUsername: comment.from_username,
      fromNickname: comment.from_nickname ?? '',
      content: comment.content ?? '',
      createTime: comment.create_time ?? 0,
    })),
    likes: (backend.likes ?? []).map(like => ({
      fromUsername: like.from_username,
      fromNickname: like.from_nickname ?? '',
    })),
  }
}

/**
 * 朋友圈 API 单例
 */
class MomentsAPI {
  private basePath = '/api/v1/moment'

  /**
   * 获取朋友圈时间线
   */
  async getMoments(params?: MomentsParams): Promise<MomentsResponse> {
    const queryParams: Record<string, unknown> = {}
    if (params?.username) {
      queryParams.username = params.username
    }
    if (params?.content) {
      queryParams.content = params.content
    }
    if (params?.limit) {
      queryParams.limit = params.limit
    }
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{
      items: BackendMoment[]
      total: number
    }>(this.basePath, queryParams)

    return {
      items: (response.items || []).map(transformMoment),
      total: response.total,
    }
  }
}

export const momentsAPI = new MomentsAPI()
export default momentsAPI
