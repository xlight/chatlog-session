<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'
import { listModels } from '@/api/llm'
import type { ModelInfo } from '@/types/ai'

const appStore = useAppStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const dragging = ref(false)
const models = ref<ModelInfo[]>([])
const loadingModels = ref(false)

// ==================== Computed ====================

const isAiReady = computed(() => {
  return settingsStore.ai.enabled && settingsStore.ai.llmApiKey.length > 0
})

const isMobile = computed(() => appStore.isMobile)

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
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// ==================== Actions ====================

function handleClose() {
  appStore.aiPanelOpen = false
}

function goToSettings() {
  router.push('/settings?tab=ai')
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
      </div>
      <div class="ai-panel__header-actions">
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
