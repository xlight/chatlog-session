<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

// URL 正则表达式，匹配 http/https 链接
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

// 解析文本内容
const parseContent = (text: string): Array<{ type: 'text' | 'link'; value: string; key: number }> => {
  if (!text) return []

  const parts: Array<{ type: 'text' | 'link'; value: string; key: number }> = []
  const matches = [...text.matchAll(URL_REGEX)]
  let key = 0

  if (matches.length === 0) {
    return [{ type: 'text', value: text, key: key++ }]
  }

  let lastIndex = 0
  for (const match of matches) {
    const matchIndex = match.index!

    // 添加链接前的文本
    if (matchIndex > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, matchIndex), key: key++ })
    }

    // 添加链接
    parts.push({ type: 'link', value: match[0], key: key++ })
    lastIndex = matchIndex + match[0].length
  }

  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex), key: key++ })
  }

  return parts
}

// 解析后的内容
const parsedContent = computed(() => parseContent(props.content))

// 是否包含链接
const hasLinks = computed(() => {
  return parsedContent.value.some(part => part.type === 'link')
})

// 打开链接
const openLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="message-text">
    <template v-if="hasLinks">
      <template v-for="part in parsedContent" :key="part.key">
        <span v-if="part.type === 'text'">{{ part.value }}</span>
        <a
          v-else
          class="message-link"
          :href="part.value"
          :title="part.value"
          @click.prevent="openLink(part.value)"
        >{{ part.value }}</a>
      </template>
    </template>
    <template v-else>{{ content }}</template>
  </div>
</template>

<style lang="scss" scoped>
.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.message-link {
  color: var(--el-color-primary);
  text-decoration: none;
  word-break: break-all;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:visited {
    color: var(--el-color-primary-light-3);
  }
}
</style>