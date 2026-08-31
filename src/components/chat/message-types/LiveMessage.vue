<script setup lang="ts">
import { computed } from 'vue'
import { VideoCamera } from '@element-plus/icons-vue'
import CardMessageBase from './CardMessageBase.vue'

interface Props {
  title?: string
  showMediaResources?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '直播',
  showMediaResources: true
})

const title = computed(() => props.title || '直播')
</script>

<template>
  <CardMessageBase
    icon-gradient="linear-gradient(135deg, #FF8C61 0%, #FF6B35 100%)"
    :clickable="false"
    :hoverable="true"
    :show-arrow="false"
    :show-media-resources="showMediaResources"
    :placeholder-type="49"
    :placeholder-sub-type="0"
  >
    <template #icon>
      <el-icon :size="24" color="#fff"><VideoCamera /></el-icon>
    </template>
    <div class="card-message__title">{{ title }}</div>
    <div class="live-badge">
      <el-icon :size="12"><VideoCamera /></el-icon>
      <span>直播</span>
    </div>
  </CardMessageBase>
</template>

<style scoped lang="scss">
.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #FF6B35 0%, #FF4500 100%);
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(255, 107, 53, 0.3);

  .el-icon {
    animation: pulse 1.5s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

// 暗色模式：title 颜色适配
html.dark {
  :deep(.card-message__title) {
    color: #E5E5E5;
  }
}
</style>
