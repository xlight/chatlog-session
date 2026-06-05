<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { ChatMessage } from '@/types/ai'
import { renderMarkdown, escapeHtml } from '@/utils/markdown'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  message: ChatMessage
  thinkingContent?: string
  thinkingVisible?: boolean
}>()

const emit = defineEmits<{
  'toggle-thinking': []
}>()

const appStore = useAppStore()

const isUser = computed(() => props.message.role === 'user')
const isSystem = computed(() => props.message.role === 'system')
const isAssistant = computed(() => props.message.role === 'assistant')
const content = computed(() => props.message.content || '')
const hasThinking = computed(() => !!props.thinkingContent)
const localThinkingVisible = ref(true)

const contentRef = ref<HTMLElement | null>(null)

const renderedContent = computed(() => {
  if (isAssistant.value && content.value) {
    return renderMarkdown(content.value)
  }
  if (content.value) {
    return escapeHtml(content.value)
  }
  return ''
})

// --- 代码块语法高亮 ---
async function highlightCodeBlocks(container: HTMLElement) {
  const blocks = container.querySelectorAll('pre > code[class^="language-"]')
  if (blocks.length === 0) return
  const hljs = await import('highlight.js')
  blocks.forEach((block) => {
    hljs.default.highlightElement(block as HTMLElement)
  })
}

// --- 代码块复制按钮 ---
function addCopyButtons(container: HTMLElement) {
  container.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.copy-btn')) return
    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.textContent = '复制'
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent || '')
      btn.textContent = '已复制'
      setTimeout(() => {
        btn.textContent = '复制'
      }, 2000)
    })
    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

// --- Mermaid 渲染 ---
let mermaidInstance: typeof import('mermaid') | null = null

async function renderMermaid(container: HTMLElement, isDark: boolean) {
  if (!mermaidInstance) {
    mermaidInstance = await import('mermaid')
  }
  mermaidInstance.default.initialize({
    theme: isDark ? 'dark' : 'default',
    startOnLoad: false,
    fontFamily: 'inherit',
  })
  const nodes = container.querySelectorAll<HTMLElement>('.mermaid-code')
  if (nodes.length === 0) return
  try {
    await mermaidInstance.default.run({ nodes: [...nodes] })
  } catch (err) {
    nodes.forEach((n) => n.classList.remove('mermaid-code'))
    console.warn('[Mermaid] 渲染失败，降级为代码块:', err)
  }
}

// --- 内容更新后处理（高亮 + 复制 + Mermaid） ---
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function schedulePostRender() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const container = contentRef.value
    if (!container) return
    await highlightCodeBlocks(container)
    addCopyButtons(container)
    if (container.querySelector('.mermaid-code')) {
      await renderMermaid(container, appStore.isDark)
    }
  }, 300)
}

watch(
  () => isAssistant.value ? content.value : null,
  (newContent, oldContent) => {
    if (!newContent || newContent === oldContent) return
    nextTick(() => schedulePostRender())
  }
)

// --- 暗色模式切换时重新渲染 Mermaid ---
watch(
  () => appStore.isDark,
  async () => {
    const container = contentRef.value
    if (!container || !container.querySelector('.mermaid-code')) return
    mermaidInstance = null
    await renderMermaid(container, appStore.isDark)
  }
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
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

      <!-- 消息内容 -->
      <div
        ref="contentRef"
        class="ai-message__content"
        :class="{ 'ai-message__content--markdown': isAssistant && content }"
      >
        <template v-if="content">
          <div v-if="isAssistant" v-html="renderedContent" />
          <template v-else>{{ content }}</template>
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

    &--markdown {
      white-space: normal;

      // --- 表格 ---
      :deep(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        overflow-x: auto;
        display: block;

        th, td {
          border: 1px solid var(--el-border-color);
          padding: 6px 12px;
          text-align: left;
        }

        th {
          background-color: var(--el-fill-color);
          font-weight: 600;
        }

        tr:nth-child(even) {
          background-color: var(--el-fill-color-lighter);
        }
      }

      // --- 代码块 ---
      :deep(pre) {
        background-color: var(--el-fill-color-darker);
        border-radius: 6px;
        padding: 12px 16px;
        margin: 8px 0;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.5;

        code {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          background: none;
          padding: 0;
          border-radius: 0;
        }

        .copy-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          padding: 2px 8px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          background-color: var(--el-fill-color);
          color: var(--el-text-color-regular);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;

          &:hover {
            background-color: var(--el-color-primary-light-5);
            color: var(--el-color-white);
          }
        }

        &:hover .copy-btn {
          opacity: 1;
        }
      }

      :deep(code) {
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        background-color: var(--el-fill-color-darker);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
      }

      // --- 引用块 ---
      :deep(blockquote) {
        margin: 8px 0;
        padding: 4px 16px;
        border-left: 4px solid var(--el-color-primary-light-5);
        background-color: var(--el-fill-color-lighter);
        color: var(--el-text-color-regular);

        p {
          margin: 4px 0;
        }
      }

      // --- 列表 ---
      :deep(ul), :deep(ol) {
        padding-left: 24px;
        margin: 4px 0;

        li {
          margin: 2px 0;
        }
      }

      // --- 标题 ---
      :deep(h1) { font-size: 1.5em; margin: 12px 0 8px; font-weight: 700; }
      :deep(h2) { font-size: 1.3em; margin: 10px 0 6px; font-weight: 700; }
      :deep(h3) { font-size: 1.15em; margin: 8px 0 4px; font-weight: 600; }
      :deep(h4) { font-size: 1em; margin: 6px 0 4px; font-weight: 600; }
      :deep(h5) { font-size: 0.95em; margin: 4px 0 2px; font-weight: 600; }
      :deep(h6) { font-size: 0.9em; margin: 4px 0 2px; font-weight: 600; }

      // --- 图片 ---
      :deep(img) {
        max-width: 100%;
        border-radius: 6px;
        margin: 4px 0;
      }

      // --- 任务列表 ---
      :deep(input[type="checkbox"]) {
        margin-right: 6px;
        accent-color: var(--el-color-primary);
      }

      // --- 水平线 ---
      :deep(hr) {
        border: none;
        border-top: 1px solid var(--el-border-color);
        margin: 12px 0;
      }

      // --- 链接 ---
      :deep(a) {
        color: var(--el-color-primary);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      // --- 段落 ---
      :deep(p) {
        margin: 4px 0;
      }

      // --- Mermaid 图表 ---
      :deep(.mermaid-code) {
        background-color: var(--el-fill-color-darker);
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        text-align: center;
      }

      :deep(svg) {
        max-width: 100%;
      }
    }
  }

  &__placeholder {
    color: var(--el-text-color-placeholder);
  }
}
</style>
