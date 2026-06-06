<script setup lang="ts">
import { computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIConversationStore } from '@/stores/ai/conversation'
import { INJECT_DRAFT_KEY, type InjectDraftFn } from '@/composables/injectDraftKey'

const conversation = useAIConversationStore()
const injectDraft = inject<InjectDraftFn>(INJECT_DRAFT_KEY)

const showCard = computed(
  () => conversation.lastReply !== null && !conversation.lastReply.injected
)

const cardTitle = computed(() => {
  if (!conversation.lastReply) return ''
  return conversation.lastReply.promptType === 'reply'
    ? '📝 AI 生成回复'
    : '🔍 AI 分析结果'
})

const previewText = computed(() => {
  if (!conversation.lastReply) return ''
  const content = conversation.lastReply.content
  return content.length > 80 ? content.slice(0, 80) + '...' : content
})

const injectAvailable = computed(() => injectDraft !== undefined)

function handleFillInput() {
  if (!conversation.lastReply) return
  if (!injectDraft) {
    ElMessage.warning('输入框不可用')
    return
  }
  injectDraft(conversation.lastReply.content)
  conversation.markLastReplyInjected()
  ElMessage.success('已填入输入框')
}

function handleDismiss() {
  conversation.setLastReply(null)
}

function handleExpand() {
  const id = conversation.lastReply?.messageId
  if (!id) return
  const el = document.querySelector(`[data-ai-message-id="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <Transition name="reply-card">
    <div v-if="showCard" class="recent-reply-card">
      <div class="card-icon">{{ cardTitle.split(' ')[0] }}</div>
      <div class="card-body">
        <div class="card-title">{{ cardTitle }}</div>
        <div class="card-preview" @click="handleExpand">
          {{ previewText }}
        </div>
      </div>
      <div class="card-actions">
        <el-button
          type="primary"
          size="small"
          :disabled="!injectAvailable"
          @click="handleFillInput"
        >
          填入输入框
        </el-button>
        <el-button text size="small" @click="handleDismiss">关闭</el-button>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.recent-reply-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 8px;

  .card-icon {
    font-size: 24px;
  }
  .card-body {
    flex: 1;
    min-width: 0;
  }
  .card-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .card-preview {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      color: var(--el-color-primary);
    }
  }
  .card-actions {
    display: flex;
    gap: 4px;
  }
}

.reply-card-enter-active,
.reply-card-leave-active {
  transition: all 0.2s ease;
}
.reply-card-enter-from,
.reply-card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
