<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChatExportStore } from '@/stores/chatExport'

/**
 * Props 接口
 */
interface Props {
  visible: boolean
  sessionId?: string
  sessionName?: string
}

/**
 * Emits 接口
 */
interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const exportStore = useChatExportStore()

// ==================== Computed ====================

/**
 * 对话框可见性（支持 v-model）
 */
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
    if (!value) {
      emit('close')
      exportStore.resetState()
    }
  },
})

// ==================== Methods ====================

/**
 * 关闭对话框
 */
function handleClose() {
  if (exportStore.stage === 'progress') {
    handleCancel()
  }
  emit('update:visible', false)
  emit('close')
  exportStore.resetState()
}

/**
 * 开始导出
 */
async function handleStartExport() {
  if (!props.sessionId) return

  await exportStore.startExport(props.sessionId, props.sessionName || '')

  if (exportStore.stage === 'complete') {
    emit('success')
  }
}

/**
 * 复制到剪贴板
 */
async function handleCopyToClipboard() {
  if (!props.sessionId) return

  await exportStore.startCopyToClipboard(props.sessionId, props.sessionName || '')

  if (exportStore.stage === 'complete') {
    emit('success')
  }
}

/**
 * 取消导出
 */
function handleCancel() {
  exportStore.cancelExport()
}

/**
 * 重试导出
 */
function handleRetry() {
  exportStore.retryExport()
}

// ==================== Watch ====================

/**
 * 监听对话框可见性
 */
watch(
  () => props.visible,
  newVal => {
    if (!newVal) {
      setTimeout(() => exportStore.resetState(), 300)
    }
  }
)
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="exportStore.dialogTitle"
    width="500px"
    :close-on-click-modal="exportStore.stage !== 'progress'"
    :show-close="exportStore.stage !== 'progress'"
    :close-on-press-escape="exportStore.stage !== 'progress'"
    @close="handleClose"
  >
    <!-- 配置阶段 -->
    <template v-if="exportStore.stage === 'config'">
      <div class="export-config">
        <!-- 导出格式 -->
        <div class="config-section">
          <label class="section-label">导出格式</label>
          <el-radio-group v-model="exportStore.exportFormat" class="format-group">
            <el-radio-button value="json">JSON</el-radio-button>
            <el-radio-button value="csv">CSV</el-radio-button>
            <el-radio-button value="txt">TXT</el-radio-button>
            <el-radio-button value="markdown">Markdown</el-radio-button>
          </el-radio-group>
          <p class="format-desc">
            <template v-if="exportStore.exportFormat === 'json'"
              >导出为结构化 JSON 文件，包含完整消息信息</template
            >
            <template v-else-if="exportStore.exportFormat === 'csv'">导出为 CSV 表格，便于 Excel 分析</template>
            <template v-else-if="exportStore.exportFormat === 'markdown'"
              >导出为 Markdown 格式，适合文档编辑和笔记软件</template
            >
            <template v-else>导出为纯文本格式，便于阅读</template>
          </p>
        </div>

        <!-- 时间范围 -->
        <div class="config-section">
          <label class="section-label">时间范围</label>
          <el-select v-model="exportStore.timeRangeType" class="time-range-select">
            <el-option label="全部消息" value="all" />
            <el-option label="最近7天" value="last7Days" />
            <el-option label="最近30天" value="last30Days" />
            <el-option label="自定义范围" value="custom" />
          </el-select>

          <!-- 自定义日期选择 -->
          <div v-if="exportStore.timeRangeType === 'custom'" class="custom-date-range">
            <el-date-picker
              v-model="exportStore.customStartDate"
              type="date"
              placeholder="开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
            />
            <span class="date-separator">至</span>
            <el-date-picker
              v-model="exportStore.customEndDate"
              type="date"
              placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
            />
          </div>

          <p v-if="!exportStore.isTimeRangeValid && exportStore.timeRangeType === 'custom'" class="error-hint">
            请选择有效的日期范围
          </p>
        </div>

        <!-- 消息类型 -->
        <div class="config-section">
          <label class="section-label">消息类型</label>
          <el-radio-group v-model="exportStore.messageTypeFilter">
            <el-radio value="all">全部类型</el-radio>
            <el-radio value="text">仅文本消息</el-radio>
            <el-radio value="withMedia">包含媒体引用</el-radio>
          </el-radio-group>
        </div>
      </div>
    </template>

    <!-- 进度阶段 -->
    <template v-else-if="exportStore.stage === 'progress'">
      <div class="export-progress">
        <el-progress
          :percentage="exportStore.progress"
          :stroke-width="12"
          :status="exportStore.progress === 100 ? 'success' : ''"
        />

        <div class="progress-info">
          <p class="progress-text">已处理 {{ exportStore.processedCount }} / {{ exportStore.totalEstimate }} 条消息</p>
          <p class="time-remaining">预计剩余时间: {{ exportStore.estimatedTimeText }}</p>
        </div>
      </div>
    </template>

    <!-- 完成阶段 -->
    <template v-else-if="exportStore.stage === 'complete'">
      <div class="export-complete">
        <el-result icon="success" :title="exportStore.exportMode === 'clipboard' ? '复制成功' : '导出成功'">
          <template #sub-title>
            <template v-if="exportStore.exportMode === 'clipboard'">
              <p>已复制到剪贴板</p>
              <p class="file-info">共复制 {{ exportStore.processedCount }} 条消息 ({{ exportStore.exportFormat.toUpperCase() }} 格式)</p>
            </template>
            <template v-else>
              <p>文件 "{{ exportStore.exportedFilename }}" 已下载</p>
              <p class="file-info">共导出 {{ exportStore.processedCount }} 条消息</p>
            </template>
          </template>
        </el-result>
      </div>
    </template>

    <!-- 错误阶段 -->
    <template v-else-if="exportStore.stage === 'error'">
      <div class="export-error">
        <el-result icon="error" title="导出失败">
          <template #sub-title>
            <p>{{ exportStore.errorMessage }}</p>
            <p class="error-hint">请检查网络连接或尝试缩小时间范围后重试</p>
          </template>
        </el-result>
      </div>
    </template>

    <!-- 底部按钮 -->
    <template #footer>
      <!-- 配置阶段按钮 -->
      <template v-if="exportStore.stage === 'config'">
        <el-button @click="handleClose">取消</el-button>
        <el-button :disabled="!exportStore.isTimeRangeValid || !sessionId" @click="handleCopyToClipboard">
          复制到剪贴板
        </el-button>
        <el-button type="primary" :disabled="!exportStore.isTimeRangeValid || !sessionId" @click="handleStartExport">
          开始导出
        </el-button>
      </template>

      <!-- 进度阶段按钮 -->
      <template v-else-if="exportStore.stage === 'progress'">
        <el-button @click="handleCancel">取消导出</el-button>
      </template>

      <!-- 完成阶段按钮 -->
      <template v-else-if="exportStore.stage === 'complete'">
        <el-button @click="handleClose">关闭</el-button>
      </template>

      <!-- 错误阶段按钮 -->
      <template v-else-if="exportStore.stage === 'error'">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleRetry">重试</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.export-config {
  padding: 10px 0;
}

.config-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-label {
  display: block;
  margin-bottom: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.format-group {
  display: flex;
  gap: 8px;
}

.format-desc {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.time-range-select {
  width: 100%;
}

.custom-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.date-picker {
  flex: 1;
}

.date-separator {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.error-hint {
  margin-top: 8px;
  color: var(--el-color-danger);
  font-size: 12px;
}

.export-progress {
  padding: 20px 0;
}

.progress-info {
  margin-top: 16px;
  text-align: center;
}

.progress-text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.time-remaining {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.export-complete,
.export-error {
  padding: 20px 0;
}

.file-info {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
