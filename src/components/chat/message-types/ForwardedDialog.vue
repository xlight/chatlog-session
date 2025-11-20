<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { formatFileSize } from '../composables/utils'
import { MESSAGE_TYPE_MAP, MESSAGE_ICON_MAP } from '../composables/constants'

interface ForwardedDataItem {
  SourceName: string
  SourceTime: string
  DataType: string
  DataDesc?: string
  DataTitle?: string
  DataSize?: string
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

const getForwardedMessageType = (dataType: string) => {
  return MESSAGE_TYPE_MAP[dataType] || '未知'
}

const getForwardedMessageIcon = (dataType: string) => {
  return MESSAGE_ICON_MAP[dataType] || 'QuestionFilled'
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
            <Avatar :name="item.SourceName" :size="32" />
            <div class="forwarded-item-info">
              <div class="forwarded-item-sender">{{ item.SourceName }}</div>
              <div class="forwarded-item-time">{{ item.SourceTime }}</div>
            </div>
          </div>

          <div class="forwarded-item-content">
            <!-- 文本消息 -->
            <div v-if="item.DataType === '1'" class="forwarded-text">
              {{ item.DataDesc }}
            </div>

            <!-- 图片消息 -->
            <div
              v-else-if="item.DataType === '2' || item.DataType === '3'"
              class="forwarded-media"
            >
              <el-icon><Picture /></el-icon>
              <span>[图片]</span>
              <span v-if="item.DataSize" class="media-size">{{
                formatFileSize(parseInt(item.DataSize))
              }}</span>
            </div>

            <!-- 文件消息 -->
            <div v-else-if="item.DataType === '8'" class="forwarded-file">
              <el-icon><Document /></el-icon>
              <div class="file-details">
                <div class="file-name">{{ item.DataTitle }}</div>
                <div v-if="item.DataSize" class="file-size">
                  {{ formatFileSize(parseInt(item.DataSize)) }}
                </div>
              </div>
            </div>

            <!-- 其他类型 -->
            <div v-else class="forwarded-other">
              <el-icon>
                <component :is="getForwardedMessageIcon(item.DataType)" />
              </el-icon>
              <span>[{{ getForwardedMessageType(item.DataType) }}]</span>
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
    padding: 12px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;

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
      padding-left: 44px;
    }
  }

  .forwarded-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .forwarded-media,
  .forwarded-other {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--el-text-color-secondary);

    .el-icon {
      font-size: 20px;
    }

    .media-size {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
    }
  }

  .forwarded-file {
    display: flex;
    align-items: center;
    gap: 12px;

    .el-icon {
      font-size: 32px;
      color: var(--el-color-primary);
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
      }

      .file-size {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }
}

.dark-mode {
  .forwarded-dialog {
    .forwarded-item {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>