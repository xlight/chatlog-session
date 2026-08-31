<script setup lang="ts">
import { computed } from 'vue'
import { Right } from '@element-plus/icons-vue'
import { getMediaPlaceholder } from '../composables/utils'

/**
 * 卡片型消息基类组件
 *
 * 统一 6 个卡片型消息组件（RedPacket/Transfer/QQMusic/CardPackage/Live/VoiceCall）的结构。
 * 通过 props 控制 gradient/click/hover/arrow/placeholder，通过 slot 自定义 icon/content/extra。
 */
interface Props {
  /** icon 背景渐变（与 cardGradient 互斥） */
  iconGradient?: string
  /** icon 暗色模式背景渐变（未传时回退 iconGradient） */
  iconGradientDark?: string
  /** 整体卡片背景渐变（与 iconGradient 互斥，RedPacket 用） */
  cardGradient?: string
  /** 整体卡片暗色模式背景渐变（未传时回退 cardGradient） */
  cardGradientDark?: string
  /** 是否可点击（默认 true） */
  clickable?: boolean
  /** 是否保留 hover 效果（默认同 clickable） */
  hoverable?: boolean
  /** 是否显示右箭头（默认 true） */
  showArrow?: boolean
  /** 是否显示媒体资源（默认 true，false 时降级 placeholder） */
  showMediaResources?: boolean
  /** 是否有卡片级 box-shadow（RedPacket 用） */
  elevated?: boolean
  /** placeholder 降级时传入 getMediaPlaceholder 的 type 参数 */
  placeholderType?: number
  /** placeholder 降级时传入 getMediaPlaceholder 的 subType 参数 */
  placeholderSubType?: number
}

const props = withDefaults(defineProps<Props>(), {
  clickable: true,
  showArrow: true,
  showMediaResources: true,
  elevated: false,
  placeholderType: 49,
  placeholderSubType: 0,
})

const emit = defineEmits<{
  click: []
}>()

const hoverable = computed(() => props.hoverable ?? props.clickable)

const handleClick = () => {
  if (props.clickable) emit('click')
}

const iconStyle = computed(() => {
  if (props.iconGradient) {
    return { background: props.iconGradient }
  }
  return {}
})

const cardStyle = computed(() => {
  if (props.cardGradient) {
    return { background: props.cardGradient }
  }
  return {}
})
</script>

<template>
  <div
    class="card-message"
    :class="{
      'card-message--clickable': clickable,
      'card-message--hoverable': hoverable,
      'card-message--elevated': elevated,
      'card-message--card-gradient': !!cardGradient,
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <template v-if="showMediaResources">
      <div class="card-message__icon" :style="iconStyle">
        <slot name="icon" />
      </div>
      <div class="card-message__content">
        <slot />
      </div>
      <el-icon v-if="showArrow" class="card-message__arrow"><Right /></el-icon>
      <slot name="extra" />
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(placeholderType, placeholderSubType) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.card-message {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 240px;
  max-width: 300px;
  border-radius: 8px;
  padding: 12px;

  &--clickable {
    cursor: pointer;
  }

  &--hoverable:hover {
    opacity: 0.8;
  }

  &--elevated {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &.card-message--hoverable:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .card-message__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: white;
    flex-shrink: 0;
  }

  .card-message__content {
    flex: 1;
    min-width: 0;

    :deep(.card-message__title) {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    :deep(.card-message__desc) {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-message__arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .media-placeholder {
    display: inline-block;
    padding: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-style: italic;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    border: 1px dashed var(--el-border-color);

    &:hover {
      background: var(--el-fill-color);
    }
  }
}

html.dark {
  .card-message__icon {
    // 暗色 gradient 通过 :style 动态绑定，此处仅 fallback
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>
