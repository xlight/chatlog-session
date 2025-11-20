<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  imageUrl: string
  showMediaResources: boolean
  md5?: string
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
  <div class="message-image" @click="handleClick">
    <template v-if="showMediaResources">
      <el-image
        v-if="imageUrl"
        :src="imageUrl"
        fit="cover"
        lazy
        :preview-src-list="[imageUrl]"
        class="image-content"
      >
        <template #error>
          <div class="image-error">
            <el-icon><Picture /></el-icon>
            <span>图片加载失败</span>
          </div>
        </template>
      </el-image>
      <div v-else class="image-placeholder">
        <el-icon><Picture /></el-icon>
        <span>图片 (MD5: {{ md5?.substring(0, 8) }}...)</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(3) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-image {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  max-width: 300px;

  .image-content {
    display: block;
    width: 100%;
    max-height: 300px;
    object-fit: cover;
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;

    .el-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
  }

  .image-placeholder {
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
      font-size: 32px;
      margin-bottom: 8px;
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
}

.dark-mode {
  .message-image .image-error,
  .image-placeholder {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>