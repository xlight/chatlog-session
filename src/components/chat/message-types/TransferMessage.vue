<script setup lang="ts">
import { computed } from 'vue'
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  content: string
  showMediaResources: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

// 从 content 中提取转账金额
// 格式示例: "[转账|发送 ￥0.01]" 或 "[转账|接收 ￥0.01]" 或 "[转账|收到 ￥0.01]"
const transferInfo = computed(() => {
  const match = props.content.match(/\[转账\|(.+?)\s*￥([\d.]+)\]/)
  if (match) {
    const action = match[1].trim() // "发送" 或 "接收" 或 "收到"
    return {
      action: '转账-'+normalizeAction(action),
      amount: match[2]  // "0.01"
    }
  }
  return {
    action: '转账',
    amount: '0.00'
  }
})

// 标准化转账动作描述
const normalizeAction = (action: string): string => {
  // 统一"接收"和"收到"为"收到"
  if (action === '接收' || action === '收到') {
    return '接收'
  }
  // "发送"保持不变
  if (action === '发送') {
    return '发送'
  }
  // 其他情况返回原值
  return action
}

// 格式化金额显示
const formattedAmount = computed(() => {
  const amount = parseFloat(transferInfo.value.amount)
  return amount.toFixed(2)
})

// 判断是否为收到转账
const isReceived = computed(() => {
  return transferInfo.value.action === '收到'
})

// 动态图标背景色
const iconGradient = computed(() => {
  return isReceived.value
    ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)' // 绿色 - 收到
    : 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)' // 橙色 - 发送
})

// 动态金额颜色
const amountColor = computed(() => {
  return isReceived.value ? '#4caf50' : '#fb8c00'
})
</script>

<template>
  <div class="message-transfer" :class="{ 'transfer-received': isReceived }" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="transfer-icon" :style="{ background: iconGradient }">
        <el-icon :size="24"><Wallet /></el-icon>
      </div>
      <div class="transfer-content">
        <div class="transfer-title">{{ transferInfo.action }}</div>
        <div class="transfer-amount" :style="{ color: amountColor }">¥{{ formattedAmount }}</div>
      </div>
      <el-icon class="transfer-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 2000) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-transfer {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;
  max-width: 280px;

  .transfer-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: white;
    flex-shrink: 0;
    transition: background 0.3s ease;
  }

  .transfer-content {
    flex: 1;
    min-width: 0;

    .transfer-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .transfer-amount {
      font-size: 16px;
      font-weight: 600;
      font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
      transition: color 0.3s ease;
    }
  }

  .transfer-arrow {
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

  &:hover {
    opacity: 0.8;
  }
}

html.dark {
  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }

  .message-transfer {
    .transfer-content {
      .transfer-amount {
        filter: brightness(1.2);
      }
    }

    &.transfer-received {
      .transfer-icon {
        background: linear-gradient(135deg, #66bb6a 0%, #81c784 100%);
      }
    }
  }
}
</style>
