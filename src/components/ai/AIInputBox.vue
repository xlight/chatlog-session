<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  send: [message: string]
  stop: []
}>()

const props = defineProps<{
  loading?: boolean
  placeholder?: string
}>()

const input = ref('')

function handleSend() {
  const text = input.value.trim()
  if (!text || props.loading) return
  emit('send', text)
  input.value = ''
}

function handleKeydown(e: KeyboardEvent | Event) {
  const ke = e as KeyboardEvent
  if (ke.key === 'Enter' && !ke.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="ai-input-box">
    <el-input
      v-model="input"
      :placeholder="placeholder || '输入消息...'"
      type="textarea"
      :rows="2"
      :disabled="loading"
      resize="none"
      @keydown="handleKeydown"
    />
    <div class="ai-input-box__actions">
      <slot name="extra" />
      <div class="ai-input-box__right">
        <el-button
          v-if="loading"
          type="danger"
          @click="emit('stop')"
        >
          <el-icon><VideoPause /></el-icon>
          停止
        </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="!input.trim()"
          @click="handleSend"
        >
          <el-icon><Promotion /></el-icon>
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-input-box {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  &__right {
    display: flex;
    gap: 8px;
  }
}
</style>
