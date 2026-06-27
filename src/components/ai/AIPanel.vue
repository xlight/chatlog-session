<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useSessionStore } from '@/stores/session'
import { useAIAgentStore, deriveLevelPreset, applyLevelPreset } from '@/stores/ai/agent'
import { useMCPStore } from '@/stores/ai/mcp'
import type { AgentLevelPreset } from '@/types/ai/agent'
import { useRouter } from 'vue-router'
import { listModels } from '@/api/llm'
import type { ModelInfo } from '@/types/ai'
import SessionAgentConfigDialog from '@/components/chat/SessionAgentConfigDialog.vue'
import MCPStatusBadge from './MCPStatusBadge.vue'

const appStore = useAppStore()
const settingsStore = useSettingsStore()
const sessionStore = useSessionStore()
const agentStore = useAIAgentStore()
const mcpStore = useMCPStore()
const router = useRouter()

const dragging = ref(false)
const models = ref<ModelInfo[]>([])
const loadingModels = ref(false)

// ==================== Computed ====================

const isAiReady = computed(() => {
  return settingsStore.ai.enabled && settingsStore.ai.llmApiKey.length > 0
})

const isMobile = computed(() => appStore.isMobile)

// ==================== Agent Config ====================

const currentSessionId = computed(() => sessionStore.currentSessionId)
const showAgentDialog = ref(false)

const agentLevelColors: Record<AgentLevelPreset, string> = {
  L0: '#c0c4cc',
  L1: '#e6a23c',
  L2: '#409eff',
  L3: '#67c23a',
  L4: '#9b59b6',
  Custom: '#f56c6c',
}

const agentLevelLabels: Record<AgentLevelPreset, string> = {
  L0: '禁用', L1: '仅旁观', L2: '草稿确认',
  L3: '关键词自动', L4: '智能代理', Custom: '自定义',
}

const presetOptions: AgentLevelPreset[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'Custom']

const currentPreset = computed(() => {
  if (!currentSessionId.value) return 'L0' as AgentLevelPreset
  const config = agentStore.getEffectiveConfig(currentSessionId.value)
  return deriveLevelPreset(config)
})

const agentPermissionColor = computed(() => {
  return agentLevelColors[currentPreset.value]
})

function handlePresetChange(preset: AgentLevelPreset) {
  if (!currentSessionId.value) return
  if (preset === 'Custom') {
    showAgentDialog.value = true
    return
  }
  const patch = applyLevelPreset(preset)
  agentStore.setSessionConfig(currentSessionId.value, patch)
}

const panelWidthPx = computed(() => {
  const vw = window.innerWidth
  const pct = Math.min(Math.max(appStore.aiPanelWidth, 25), 70)
  return Math.round(vw * pct / 100)
})

// ==================== Model Loading ====================

async function loadModels() {
  if (!isAiReady.value) return
  loadingModels.value = true
  try {
    models.value = await listModels()
  } catch {
    // Silently fail - models list is best-effort
  } finally {
    loadingModels.value = false
  }
}

function handleModelChange(modelId: string) {
  settingsStore.ai.llmDefaultModel = modelId
}

// ==================== Drag Resize ====================

let activeMouseMove: ((ev: MouseEvent) => void) | null = null
let activeMouseUp: (() => void) | null = null

function startDrag(e: MouseEvent) {
  e.preventDefault()
  dragging.value = true
  const startX = e.clientX
  const startWidth = panelWidthPx.value
  const vw = window.innerWidth

  function onMouseMove(ev: MouseEvent) {
    const dx = startX - ev.clientX
    const newPx = startWidth + dx
    const minPx = 300
    const maxPx = Math.round(vw * 0.7)
    const clamped = Math.min(Math.max(newPx, minPx), maxPx)
    appStore.aiPanelWidth = Math.round(clamped / vw * 100)
  }

  function onMouseUp() {
    dragging.value = false
    localStorage.setItem('ai-panel-width', String(appStore.aiPanelWidth))
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    activeMouseMove = null
    activeMouseUp = null
  }

  activeMouseMove = onMouseMove
  activeMouseUp = onMouseUp
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

onUnmounted(() => {
  if (activeMouseMove) {
    document.removeEventListener('mousemove', activeMouseMove)
  }
  if (activeMouseUp) {
    document.removeEventListener('mouseup', activeMouseUp)
  }
  if (dragging.value) {
    dragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})

// ==================== Actions ====================

function handleClose() {
  appStore.aiPanelOpen = false
}

function goToSettings() {
  router.push('/settings?tab=ai')
}

// ==================== MCP Auto-Connect ====================

async function connectMCP() {
  if (!isAiReady.value) return
  if (mcpStore.connectedCount > 0 || mcpStore.connectingCount > 0) return
  try {
    await mcpStore.initialize()
  } catch {
    // Silently fail - MCP connection is best-effort
  }
}

// ==================== Lifecycle ====================

onMounted(() => {
  const saved = localStorage.getItem('ai-panel-width')
  if (saved) {
    const parsed = Number(saved)
    if (parsed >= 25 && parsed <= 70) {
      appStore.aiPanelWidth = parsed
    }
  }
  loadModels()
  connectMCP()
})
</script>

<template>
  <!-- Mobile Drawer -->
  <el-drawer
    v-if="isMobile"
    v-model="appStore.aiPanelOpen"
    :size="'100%'"
    direction="rtl"
    :with-header="false"
    :z-index="2001"
    class="ai-drawer-mobile"
  >
    <div class="ai-panel">
      <div class="ai-panel__header">
        <h3>AI 助手</h3>
        <MCPStatusBadge v-if="isAiReady" />
        <div class="ai-panel__header-actions">
          <el-select
            v-if="isAiReady && models.length > 0"
            :model-value="settingsStore.ai.llmDefaultModel"
            size="small"
            style="width: 160px"
            @update:model-value="handleModelChange"
          >
            <el-option
              v-for="m in models"
              :key="m.id"
              :value="m.id"
              :label="m.id"
            />
          </el-select>
          <el-select
            v-if="isAiReady && currentSessionId"
            :model-value="currentPreset"
            size="small"
            style="width: 100px"
            @update:model-value="handlePresetChange"
          >
            <el-option
              v-for="p in presetOptions"
              :key="p"
              :label="`${p} ${agentLevelLabels[p]}`"
              :value="p"
            >
              <span :style="{ color: agentLevelColors[p] }">{{ p }}</span>
              <span style="margin-left: 4px">{{ agentLevelLabels[p] }}</span>
            </el-option>
          </el-select>
          <el-tooltip v-if="isAiReady && currentSessionId" content="Agent 设置" placement="bottom">
            <el-button text @click="showAgentDialog = true">
              <el-icon :style="{ color: agentPermissionColor }">
                <Cpu />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-button
            v-if="!isAiReady"
            text
            size="small"
            @click="goToSettings"
          >
            <el-icon><Setting /></el-icon>
          </el-button>
          <slot name="header-actions" />
          <el-button text @click="handleClose">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="ai-panel__body">
        <slot />
      </div>
    </div>
  </el-drawer>

  <!-- Desktop Panel -->
  <div
    v-else
    v-show="appStore.aiPanelOpen"
    class="ai-panel ai-panel--desktop"
    :style="{ width: panelWidthPx + 'px' }"
  >
    <!-- Drag Handle -->
    <div
      class="ai-panel__drag-handle"
      @mousedown="startDrag"
    />

      <div class="ai-panel__header">
      <div class="ai-panel__header-left">
        <h3>AI 助手</h3>
        <MCPStatusBadge v-if="isAiReady" />
        <el-select
          v-if="isAiReady && models.length > 0"
          :model-value="settingsStore.ai.llmDefaultModel"
          size="small"
          style="width: 160px"
          @update:model-value="handleModelChange"
        >
          <el-option
            v-for="m in models"
            :key="m.id"
            :value="m.id"
            :label="m.id"
          />
        </el-select>
        <el-select
          v-if="isAiReady && currentSessionId"
          :model-value="currentPreset"
          size="small"
          style="width: 100px"
          @update:model-value="handlePresetChange"
        >
          <el-option
            v-for="p in presetOptions"
            :key="p"
            :label="`${p} ${agentLevelLabels[p]}`"
            :value="p"
          >
            <span :style="{ color: agentLevelColors[p] }">{{ p }}</span>
            <span style="margin-left: 4px">{{ agentLevelLabels[p] }}</span>
          </el-option>
        </el-select>
      </div>
      <div class="ai-panel__header-actions">
        <el-tooltip v-if="isAiReady && currentSessionId" content="Agent 设置" placement="bottom">
          <el-button text @click="showAgentDialog = true">
            <el-icon :style="{ color: agentPermissionColor }">
              <Cpu />
            </el-icon>
          </el-button>
        </el-tooltip>
        <slot name="header-actions" />
        <el-button text @click="handleClose">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="ai-panel__body">
      <!-- Unconfigured state -->
      <div v-if="!isAiReady" class="ai-panel__empty">
        <el-empty description="AI 服务未配置">
          <template #image>
            <el-icon :size="48" color="var(--el-text-color-placeholder)">
              <Cpu />
            </el-icon>
          </template>
          <el-button type="primary" @click="goToSettings">
            前往设置
          </el-button>
        </el-empty>
      </div>

      <!-- Ready state - slot content -->
      <slot v-else />
    </div>
  </div>

  <SessionAgentConfigDialog
    v-if="currentSessionId"
    v-model="showAgentDialog"
    :session-id="currentSessionId"
    :session-name="''"
  />
</template>

<style lang="scss" scoped>
.ai-panel {
  height: 100%;
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  position: relative;

  &--desktop {
    border-left: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  &__drag-handle {
    position: absolute;
    left: -4px;
    top: 0;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;

    &:hover {
      background-color: var(--el-color-primary-light-5);
      opacity: 0.4;
    }
  }

  &__header {
    height: 60px;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
    }

    &-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    &-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
  }

  &__body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.ai-drawer-mobile :deep(.el-drawer__body) {
  padding: 0;
}
</style>
