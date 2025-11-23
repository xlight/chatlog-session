<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { formatFileSize } from '../composables/utils'
import { MESSAGE_TYPE_MAP, MESSAGE_ICON_MAP } from '../composables/constants'

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

// 获取消息类型的中文描述
const getMessageTypeLabel = (dataType: string): string => {
  const typeMap: Record<string, string> = {
    '1': '文本',
    '2': '图片',
    '3': '图片',
    '4': '语音',
    '5': '视频',
    '8': '文件',
    '34': '语音',
    '43': '视频',
    '48': '位置',
  }
  return typeMap[dataType] || MESSAGE_TYPE_MAP[dataType] || '未知消息'
}

// 获取消息类型图标
const getMessageIcon = (dataType: string): string => {
  const iconMap: Record<string, string> = {
    '1': 'ChatLineSquare',
    '2': 'Picture',
    '3': 'Picture',
    '4': 'Microphone',
    '5': 'VideoPlay',
    '8': 'Document',
    '34': 'Microphone',
    '43': 'VideoPlay',
    '48': 'Location',
  }
  return iconMap[dataType] || MESSAGE_ICON_MAP[dataType] || 'QuestionFilled'
}

// 获取图片 URL（使用头像占位或实际图片）
const getImageUrl = (item: ForwardedDataItem): string => {
  if (item.FullMD5) {
    const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5030'
    return `${apiBaseUrl}/image/${item.FullMD5}`
  }
  return ''
}

// 获取缩略图 URL
const getThumbnailUrl = (item: ForwardedDataItem): string => {
  if (item.FullMD5) {
    const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5030'
    return `${apiBaseUrl}/image/${item.FullMD5}?thumbnail=true`
  }
  return ''
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="600px"
    :close-on-click-modal="true"
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

            <!-- 语音消息 (DataType=4,34) -->
            <div
              v-else-if="item.DataType === '4' || item.DataType === '34'"
              class="forwarded-voice"
            >
              <el-icon class="voice-icon"><Microphone /></el-icon>
              <div class="voice-info">
                <span>[语音]</span>
                <span v-if="item.DataSize" class="media-size">
                  {{ formatFileSize(parseInt(item.DataSize)) }}
                </span>
              </div>
            </div>

            <!-- 视频消息 (DataType=5,43) -->
            <div
              v-else-if="item.DataType === '5' || item.DataType === '43'"
              class="forwarded-video"
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

            <!-- 文件消息 (DataType=8) -->
            <div v-else-if="item.DataType === '8'" class="forwarded-file">
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

            <!-- 位置消息 (DataType=48) -->
            <div v-else-if="item.DataType === '48'" class="forwarded-location">
              <el-icon class="location-icon"><Location /></el-icon>
              <div class="location-info">
                <div class="location-label">
                  {{ item.Location?.Label || item.Location?.PoiName || '[位置]' }}
                </div>
                <div v-if="item.Location?.Lat && item.Location?.Lng" class="location-coords">
                  {{ item.Location.Lat }}, {{ item.Location.Lng }}
                </div>
              </div>
            </div>

            <!-- 链接消息 (有 Link 字段) -->
            <div v-else-if="item.Link" class="forwarded-link">
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
</template>

<style lang="scss" scoped>
.forwarded-dialog {
  max-height: 500px;
  overflow-y: auto;

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
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color);
    border-radius: 6px;

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

      .media-size {
        font-size: 12px;
        color: var(--el-text-color-secondary);
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
}

.dark-mode {
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