<script setup lang="ts">
import { computed } from 'vue'
import { useMCPClient } from '@/composables/useMCPClient'

const { connectedCount, connectingCount, errorCount } = useMCPClient()

const badgeType = computed(() => {
  if (errorCount.value > 0) return 'danger'
  if (connectingCount.value > 0) return 'warning'
  if (connectedCount.value > 0) return 'success'
  return 'info'
})

const badgeLabel = computed(() => {
  const parts: string[] = []
  if (connectedCount.value > 0) parts.push(`${connectedCount.value} 已连接`)
  if (connectingCount.value > 0) parts.push(`${connectingCount.value} 连接中`)
  if (errorCount.value > 0) parts.push(`${errorCount.value} 错误`)
  return parts.length > 0 ? `MCP: ${parts.join(' / ')}` : 'MCP: 未连接'
})
</script>

<template>
  <el-tag :type="badgeType" size="small" effect="plain" class="mcp-status-badge">
    {{ badgeLabel }}
  </el-tag>
</template>

<style lang="scss" scoped>
.mcp-status-badge {
  cursor: default;
}
</style>
