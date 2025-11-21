<script setup lang="ts">
import { computed } from 'vue'
import { useDisplayName } from '@/components/chat/composables'
import Avatar from '@/components/common/Avatar.vue'
import type { Session } from '@/types'

interface Props {
  session: Session
}

const props = defineProps<Props>()

// 使用 useDisplayName 获取显示名称
const { displayName } = useDisplayName({
  id: computed(() => props.session.id),
  defaultName: computed(() => props.session.name || props.session.talkerName)
})
</script>

<template>
  <div class="session-option">
    <Avatar 
      :src="session.avatar" 
      :name="displayName" 
      :size="24" 
    />
    <span class="session-name">{{ displayName }}</span>
  </div>
</template>

<style lang="scss" scoped>
.session-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;

  .session-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>