<script setup lang="ts">
import { Headset } from '@element-plus/icons-vue'
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
    icon-gradient="linear-gradient(135deg, #31c27c 0%, #1faa5f 100%)"
    :show-media-resources="showMediaResources"
    :placeholder-type="49"
    :placeholder-sub-type="3"
    @click="emit('click')"
  >
    <template #icon>
      <el-icon :size="24"><Headset /></el-icon>
    </template>
    <div class="card-message__title">QQ音乐</div>
    <div class="card-message__desc">请在微信客户端查看</div>
  </CardMessageBase>
</template>
