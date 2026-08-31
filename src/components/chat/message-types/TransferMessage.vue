<script setup lang="ts">
import { computed } from 'vue'
import { Wallet } from '@element-plus/icons-vue'
import CardMessageBase from './CardMessageBase.vue'

interface Props {
  content: string
  showMediaResources: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

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
  <CardMessageBase
    :icon-gradient="iconGradient"
    :show-media-resources="showMediaResources"
    :placeholder-type="49"
    :placeholder-sub-type="2000"
    @click="emit('click')"
  >
    <template #icon>
      <el-icon :size="24"><Wallet /></el-icon>
    </template>
    <div class="card-message__title">{{ transferInfo.action }}</div>
    <div class="transfer-amount" :style="{ color: amountColor }">¥{{ formattedAmount }}</div>
  </CardMessageBase>
</template>

<style lang="scss" scoped>
.transfer-amount {
  font-size: 16px;
  font-weight: 600;
  font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
  transition: color 0.3s ease;
}

html.dark {
  .transfer-amount {
    filter: brightness(1.2);
  }
}
</style>
