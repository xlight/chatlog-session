import { computed } from 'vue'
import type { Message } from '@/types'
import { RichMessageSubType } from '@/types/message'
import { mediaAPI } from '@/api/media'

const PROXY_BASE = 'https://spmc.sponeur.com/proxy'
const ALLOWED_DOMAINS = [
  'vweixinf.tc.qq.com',
  'mmbiz.qpic.cn'
 // 'wxapp.tc.qq.com'
]

function convertToProxyUrl(url: string): string {
  if (window.location.host.indexOf('xlight')=== -1) return url
  if (!url || !url.startsWith('http://')) return url

  try {
    const urlObj = new URL(url)
    if (ALLOWED_DOMAINS.includes(urlObj.hostname)) {
      return `${PROXY_BASE}/${urlObj.hostname}${urlObj.pathname}${urlObj.search}`
    }
  } catch (e) {
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
  // 图片 URL
  const imageUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      return mediaAPI.getImageUrl(message.contents.md5, message.contents.path)
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
  const linkUrl = computed(() => message.contents?.url || message.fileUrl || '')

  // 转发消息相关
  const forwardedTitle = computed(() => message.contents?.title || '聊天记录')
  const forwardedDesc = computed(() => message.contents?.desc || '')
  const forwardedCount = computed(() => {
    const count = message.contents?.recordInfo?.DataList?.Count
    return count ? parseInt(count) : 0
  })

  // 小程序相关
  const miniProgramTitle = computed(() => message.contents?.title || '小程序')
  const miniProgramUrl = computed(() => message.contents?.url || '')

  // 购物小程序相关
  const shoppingMiniProgramTitle = computed(() => message.contents?.title || '购物小程序')
  const shoppingMiniProgramUrl = computed(() => message.contents?.url || '')
  const shoppingMiniProgramDesc = computed(() => message.contents?.desc || '')
  const shoppingMiniProgramThumb = computed(() => message.contents?.thumbUrl || message.contents?.thumburl || '')

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
    voiceUrl,
    emojiUrl,
    fileUrl,
    fileName,
    linkTitle,
    linkUrl,
    forwardedTitle,
    forwardedDesc,
    forwardedCount,
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
    locationCityname
  }
}
