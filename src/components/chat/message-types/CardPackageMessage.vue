<script setup lang="ts">
import { Tickets } from '@element-plus/icons-vue'
import CardMessageBase from './CardMessageBase.vue'

interface Props {
  showMediaResources: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <CardMessageBase
    icon-gradient="linear-gradient(135deg, #ff9800 0%, #f57c00 100%)"
    :show-media-resources="showMediaResources"
    :placeholder-type="49"
    :placeholder-sub-type="16"
    @click="emit('click')"
  >
    <template #icon>
      <el-icon :size="24"><Tickets /></el-icon>
    </template>
    <div class="card-message__title">微信卡包</div>
    <div class="card-message__desc">请在微信客户端查看</div>
  </CardMessageBase>
</template>
