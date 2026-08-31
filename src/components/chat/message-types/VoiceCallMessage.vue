<script setup lang="ts">
import { computed } from 'vue'
import { Phone } from '@element-plus/icons-vue'
import CardMessageBase from './CardMessageBase.vue'

interface Props {
  content: string
  showMediaResources: boolean
  isSelf?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelf: false
})

const emit = defineEmits<{
  click: []
}>()

// 解析通话信息
const callInfo = computed(() => {
  if (props.content) {
    const match = props.content.match(/\[语音通话\|(.+?)\]/)
    if (match) {
      const info = match[1].split('|')
      return {
        status: info[0] || '通话',
        duration: info[1] || ''
      }
    }
  }

  return {
    status: '语音通话',
    duration: ''
  }
})

// 格式化通话时长显示
const formattedDuration = computed(() => {
  if (callInfo.value.duration) {
    return callInfo.value.duration
  }
  return ''
})
</script>

<template>
  <CardMessageBase
    icon-gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    :show-media-resources="showMediaResources"
    :placeholder-type="50"
    :placeholder-sub-type="0"
    @click="emit('click')"
  >
    <template #icon>
      <el-icon :size="24"><Phone /></el-icon>
    </template>
    <div class="card-message__title">{{ callInfo.status }}</div>
    <div v-if="formattedDuration" class="call-duration">{{ formattedDuration }}</div>
  </CardMessageBase>
</template>

<style lang="scss" scoped>
.call-duration {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
</style>
