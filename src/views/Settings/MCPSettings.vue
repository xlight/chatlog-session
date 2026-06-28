<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMCPClient } from '@/composables/useMCPClient'
import { useMCPStore } from '@/stores/ai/mcp'
import type { MCPServerConfig } from '@/types/ai/mcp'
import MCPServerDialog from './MCPServerDialog.vue'

const { servers, serverInfos, connectedCount, errorCount } = useMCPClient()
const mcpStore = useMCPStore()

const showDialog = ref(false)
const editingConfig = ref<MCPServerConfig | null>(null)

function handleAdd() {
  editingConfig.value = null
  showDialog.value = true
}

function handleEdit(config: MCPServerConfig) {
  editingConfig.value = config
  showDialog.value = true
}

function handleDelete(config: MCPServerConfig) {
  mcpStore.removeServer(config.id)
}

function handleToggleEnabled(config: MCPServerConfig) {
  mcpStore.updateServer(config.id, { enabled: !config.enabled })
}

async function handleConnect(config: MCPServerConfig) {
  try {
    await mcpStore.connectServer(config.id)
    ElMessage.success(`${config.name} 连接成功`)
  } catch (err) {
    ElMessage.error(`连接失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function handleDisconnect(config: MCPServerConfig) {
  await mcpStore.disconnectServer(config.id)
}

function handleSave(config: MCPServerConfig) {
  if (editingConfig.value) {
    mcpStore.updateServer(editingConfig.value.id, config)
  } else {
    mcpStore.addServer(config)
  }
}

function getStatusType(configId: string) {
  const info = serverInfos.value.get(configId)
  if (!info) return 'info'
  switch (info.status) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
}

function getStatusLabel(configId: string) {
  const info = serverInfos.value.get(configId)
  if (!info) return '未连接'
  switch (info.status) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中'
    case 'error': return '错误'
    default: return '未连接'
  }
}

function getToolCount(configId: string): number {
  return serverInfos.value.get(configId)?.tools.length ?? 0
}
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <h3>MCP Server 管理</h3>
      <p>配置 Model Context Protocol 服务器，为 AI 提供工具调用能力</p>
    </div>

    <div class="mcp-settings__summary">
      <el-tag type="success" effect="plain">{{ connectedCount }} 已连接</el-tag>
      <el-tag v-if="errorCount > 0" type="danger" effect="plain">{{ errorCount }} 错误</el-tag>
    </div>

    <div v-if="servers.length === 0" class="mcp-settings__empty">
      <el-empty description="暂无 MCP Server 配置" :image-size="64">
        <el-button type="primary" @click="handleAdd">添加 MCP Server</el-button>
      </el-empty>
    </div>

    <div v-else class="mcp-settings__list">
      <div v-for="server in servers" :key="server.id" class="mcp-server-item">
        <div class="mcp-server-item__info">
          <div class="mcp-server-item__header">
            <span class="mcp-server-item__name">{{ server.name }}</span>
            <el-tag v-if="server.builtin" type="warning" size="small" effect="plain">内置</el-tag>
            <el-tag :type="getStatusType(server.id)" size="small" effect="plain">
              {{ getStatusLabel(server.id) }}
            </el-tag>
            <el-tag v-if="getToolCount(server.id) > 0" type="info" size="small" effect="plain">
              {{ getToolCount(server.id) }} 工具
            </el-tag>
          </div>
          <div class="mcp-server-item__meta">
            <span>{{ server.transport }}</span>
            <span>{{ server.url }}</span>
          </div>
        </div>
        <div class="mcp-server-item__actions">
          <el-switch
            :model-value="server.enabled"
            size="small"
            @change="handleToggleEnabled(server)"
          />
          <el-button
            v-if="getStatusType(server.id) !== 'success' && getStatusType(server.id) !== 'warning'"
            size="small"
            type="primary"
            text
            @click="handleConnect(server)"
          >
            连接
          </el-button>
          <el-button
            v-if="getStatusType(server.id) === 'success' || getStatusType(server.id) === 'warning'"
            size="small"
            type="danger"
            text
            @click="handleDisconnect(server)"
          >
            断开
          </el-button>
          <el-button v-if="!server.builtin" size="small" text @click="handleEdit(server)">编辑</el-button>
          <el-button v-if="!server.builtin" size="small" type="danger" text @click="handleDelete(server)">删除</el-button>
        </div>
      </div>

      <el-button type="primary" plain style="margin-top: 12px" @click="handleAdd">
        添加 MCP Server
      </el-button>
    </div>

    <MCPServerDialog
      v-model="showDialog"
      :edit-config="editingConfig"
      @save="handleSave"
    />
  </div>
</template>

<style lang="scss" scoped>
.mcp-settings__summary {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mcp-settings__empty {
  padding: 24px 0;
}

.mcp-settings__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mcp-server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__name {
    font-weight: 500;
  }

  &__meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    display: flex;
    gap: 12px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}
</style>
