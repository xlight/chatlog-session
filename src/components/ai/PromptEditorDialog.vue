<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAIPromptStore } from '@/stores/ai/prompt'
import type { PromptTemplate, PromptVariable } from '@/types/ai'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  template?: PromptTemplate | null
  isBuiltin?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
  reset: [id: string]
}>()

const promptStore = useAIPromptStore()

const formName = ref('')
const formDescription = ref('')
const formContent = ref('')
const formTags = ref<string[]>([])
const formVariables = ref<PromptVariable[]>([])
const newTagInput = ref('')
const newTagVisible = ref(false)

const canSave = computed(() => formName.value.trim() !== '' && formContent.value.trim() !== '')

const dialogTitle = computed(() => (props.mode === 'create' ? '新建 Prompt' : '编辑 Prompt'))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.mode === 'edit' && props.template) {
        formName.value = props.template.name
        formDescription.value = props.template.description
        formContent.value = props.template.content
        formTags.value = [...props.template.tags]
        formVariables.value = props.template.variables.map((v) => ({ ...v }))
      } else {
        formName.value = ''
        formDescription.value = ''
        formContent.value = ''
        formTags.value = []
        formVariables.value = []
      }
    }
  }
)

watch(formContent, (val) => {
  const extracted = promptStore.extractVariables(val)
  const existingMap = new Map(formVariables.value.map((v) => [v.name, v]))
  formVariables.value = extracted.map((v) => existingMap.get(v.name) ?? v)
})

function handleClose() {
  emit('update:modelValue', false)
}

function handleSave() {
  if (!canSave.value) return

  const data: Partial<PromptTemplate> = {
    name: formName.value.trim(),
    description: formDescription.value.trim(),
    content: formContent.value.trim(),
    variables: formVariables.value,
    tags: formTags.value,
  }

  if (props.isBuiltin && props.template) {
    promptStore.updateBuiltinOverride(props.template.id, data)
  } else if (props.mode === 'create' || !props.template) {
    const newPrompt: PromptTemplate = {
      id: 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: data.name!,
      description: data.description ?? '',
      category: 'custom',
      content: data.content!,
      variables: data.variables ?? [],
      tags: data.tags ?? [],
    }
    promptStore.addCustomPrompt(newPrompt)
  } else {
    promptStore.updateCustomPrompt(props.template.id, data)
  }

  emit('saved')
  handleClose()
}

function handleReset() {
  if (!props.template) return
  promptStore.removeBuiltinOverride(props.template.id)
  emit('reset', props.template.id)
  handleClose()
}

function handleAddTag() {
  const tag = newTagInput.value.trim()
  if (tag && !formTags.value.includes(tag)) {
    formTags.value.push(tag)
  }
  newTagInput.value = ''
  newTagVisible.value = false
}

function handleRemoveTag(tag: string) {
  formTags.value = formTags.value.filter((t) => t !== tag)
}

function updateVariableDesc(index: number, val: string) {
  formVariables.value[index] = { ...formVariables.value[index], description: val }
}

function updateVariableDefault(index: number, val: string) {
  formVariables.value[index] = { ...formVariables.value[index], defaultValue: val || undefined }
}

function updateVariableSource(index: number, val: 'auto' | 'manual') {
  formVariables.value[index] = { ...formVariables.value[index], source: val }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="560px"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <el-form label-position="top">
      <el-form-item label="模板名称" required>
        <el-input v-model="formName" placeholder="输入模板名称" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="formDescription" placeholder="输入模板描述" />
      </el-form-item>

      <el-form-item label="模板内容" required>
        <el-input
          v-model="formContent"
          type="textarea"
          :rows="6"
          placeholder="输入模板内容，使用 {变量名} 定义变量"
        />
        <div class="variable-hint">使用 {'{变量名}'} 定义变量，如 {'{content}'}、{'{tone}'}</div>
      </el-form-item>

      <el-form-item v-if="formVariables.length > 0" label="变量预览">
        <el-table :data="formVariables" size="small" border>
          <el-table-column prop="name" label="变量名" width="120" />
          <el-table-column label="说明" width="150">
            <template #default="{ row, $index }">
              <el-input
                :model-value="row.description"
                size="small"
                @update:model-value="updateVariableDesc($index, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column label="默认值" width="120">
            <template #default="{ row, $index }">
              <el-input
                :model-value="row.defaultValue ?? ''"
                size="small"
                @update:model-value="updateVariableDefault($index, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column label="来源" width="100">
            <template #default="{ row, $index }">
              <el-select
                :model-value="row.source"
                size="small"
                @update:model-value="updateVariableSource($index, $event)"
              >
                <el-option label="自动" value="auto" />
                <el-option label="手动" value="manual" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item>

      <el-form-item label="标签">
        <div class="tag-area">
          <el-tag
            v-for="tag in formTags"
            :key="tag"
            closable
            size="small"
            @close="handleRemoveTag(tag)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="newTagVisible"
            ref="tagInputRef"
            v-model="newTagInput"
            size="small"
            style="width: 100px"
            @keyup.enter="handleAddTag"
            @blur="handleAddTag"
          />
          <el-button v-else size="small" @click="newTagVisible = true">
            + 添加
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="isBuiltin" type="warning" @click="handleReset">
          恢复默认
        </el-button>
        <div class="dialog-footer__right">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :disabled="!canSave" @click="handleSave">
            保存
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.variable-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tag-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__right {
    display: flex;
    gap: 8px;
  }
}
</style>
