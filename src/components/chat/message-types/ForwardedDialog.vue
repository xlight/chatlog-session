<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { mediaAPI } from '@/api/media'
import Avatar from '@/components/common/Avatar.vue'
import VoiceMessage from './VoiceMessage.vue'
import { formatFileSize } from '../composables/utils'
import { MessageTypeMap, MessageIconMap } from '@/types/message'

interface ForwardedDataItem {
  DataType: string
  DataID?: string
  DataFmt?: string
  SourceName: string
  SourceTime: string
  SourceHeadURL?: string
  DataDesc?: string
  DataTitle?: string
  DataSize?: string
  ThumbSize?: string
  CDNDataURL?: string
  CDNThumbURL?: string
  FullMD5?: string
  ThumbFullMD5?: string
  Link?: string
  Location?: {
    Label?: string
    PoiName?: string
    Lat?: string
    Lng?: string
  }
}

interface Props {
  visible: boolean
  title: string
  messages: ForwardedDataItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const videoPreviewVisible = ref(false)
const currentVideoUrl = ref('')
const currentVideoTitle = ref('视频预览')

// 获取消息类型的中文描述
const getMessageTypeLabel = (dataType: string): string => {
  const typeMap: Record<string, string> = {
    '1': '文本',
    '2': '图片',
    '3': '图片',
    '4': '视频',
    '5': '视频',
    '6': '位置',
    '8': '文件',
    '34': '语音',
    '43': '视频',
    '48': '位置',
  }
  return typeMap[dataType] || MessageTypeMap[dataType] || '未知消息'
}

// 获取消息类型图标
const getMessageIcon = (dataType: string): string => {
  const iconMap: Record<string, string> = {
    '1': 'ChatLineSquare',
    '2': 'Picture',
    '3': 'Picture',
    '4': 'VideoPlay',
    '5': 'VideoPlay',
    '6': 'Location',
    '8': 'Document',
    '34': 'Microphone',
    '43': 'VideoPlay',
    '48': 'Location',
  }
  return iconMap[dataType] || MessageIconMap[dataType] || 'QuestionFilled'
}

// 获取图片 URL（FullMD5 优先，CDNDataURL 兜底）
const getImageUrl = (item: ForwardedDataItem): string => {
  if (item.FullMD5) {
    return mediaAPI.getImageUrl(item.FullMD5)
  }
  if (item.CDNDataURL) {
    return item.CDNDataURL
  }
  return ''
}

// 获取缩略图 URL（ThumbFullMD5 优先，CDNThumbURL 兜底）
const getThumbnailUrl = (item: ForwardedDataItem): string => {
  if (item.ThumbFullMD5) {
    return mediaAPI.getThumbnailUrl(item.ThumbFullMD5)
  }
  if (item.FullMD5) {
    return mediaAPI.getThumbnailUrl(item.FullMD5)
  }
  if (item.CDNThumbURL) {
    return item.CDNThumbURL
  }
  if (item.CDNDataURL) {
    return item.CDNDataURL
  }
  return ''
}

const getVideoUrl = (item: ForwardedDataItem): string => {
  if (item.FullMD5) {
    return mediaAPI.getVideoUrl(item.FullMD5)
  }
  if (item.CDNDataURL) {
    return item.CDNDataURL
  }
  return ''
}

const getVoiceUrl = (item: ForwardedDataItem): string => {
  if (item.FullMD5) {
    return mediaAPI.getVoiceUrl(item.FullMD5)
  }
  if (item.CDNDataURL) {
    return item.CDNDataURL
  }
  return ''
}

const canPlayVoice = (item: ForwardedDataItem): boolean => {
  return item.DataType === '34' && Boolean(item.FullMD5 || item.CDNDataURL)
}

const canDownloadFile = (item: ForwardedDataItem): boolean => {
  return item.DataType === '8' && Boolean(item.FullMD5 || item.CDNDataURL)
}

const canPreviewVideo = (item: ForwardedDataItem): boolean => {
  return ['4', '5', '43'].includes(item.DataType) && Boolean(item.FullMD5 || item.CDNDataURL)
}

const canOpenLocation = (item: ForwardedDataItem): boolean => {
  return Boolean(item.Location?.Lat && item.Location?.Lng)
}

const handleFileClick = async (item: ForwardedDataItem) => {
  if (!canDownloadFile(item) || !item.FullMD5) {
    ElMessage.warning('该转发文件暂不支持下载')
    return
  }

  try {
    await mediaAPI.downloadFile(item.FullMD5, item.DataTitle || undefined)
  } catch (error) {
    console.error('下载转发文件失败:', error)
    ElMessage.error('下载转发文件失败')
  }
}

const handleVideoClick = (item: ForwardedDataItem) => {
  if (!canPreviewVideo(item)) {
    ElMessage.warning('该转发视频暂不支持预览')
    return
  }

  const videoUrl = getVideoUrl(item)
  if (!videoUrl) {
    ElMessage.warning('该转发视频暂不支持预览')
    return
  }

  currentVideoUrl.value = videoUrl
  currentVideoTitle.value = item.DataTitle || '视频预览'
  videoPreviewVisible.value = true
}

const handleVideoPreviewClosed = () => {
  currentVideoUrl.value = ''
  currentVideoTitle.value = '视频预览'
}

const handleLinkClick = (item: ForwardedDataItem) => {
  if (!item.Link) {
    ElMessage.warning('该链接不可用')
    return
  }

  window.open(item.Link, '_blank', 'noopener,noreferrer')
}

const handleLocationClick = (item: ForwardedDataItem) => {
  if (!canOpenLocation(item)) {
    ElMessage.warning('该位置缺少坐标信息')
    return
  }

  const lat = item.Location?.Lat
  const lng = item.Location?.Lng
  const label = item.DataTitle || item.Location?.Label || item.Location?.PoiName || '位置'

  if (!lat || !lng) {
    ElMessage.warning('该位置缺少坐标信息')
    return
  }

  const mapUrl = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${encodeURIComponent(label)}&referer=chatlog-session`
  window.open(mapUrl, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="600px"
    :close-on-click-modal="true"
    align-center
    append-to-body
  >
    <div class="forwarded-dialog">
      <div v-if="messages.length > 0" class="forwarded-list">
        <div
          v-for="(item, index) in messages"
          :key="index"
          class="forwarded-item"
        >
          <div class="forwarded-item-header">
            <Avatar
              :src="item.SourceHeadURL"
              :name="item.SourceName"
              :size="36"
            />
            <div class="forwarded-item-info">
              <div class="forwarded-item-sender">{{ item.SourceName }}</div>
              <div class="forwarded-item-time">{{ item.SourceTime }}</div>
            </div>
          </div>

          <div class="forwarded-item-content">
            <!-- 文本消息 (DataType=1) -->
            <div v-if="item.DataType === '1'" class="forwarded-text">
              {{ item.DataDesc || item.DataTitle || '文本消息' }}
            </div>

            <!-- 图片消息 (DataType=2,3) -->
            <div
              v-else-if="item.DataType === '2' || item.DataType === '3'"
              class="forwarded-image"
            >
                <el-image
                  v-if="getThumbnailUrl(item)"
                  :src="getThumbnailUrl(item)"
                :preview-src-list="[getImageUrl(item)]"
                :initial-index="0"
                fit="cover"
                class="image-preview"
                lazy
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>图片</span>
                  </div>
                </template>
              </el-image>
              <div v-else class="forwarded-media">
                <el-icon><Picture /></el-icon>
                <span>[图片]</span>
              </div>
              <div v-if="item.DataSize || item.ThumbSize" class="image-info">
                <span class="media-size">
                  {{ formatFileSize(parseInt(item.DataSize || item.ThumbSize || '0')) }}
                </span>
              </div>
            </div>

            <!-- 语音消息 (DataType=34) -->
            <div
              v-else-if="item.DataType === '34'"
              class="forwarded-voice"
            >
              <VoiceMessage
                v-if="canPlayVoice(item)"
                :voice-url="getVoiceUrl(item)"
                :show-media-resources="true"
              />
              <template v-else>
                <el-icon class="voice-icon"><Microphone /></el-icon>
                <div class="voice-info">
                  <span>[语音]</span>
                  <span v-if="item.DataSize" class="media-size">
                    {{ formatFileSize(parseInt(item.DataSize)) }}
                  </span>
                </div>
              </template>
            </div>

            <!-- 视频消息 (DataType=4,5,43) -->
            <div
              v-else-if="item.DataType === '4' || item.DataType === '5' || item.DataType === '43'"
              class="forwarded-video"
            >
                <div
                  v-if="getThumbnailUrl(item)"
                  class="video-thumbnail"
                  :class="{ 'is-clickable': canPreviewVideo(item) }"
                  @click="canPreviewVideo(item) ? handleVideoClick(item) : undefined"
                >
                <el-image
                  :src="getThumbnailUrl(item)"
                  fit="cover"
                  lazy
                >
                  <template #placeholder>
                    <div class="video-play-icon">
                      <el-icon size="40"><VideoPlay /></el-icon>
                    </div>
                  </template>
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>视频</span>
                    </div>
                  </template>
                </el-image>
                <div class="video-play-icon">
                  <el-icon size="40"><VideoPlay /></el-icon>
                </div>
              </div>
              <div
                v-else
                class="video-placeholder"
                :class="{ 'is-clickable': canPreviewVideo(item) }"
                @click="canPreviewVideo(item) ? handleVideoClick(item) : undefined"
              >
                <el-icon class="video-icon"><VideoPlay /></el-icon>
                <div class="video-info">
                  <div class="video-title">
                    {{ item.DataTitle || '[视频]' }}
                  </div>
                  <span v-if="item.DataSize" class="media-size">
                    {{ formatFileSize(parseInt(item.DataSize)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 文件消息 (DataType=8) -->
            <div
              v-else-if="item.DataType === '8'"
              class="forwarded-file"
              :class="{ 'is-clickable': canDownloadFile(item) }"
              @click="canDownloadFile(item) ? handleFileClick(item) : undefined"
            >
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-details">
                <div class="file-name">
                  {{ item.DataTitle || '未命名文件' }}
                  <span v-if="item.DataFmt" class="file-format">.{{ item.DataFmt }}</span>
                </div>
                <div class="file-meta">
                  <span v-if="item.DataSize" class="file-size">
                    {{ formatFileSize(parseInt(item.DataSize)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 位置消息 (DataType=6,48) -->
            <div
              v-else-if="item.DataType === '6' || item.DataType === '48'"
              class="forwarded-location"
              :class="{ 'is-clickable': canOpenLocation(item) }"
              @click="canOpenLocation(item) ? handleLocationClick(item) : undefined"
            >
              <el-icon class="location-icon"><Location /></el-icon>
              <div class="location-info">
                <div class="location-label">
                  {{ item.DataTitle || item.Location?.Label || item.Location?.PoiName || '[位置]' }}
                </div>
                <div v-if="item.Location?.Lat && item.Location?.Lng" class="location-coords">
                  {{ item.Location.Lat }}, {{ item.Location.Lng }}
                </div>
              </div>
            </div>

            <!-- 链接消息 (有 Link 字段) -->
            <div v-else-if="item.Link" class="forwarded-link is-clickable" @click="handleLinkClick(item)">
              <el-icon class="link-icon"><Link /></el-icon>
              <div class="link-info">
                <div class="link-title">
                  {{ item.DataTitle || '链接' }}
                </div>
                <div v-if="item.DataDesc" class="link-desc">
                  {{ item.DataDesc }}
                </div>
                <div class="link-url">{{ item.Link }}</div>
              </div>
            </div>

            <!-- 其他类型消息 -->
            <div v-else class="forwarded-other">
              <el-icon class="other-icon">
                <component :is="getMessageIcon(item.DataType)" />
              </el-icon>
              <div class="other-info">
                <span class="type-label">[{{ getMessageTypeLabel(item.DataType) }}]</span>
                <span v-if="item.DataTitle" class="other-title">{{ item.DataTitle }}</span>
                <span v-else-if="item.DataDesc" class="other-desc">{{ item.DataDesc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无消息内容" />
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="videoPreviewVisible"
    :title="currentVideoTitle"
    width="90%"
    :style="{ maxWidth: '1200px' }"
    align-center
    append-to-body
    destroy-on-close
    @closed="handleVideoPreviewClosed"
  >
    <video v-if="currentVideoUrl" :src="currentVideoUrl" controls class="preview-video">
      您的浏览器不支持视频播放
    </video>
  </el-dialog>
</template>

<style lang="scss" scoped>
.forwarded-dialog {
  max-height: 500px;
  overflow-y: auto;

  .is-clickable {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }
  }

  .forwarded-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .forwarded-item {
    padding: 14px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    &-info {
      flex: 1;
      min-width: 0;
    }

    &-sender {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 2px;
    }

    &-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    &-content {
      padding-left: 48px;
    }
  }

  // 文本消息
  .forwarded-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  // 图片消息
  .forwarded-image {
    .image-preview {
      width: 200px;
      height: 200px;
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
    }

    .image-error {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: var(--el-fill-color);
      color: var(--el-text-color-placeholder);

      .el-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
    }

    .image-info {
      margin-top: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .forwarded-media {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: var(--el-fill-color);
      border-radius: 6px;

      .el-icon {
        font-size: 24px;
        color: var(--el-color-primary);
      }
    }
  }

  // 语音消息
  .forwarded-voice {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

    :deep(.voice-message) {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .voice-icon {
      font-size: 24px;
      color: var(--el-color-success);
    }

    .voice-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }

  // 视频消息
  .forwarded-video {
    .video-thumbnail {
      position: relative;
      width: 200px;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;
      cursor: default;

      .el-image {
        width: 100%;
        height: 100%;
      }

      .video-play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        background-color: rgba(0, 0, 0, 0.4);
        border-radius: 50%;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
    }

    .video-placeholder {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: var(--el-fill-color);
      border-radius: 6px;
    }

    .video-icon {
      font-size: 32px;
      color: var(--el-color-primary);
    }

    .video-info {
      flex: 1;
      min-width: 0;

      .video-title {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  // 文件消息
  .forwarded-file {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

    .file-icon {
      font-size: 36px;
      color: var(--el-color-primary);
      flex-shrink: 0;
    }

    .file-details {
      flex: 1;
      min-width: 0;

      .file-name {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;

        .file-format {
          color: var(--el-color-primary);
          font-weight: 500;
        }
      }

      .file-meta {
        display: flex;
        align-items: center;
        gap: 8px;

        .file-size {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  // 位置消息
  .forwarded-location {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

    .location-icon {
      font-size: 24px;
      color: var(--el-color-danger);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .location-info {
      flex: 1;
      min-width: 0;

      .location-label {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .location-coords {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        font-family: monospace;
      }
    }
  }

  // 链接消息
  .forwarded-link {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

    .link-icon {
      font-size: 24px;
      color: var(--el-color-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .link-info {
      flex: 1;
      min-width: 0;

      .link-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .link-desc {
        font-size: 13px;
        color: var(--el-text-color-regular);
        margin-bottom: 6px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      .link-url {
        font-size: 12px;
        color: var(--el-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  // 其他类型消息
  .forwarded-other {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

    .other-icon {
      font-size: 24px;
      color: var(--el-text-color-secondary);
      flex-shrink: 0;
    }

    .other-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .type-label {
        font-size: 14px;
        color: var(--el-text-color-secondary);
      }

      .other-title,
      .other-desc {
        font-size: 13px;
        color: var(--el-text-color-regular);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .media-size {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  .preview-video {
    display: block;
    width: 100%;
    max-height: 70vh;
    border-radius: 8px;
    background-color: #000;
  }
}

html.dark {
  .forwarded-dialog {
    .forwarded-item {
      background-color: rgba(255, 255, 255, 0.05);

      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .image-error {
      background-color: rgba(255, 255, 255, 0.03);
    }

    .forwarded-media,
    .forwarded-voice,
    .forwarded-video,
    .forwarded-file,
    .forwarded-location,
    .forwarded-link,
    .forwarded-other {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
}
</style>
