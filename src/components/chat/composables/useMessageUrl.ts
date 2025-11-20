import { computed } from 'vue'
import type { Message } from '@/types'

// 获取 API Base URL
const getApiBaseUrl = (): string => {
  const directUrl = localStorage.getItem('apiBaseUrl')
  if (directUrl) {
    return directUrl
  }
  const settings = localStorage.getItem('chatlog-settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      if (parsed.apiBaseUrl) {
        return parsed.apiBaseUrl
      }
    } catch (err) {
      console.error('解析设置失败:', err)
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030'
}

export function useMessageUrl(message: Message) {
  // 图片 URL
  const imageUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      const apiBaseUrl = getApiBaseUrl()
      return `${apiBaseUrl}/image/${message.contents.md5}`
    }
    return ''
  })

  // 视频 URL
  const videoUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      const apiBaseUrl = getApiBaseUrl()
      return `${apiBaseUrl}/video/${message.contents.md5}`
    }
    return ''
  })

  // 表情 URL
  const emojiUrl = computed(() => {
    // 优先使用 cdnurl（type=47 的表情消息）
    if (message.contents?.cdnurl) {
      return message.contents.cdnurl
    }
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      const apiBaseUrl = getApiBaseUrl()
      return `${apiBaseUrl}/image/${message.contents.md5}`
    }
    return ''
  })

  // 文件 URL
  const fileUrl = computed(() => {
    if (message.content) {
      return message.content
    }
    if (message.contents?.md5) {
      const apiBaseUrl = getApiBaseUrl()
      return `${apiBaseUrl}/file/${message.contents.md5}`
    }
    return ''
  })

  // 文件名
  const fileName = computed(() => {
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

  return {
    imageUrl,
    videoUrl,
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
    shortVideoUrl
  }
}