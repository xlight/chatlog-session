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
  container.querySelectorAll<HTMLElement>('pre:not(.mermaid-code)').forEach((pre) => {
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

  // 保存原始代码 + 从 data-mermaid-code 恢复（暗色模式切换时节点内容已是 SVG）
  const originals = new Map<HTMLElement, string>()
  nodes.forEach((n) => {
    const stored = n.getAttribute('data-mermaid-code')
    if (stored) {
      n.textContent = stored
      originals.set(n, stored)
    } else {
      originals.set(n, n.textContent || '')
      n.setAttribute('data-mermaid-code', n.textContent || '')
    }
  })

  try {
    await mermaidInstance.default.run({ nodes: [...nodes] })
    // 成功：为每个节点添加代码预览切换
    nodes.forEach((n) => addCodePreviewToggle(n, originals.get(n) || ''))
  } catch (err) {
    // 失败：恢复原始代码，降级为普通代码块
    nodes.forEach((n) => {
      n.textContent = originals.get(n) || ''
      n.classList.remove('mermaid-code')
    })
    // 给降级后的代码块补上复制按钮
    addCopyButtons(container)
    console.warn('[Mermaid] 渲染失败，降级为代码块:', err)
  }
}

/**
 * 在成功渲染的 Mermaid 节点上添加复制按钮 + 代码预览切换
 */
function addCodePreviewToggle(container: HTMLElement, originalCode: string) {
  if (container.querySelector('.mermaid-toggle')) return

  // 创建工具栏容器（放在画布外面）
  const toolbar = document.createElement('div')
  toolbar.className = 'mermaid-toolbar'

  // 复制按钮
  const copyBtn = document.createElement('button')
  copyBtn.className = 'mermaid-toolbar-btn'
  copyBtn.textContent = '复制'
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(originalCode)
    copyBtn.textContent = '已复制'
    setTimeout(() => { copyBtn.textContent = '复制' }, 2000)
  })

  // 切换按钮
  const toggleBtn = document.createElement('button')
  toggleBtn.className = 'mermaid-toolbar-btn mermaid-toggle'
  toggleBtn.textContent = '查看代码'

  toolbar.appendChild(copyBtn)
  toolbar.appendChild(toggleBtn)

  // 源代码预览（初始隐藏）
  const codePreview = document.createElement('pre')
  codePreview.className = 'mermaid-code-preview'
  codePreview.textContent = originalCode
  codePreview.style.display = 'none'

  toggleBtn.addEventListener('click', () => {
    const svg = container.querySelector('svg')
    if (!svg) return
    const isShowingCode = codePreview.style.display === 'block'
    svg.style.display = isShowingCode ? '' : 'none'
    codePreview.style.display = isShowingCode ? 'none' : 'block'
    toggleBtn.textContent = isShowingCode ? '查看代码' : '查看图表'
  })

  // 顺序：画布 → 代码预览 → 工具栏（始终在最下面）
  container.parentNode?.insertBefore(codePreview, container.nextSibling)
  container.parentNode?.insertBefore(toolbar, codePreview.nextSibling)
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
        :class="{ 'ai-message__content--markdown markdown-body': isAssistant && content }"
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

      // --- 代码块样式覆盖（配合 github-markdown-css）---
      :deep(pre) {
        position: relative;
        background-color: var(--bgColor-muted, var(--el-fill-color-darker));
        border-radius: 6px;
        padding: 12px 16px;
        margin: 8px 0;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.5;

        code {
          font-family: var(--fontStack-monospace, 'Menlo', 'Monaco', 'Courier New', monospace);
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
          background-color: var(--bgColor-neutral-muted, var(--el-fill-color));
          color: var(--fgColor-muted, var(--el-text-color-regular));
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
        font-family: var(--fontStack-monospace, 'Menlo', 'Monaco', 'Courier New', monospace);
        background-color: var(--bgColor-muted, var(--el-fill-color-darker));
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
      }

      // --- Mermaid 图表 ---
      :deep(.mermaid-code) {
        background-color: var(--bgColor-muted, var(--el-fill-color-darker));
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        text-align: center;
      }

      :deep(svg) {
        max-width: 100%;
      }

      // --- Mermaid 工具栏（画布外面）---
      :deep(.mermaid-toolbar) {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }

      :deep(.mermaid-toolbar-btn) {
        padding: 2px 8px;
        font-size: 12px;
        border: 1px solid var(--borderColor-default, var(--el-border-color));
        border-radius: 4px;
        background-color: var(--bgColor-muted, var(--el-fill-color));
        color: var(--fgColor-muted, var(--el-text-color-secondary));
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background-color: var(--el-color-primary-light-5);
          border-color: var(--el-color-primary-light-3);
          color: var(--el-color-primary);
        }
      }

      // --- Mermaid 失败降级后的代码块 ---
      :deep(.mermaid-code.mermaid-fallback) {
        text-align: left;
        font-family: var(--fontStack-monospace, 'Menlo', 'Monaco', 'Courier New', monospace);
        font-size: 13px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      // --- Mermaid 代码预览（渲染成功后的源代码展示区）---
      :deep(.mermaid-code-preview) {
        text-align: left;
        font-family: var(--fontStack-monospace, 'Menlo', 'Monaco', 'Courier New', monospace);
        font-size: 13px;
        line-height: 1.5;
        background-color: var(--bgColor-muted, var(--el-fill-color-darker));
        border-radius: 6px;
        padding: 12px 16px;
        margin: 8px 0;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }
  }

  &__placeholder {
    color: var(--el-text-color-placeholder);
  }
}
</style>
