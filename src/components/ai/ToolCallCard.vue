<script setup lang="ts">
import { computed } from 'vue'
import type { ToolCallRecord } from '@/types/ai/mcp'

const props = defineProps<{
  record: ToolCallRecord
}>()

const emit = defineEmits<{
  confirm: [id: string]
  reject: [id: string]
}>()

const statusConfig = computed(() => {
  switch (props.record.status) {
    case 'calling':
      return { type: 'info' as const, icon: 'Loading', label: '调用中' }
    case 'confirming':
      return { type: 'warning' as const, icon: 'Warning', label: '待确认' }
    case 'success':
      return { type: 'success' as const, icon: 'CircleCheck', label: '成功' }
    case 'error':
      return { type: 'danger' as const, icon: 'CircleClose', label: '失败' }
    case 'rejected':
      return { type: 'info' as const, icon: 'CircleClose', label: '已拒绝' }
    case 'timeout':
      return { type: 'warning' as const, icon: 'Clock', label: '超时' }
    default:
      return { type: 'info' as const, icon: 'InfoFilled', label: props.record.status }
  }
})

const showConfirmButtons = computed(() => props.record.status === 'confirming')

const displayArgs = computed(() => {
  try {
    return JSON.stringify(JSON.parse(props.record.arguments), null, 2)
  } catch {
    return props.record.arguments
  }
})

const displayResult = computed(() => {
  if (!props.record.result) return ''
  try {
    return JSON.stringify(JSON.parse(props.record.result), null, 2)
  } catch {
    return props.record.result
  }
})
</script>

<template>
  <div class="tool-call-card" :class="`tool-call-card--${record.status}`">
    <div class="tool-call-card__header">
      <el-tag :type="statusConfig.type" size="small" effect="plain">
        {{ statusConfig.label }}
      </el-tag>
      <span class="tool-call-card__name">{{ record.namespacedName }}</span>
      <span class="tool-call-card__server">[{{ record.serverId }}]</span>
    </div>

    <div v-if="displayArgs" class="tool-call-card__args">
      <pre>{{ displayArgs }}</pre>
    </div>

    <div v-if="displayResult" class="tool-call-card__result">
      <pre>{{ displayResult }}</pre>
    </div>

    <div v-if="record.error" class="tool-call-card__error">
      {{ record.error }}
    </div>

    <div v-if="showConfirmButtons" class="tool-call-card__actions">
      <el-button type="primary" size="small" @click="emit('confirm', record.id)">
        确认执行
      </el-button>
      <el-button size="small" @click="emit('reject', record.id)">
        拒绝
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tool-call-card {
  margin: 6px 0;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
  background-color: var(--el-fill-color-lighter);
  font-size: 13px;

  &--calling {
    border-color: var(--el-color-info-light-5);
  }

  &--confirming {
    border-color: var(--el-color-warning-light-5);
    background-color: var(--el-color-warning-light-9);
  }

  &--success {
    border-color: var(--el-color-success-light-5);
  }

  &--error,
  &--timeout {
    border-color: var(--el-color-danger-light-5);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__name {
    font-weight: 500;
    font-family: var(--fontStack-monospace, monospace);
    font-size: 12px;
  }

  &__server {
    color: var(--el-text-color-secondary);
    font-size: 11px;
  }

  &__args,
  &__result {
    margin-top: 6px;

    pre {
      margin: 0;
      padding: 6px 8px;
      background-color: var(--el-fill-color);
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      max-height: 120px;
    }
  }

  &__error {
    margin-top: 6px;
    color: var(--el-color-danger);
    font-size: 12px;
  }

  &__actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
}
</style>
