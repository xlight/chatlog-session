<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  emojiUrl: string
  showMediaResources: boolean
  cdnurl?: string
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="message-emoji" @click="handleClick">
    <template v-if="showMediaResources">
      <img v-if="emojiUrl" :src="emojiUrl" alt="emoji" class="emoji-image" />
      <div v-else class="emoji-placeholder">
        <el-icon><HappyFilled /></el-icon>
        <span v-if="cdnurl">表情 (CDN: {{ cdnurl.substring(0, 30) }}...)</span>
        <span v-else>表情</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(47) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-emoji {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  cursor: pointer;

  .emoji-image {
    width: 120px;
    height: 120px;
    object-fit: contain;
    display: block;
  }

  .emoji-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    border-radius: 4px;

    .el-icon {
      font-size: 48px;
      margin-bottom: 8px;
      color: var(--el-color-warning);
    }

    span {
      text-align: center;
      word-break: break-all;
    }
  }

  .media-placeholder {
    display: inline-block;
    padding: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-style: italic;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    border: 1px dashed var(--el-border-color);

    &:hover {
      background: var(--el-fill-color);
    }
  }

  &:hover {
    opacity: 0.9;
  }
}

.dark-mode {
  .message-emoji .emoji-placeholder {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>