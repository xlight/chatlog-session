<script setup lang="ts">
import { computed } from 'vue'
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  label: string
  x: string // 纬度
  y: string // 经度
  cityname?: string
  showMediaResources: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

// 格式化坐标显示
const coordinateText = computed(() => {
  return `${props.x}, ${props.y}`
})
</script>

<template>
  <div class="message-location" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="location-icon">
        <el-icon :size="24"><Location /></el-icon>
      </div>
      <div class="location-content">
        <div class="location-label">{{ label }}</div>
        <div v-if="cityname" class="location-city">{{ cityname }}</div>
        <div class="location-coordinates">{{ coordinateText }}</div>
      </div>
      <el-icon class="location-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(48, 0) }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use './_shared.scss' as *;

.message-location {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;
  max-width: 320px;

  .location-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    flex-shrink: 0;
  }

  .location-content {
    flex: 1;
    min-width: 0;

    .location-label {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .location-city {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .location-coordinates {
      font-size: 11px;
      color: var(--el-text-color-secondary);
      font-family: 'Courier New', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .location-arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .media-placeholder {


    @include media-placeholder;


  }

  &:hover {
    opacity: 0.8;
  }
}
</style>