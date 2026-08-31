<script setup lang="ts">
/**
 * 红包消息组件
 * 用于显示微信红包消息（type=49, subType=2001）
 */
import { Present } from '@element-plus/icons-vue'
import CardMessageBase from './CardMessageBase.vue'

interface Props {
  content?: string
  showMediaResources?: boolean
}

withDefaults(defineProps<Props>(), {
  content: '',
  showMediaResources: true
})
</script>

<template>
  <CardMessageBase
    card-gradient="linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)"
    :clickable="false"
    :hoverable="true"
    :show-arrow="false"
    :show-media-resources="showMediaResources"
    :placeholder-type="49"
    :placeholder-sub-type="2001"
    elevated
  >
    <template #icon>
      <div class="red-packet-icon-wrapper">
        <el-icon :size="24"><Present /></el-icon>
      </div>
    </template>
    <div class="red-packet-title">微信红包</div>
    <div class="red-packet-desc">请在手机上查看红包</div>
  </CardMessageBase>
</template>

<style scoped lang="scss">
// RedPacket 特殊样式：icon 圆形半透明背景 + title 16px/600 + desc opacity
.red-packet-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.red-packet-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.red-packet-desc {
  font-size: 12px;
  color: #fff;
  opacity: 0.9;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 覆盖基类 icon 样式（RedPacket icon 不用 gradient）
:deep(.card-message__icon) {
  background: transparent !important;
  width: auto;
  height: auto;
}

// 覆盖基类 elevated shadow 为红色调
:deep(.card-message--elevated) {
  box-shadow: 0 2px 8px rgba(238, 90, 82, 0.3);

  &.card-message--hoverable:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(238, 90, 82, 0.4);
  }
}

// 暗色模式 cardGradient 覆盖
html.dark :deep(.card-message) {
  background: linear-gradient(135deg, #d84a3f 0%, #c43d34 100%);
}
</style>
