<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/types/ai'

const props = defineProps<{
  message: ChatMessage
  thinkingContent?: string
  thinkingVisible?: boolean
}>()

const emit = defineEmits<{
  'toggle-thinking': []
}>()

const isUser = computed(() => props.message.role === 'user')
const isSystem = computed(() => props.message.role === 'system')
const content = computed(() => props.message.content || '')
const hasThinking = computed(() => !!props.thinkingContent)
const localThinkingVisible = ref(true)
</script>

<template>
  <div
    class="ai-message"
    :class="{
      'ai-message--user': isUser,
      'ai-message--assistant': !isUser && !isSystem,
      'ai-message--system': isSystem,
    }"
  >
    <!-- 角色标识 -->
    <div class="ai-message__avatar">
      <el-icon v-if="isUser" :size="18"><User /></el-icon>
      <el-icon v-else :size="18" color="var(--el-color-primary)"><Cpu /></el-icon>
    </div>

    <div class="ai-message__body">
      <!-- 思考过程（推理内容） -->
      <div v-if="hasThinking && !isUser" class="ai-message__thinking">
        <el-button
          text
          size="small"
          class="thinking-toggle"
          @click="localThinkingVisible = !localThinkingVisible"
        >
          <el-icon :class="{ rotated: localThinkingVisible }">
            <CaretRight />
          </el-icon>
          <span>已思考</span>
          <el-tag size="small" type="info" effect="plain">推理</el-tag>
        </el-button>
        <div v-show="localThinkingVisible" class="thinking-content">
          {{ thinkingContent }}
        </div>
      </div>

      <!-- 消息内容（纯文本，后续可加 Markdown 渲染） -->
      <div class="ai-message__content">
        <template v-if="content">
          {{ content }}
        </template>
        <template v-else>
          <span class="ai-message__placeholder">...</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-message {
  display: flex;
  gap: 8px;
  padding: 12px 16px;

  &--user {
    .ai-message__avatar {
      order: 1;
    }
    .ai-message__body {
      order: 0;
    }
  }

  &--assistant {
    background-color: var(--el-fill-color-light);
  }

  &--system {
    background-color: var(--el-color-warning-light-9);
    font-style: italic;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    .ai-message__avatar {
      opacity: 0.5;
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--el-fill-color);
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__thinking {
    margin-bottom: 8px;
    font-size: 13px;
  }

  .thinking-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    color: var(--el-text-color-secondary);

    .rotated {
      transform: rotate(90deg);
    }
  }

  .thinking-content {
    margin-top: 4px;
    padding: 8px 12px;
    background-color: var(--el-fill-color-darker);
    border-radius: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }

  &__content {
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--el-text-color-primary);
  }

  &__placeholder {
    color: var(--el-text-color-placeholder);
  }
}
</style>
