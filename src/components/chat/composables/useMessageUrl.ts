import { computed } from 'vue'
import type { Message } from '@/types'
import { RichMessageSubType } from '@/types/message'
import { mediaAPI } from '@/api/media'

interface FavoriteDataItem {
  DataType: string
  DataFmt?: string
  DataDesc?: string
  DataTitle?: string
  HTMLID?: string
}

function getFavoriteDataItems(message: Message): FavoriteDataItem[] {
  const dataItems = message.contents?.recordInfo?.DataList?.DataItems
  if (!Array.isArray(dataItems)) return []
  return dataItems.filter(item => item?.DataType)
}

function normalizeFavoriteText(text?: string): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

function getFavoriteTypeLabel(item: FavoriteDataItem): string | null {
  if (item.DataType === '1') return '文本'
  if (item.DataType === '2' || item.DataType === '3') return '图片'
  if (item.DataType === '34') return '语音'
  if (item.DataType === '4' || item.DataType === '5' || item.DataType === '43') return '视频'
  if (item.DataType === '6' || item.DataType === '48') return '位置'
  if (item.DataType === '8') {
    if (item.DataFmt === 'htm' || item.HTMLID === 'WeNoteHtmlFile') return '笔记'
    return '文件'
  }
  return null
}

function buildFavoriteSummary(message: Message) {
  const dataItems = getFavoriteDataItems(message)
  const countValue = message.contents?.recordInfo?.DataList?.Count
  const favoriteCount = countValue ? parseInt(countValue) : dataItems.length
  const favoriteTitle = message.contents?.recordInfo?.Title || message.contents?.title || '收藏内容'

  const firstTextItem = dataItems.find(
    item => item.DataType === '1' && normalizeFavoriteText(item.DataDesc)
  )
  const firstText = normalizeFavoriteText(firstTextItem?.DataDesc)

  const typeSet = new Set<string>()
  dataItems.forEach(item => {
    const label = getFavoriteTypeLabel(item)
    if (label) {
      typeSet.add(label)
    }
  })

  const favoriteTypes = Array.from(typeSet).slice(0, 3)
  const typeHint = favoriteTypes.length > 0 ? favoriteTypes.join(' / ') : '多种内容'
  const favoriteDesc =
    normalizeFavoriteText(message.contents?.desc) ||
    firstText ||
    `包含 ${favoriteCount || dataItems.length} 项内容，以${typeHint}为主`

  return {
    favoriteTitle,
    favoriteDesc,
    favoriteCount,
    favoriteTypes,
    favoriteItems: dataItems,
  }
}

const PROXY_BASE = 'https://spmc.sponeur.com/proxy'
const ALLOWED_DOMAINS = [
  'vweixinf.tc.qq.com',
  'mmbiz.qpic.cn',
  // 'wxapp.tc.qq.com'
]

function convertToProxyUrl(url: string): string {
  if (window.location.host.indexOf('xlight') === -1) return url
  if (!url || !url.startsWith('http://')) return url

  try {
    const urlObj = new URL(url)
    if (ALLOWED_DOMAINS.includes(urlObj.hostname)) {
      return `${PROXY_BASE}/${urlObj.hostname}${urlObj.pathname}${urlObj.search}`
    }
  } catch (_e) {
    console.error('Invalid URL:', url)
  }
  return url
}

export function useMessageUrl(message: Message) {
  //图片缩略图 URL
  const imageThumbUrl = computed(() => {
    if (message.content) {
      return message.content
    }

    if (message.contents?.md5) {
      return mediaAPI.getThumbnailUrl(message.contents.md5, message.contents.path)
    }
    return ''
  })
  // 图片 URL（高清图，优先用 API 获取）
  const imageUrl = computed(() => {
    if (message.contents?.md5) {
      return mediaAPI.getImageUrl(message.contents.md5, message.contents.path)
    }
    if (message.content) {
      return message.content
    }
    return ''
  })

  // 视频 URL
  const videoUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      return mediaAPI.getVideoUrl(message.contents.md5)
    }
    return ''
  })

  // 视频缩略图 URL
  const videoThumbUrl = computed(() => {
    if (message.type === 43 && message.contents?.md5) {
      return mediaAPI.getThumbnailUrl(message.contents.md5, message.contents.path)
    }
    return ''
  })

  // 表情 URL
  const emojiUrl = computed(() => {
    // 优先使用 cdnurl（type=47 的表情消息）
    if (message.contents?.cdnurl) {
      return convertToProxyUrl(message.contents.cdnurl)
    }
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      return mediaAPI.getImageUrl(message.contents.md5, message.contents.path)
    }
    return ''
  })

  // 语音 URL
  const voiceUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.voice) {
      return mediaAPI.getVoiceUrl(message.contents.voice)
    }
    return ''
  })

  // 文件 URL
  const fileUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      return mediaAPI.getFileUrl(message.contents.md5)
    }
    return ''
  })

  // 文件名
  const fileName = computed(() => {
    if (message.subType === RichMessageSubType.FileDownloading) {
      return '文件信息加载中...'
    }
    return message.contents?.title || message.fileName || '未知文件'
  })

  // 链接相关
  const linkTitle = computed(() => message.contents?.title || '链接')
  const linkUrl = computed(() => {
    // subType=1 时 URL 存放在 contents.title，contents.url 为空
    if (message.subType === RichMessageSubType.Text) {
      return message.contents?.title || message.contents?.url || message.fileUrl || ''
    }
    return message.contents?.url || message.fileUrl || ''
  })

  // 转发消息相关
  const forwardedTitle = computed(() => message.contents?.title || '聊天记录')
  const forwardedDesc = computed(() => message.contents?.desc || '')
  const forwardedCount = computed(() => {
    const count = message.contents?.recordInfo?.DataList?.Count
    return count ? parseInt(count) : 0
  })

  // 收藏消息相关
  const favoriteSummary = computed(() => buildFavoriteSummary(message))
  const favoriteTitle = computed(() => favoriteSummary.value.favoriteTitle)
  const favoriteDesc = computed(() => favoriteSummary.value.favoriteDesc)
  const favoriteCount = computed(() => favoriteSummary.value.favoriteCount)
  const favoriteTypes = computed(() => favoriteSummary.value.favoriteTypes)
  const favoriteItems = computed(() => favoriteSummary.value.favoriteItems)

  // 小程序相关
  const miniProgramTitle = computed(() => message.contents?.title || '小程序')
  const miniProgramUrl = computed(() => message.contents?.url || '')

  // 购物小程序相关
  const shoppingMiniProgramTitle = computed(() => message.contents?.title || '购物小程序')
  const shoppingMiniProgramUrl = computed(() => message.contents?.url || '')
  const shoppingMiniProgramDesc = computed(() => message.contents?.desc || '')
  const shoppingMiniProgramThumb = computed(
    () => message.contents?.thumbUrl || message.contents?.thumburl || ''
  )

  // 小视频相关
  const shortVideoTitle = computed(() => message.contents?.title || '小视频')
  const shortVideoUrl = computed(() => message.contents?.url || '')

  // 直播相关
  const liveTitle = computed(() => message.contents?.title || '直播')

  // 位置信息相关
  const locationLabel = computed(() => message.contents?.label || '位置')
  const locationX = computed(() => message.contents?.x || '')
  const locationY = computed(() => message.contents?.y || '')
  const locationCityname = computed(() => message.contents?.cityname || '')

  return {
    imageThumbUrl,
    imageUrl,
    videoUrl,
    videoThumbUrl,
    voiceUrl,
    emojiUrl,
    fileUrl,
    fileName,
    linkTitle,
    linkUrl,
    forwardedTitle,
    forwardedDesc,
    forwardedCount,
    favoriteTitle,
    favoriteDesc,
    favoriteCount,
    favoriteTypes,
    favoriteItems,
    miniProgramTitle,
    miniProgramUrl,
    shoppingMiniProgramTitle,
    shoppingMiniProgramUrl,
    shoppingMiniProgramDesc,
    shoppingMiniProgramThumb,
    shortVideoTitle,
    shortVideoUrl,
    liveTitle,
    locationLabel,
    locationX,
    locationY,
    locationCityname,
  }
}
