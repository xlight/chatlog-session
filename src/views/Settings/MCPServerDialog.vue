<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MCPServerConfig, MCPTransportType } from '@/types/ai/mcp'

const props = defineProps<{
  modelValue: boolean
  editConfig?: MCPServerConfig | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [config: MCPServerConfig]
}>()

const isEdit = computed(() => !!props.editConfig)

const form = ref<Omit<MCPServerConfig, 'id'>>({
  name: '',
  transport: 'streamable-http',
  url: '',
  headers: {},
  timeout: 30000,
  enabled: true,
  autoConnect: true,
})

const headerKey = ref('')
const headerValue = ref('')
const customHeaders = ref<Record<string, string>>({})

watch(
  () => props.editConfig,
  (config) => {
    if (config) {
      form.value = {
        name: config.name,
        transport: config.transport,
        url: config.url,
        headers: { ...config.headers },
        timeout: config.timeout ?? 30000,
        enabled: config.enabled,
        autoConnect: config.autoConnect ?? true,
      }
      customHeaders.value = { ...config.headers }
    } else {
      form.value = {
        name: '',
        transport: 'streamable-http',
        url: '',
        headers: {},
        timeout: 30000,
        enabled: true,
        autoConnect: true,
      }
      customHeaders.value = {}
    }
  },
  { immediate: true }
)

function addHeader() {
  if (!headerKey.value.trim()) return
  customHeaders.value[headerKey.value.trim()] = headerValue.value.trim()
  headerKey.value = ''
  headerValue.value = ''
}

function removeHeader(key: string) {
  delete customHeaders.value[key]
}

function handleSave() {
  if (!form.value.name.trim() || !form.value.url.trim()) return

  const config: MCPServerConfig = {
    id: props.editConfig?.id ?? `mcp-${Date.now()}`,
    name: form.value.name.trim(),
    transport: form.value.transport,
    url: form.value.url.trim(),
    headers: Object.keys(customHeaders.value).length > 0 ? { ...customHeaders.value } : undefined,
    timeout: form.value.timeout,
    enabled: form.value.enabled,
    autoConnect: form.value.autoConnect,
  }

  emit('save', config)
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑 MCP Server' : '添加 MCP Server'"
    width="520px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="left" label-width="100px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" placeholder="My MCP Server" />
      </el-form-item>

      <el-form-item label="传输类型">
        <el-select v-model="form.transport" style="width: 100%">
          <el-option label="Streamable HTTP (推荐)" value="streamable-http" />
          <el-option label="SSE (旧版兼容)" value="sse" />
        </el-select>
      </el-form-item>

      <el-form-item label="URL" required>
        <el-input v-model="form.url" placeholder="http://localhost:3000/mcp" />
      </el-form-item>

      <el-form-item label="超时 (ms)">
        <el-input-number v-model="form.timeout" :min="5000" :max="120000" :step="5000" />
      </el-form-item>

      <el-form-item label="自定义请求头">
        <div class="header-editor">
          <div v-for="(val, key) in customHeaders" :key="key" class="header-entry">
            <el-tag closable @close="removeHeader(key as string)">
              {{ key }}: {{ val }}
            </el-tag>
          </div>
          <div class="header-input-row">
            <el-input v-model="headerKey" placeholder="Header 名" style="width: 160px" />
            <el-input v-model="headerValue" placeholder="Header 值" style="width: 160px" />
            <el-button size="small" @click="addHeader">添加</el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>

      <el-form-item label="自动连接">
        <el-switch v-model="form.autoConnect" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button
        type="primary"
        :disabled="!form.name.trim() || !form.url.trim()"
        @click="handleSave"
      >
        {{ isEdit ? '保存' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.header-editor {
  width: 100%;
}

.header-entry {
  margin-bottom: 4px;
}

.header-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
