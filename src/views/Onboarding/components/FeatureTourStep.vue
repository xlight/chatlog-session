<template>
  <div class="feature-tour-step">
    <div class="feature-tour-step__content">
      <!-- 标题 -->
      <h2 class="feature-tour-step__title">快速了解功能</h2>
      <p class="feature-tour-step__description">
        让我们快速了解一下 ChatLog Session 的主要功能
      </p>

      <!-- 功能卡片 -->
      <div class="feature-tour-step__cards">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-tour-step__card"
          :class="{ 'feature-tour-step__card--active': currentFeature === index }"
        >
          <div class="feature-tour-step__card-icon">{{ feature.icon }}</div>
          <div class="feature-tour-step__card-content">
            <h3 class="feature-tour-step__card-title">{{ feature.title }}</h3>
            <p class="feature-tour-step__card-description">{{ feature.description }}</p>
            <ul class="feature-tour-step__card-list">
              <li v-for="(tip, i) in feature.tips" :key="i">{{ tip }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 导航指示器 -->
      <div class="feature-tour-step__indicators">
        <span
          v-for="(_feature, index) in features"
          :key="index"
          class="feature-tour-step__indicator"
          :class="{ 'feature-tour-step__indicator--active': currentFeature === index }"
          @click="currentFeature = index"
        ></span>
      </div>

      <!-- 按钮组 -->
      <div class="feature-tour-step__actions">
        <el-button size="large" @click="handlePrev">
          <el-icon><ArrowLeft /></el-icon>
          上一步
        </el-button>
        <el-button
          v-if="currentFeature < features.length - 1"
          ref="nextFeatureButtonRef"
          type="primary"
          size="large"
          @click="handleNextFeature"
        >
          下一个功能
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button
          v-else
          ref="completeButtonRef"
          type="primary"
          size="large"
          @click="handleNext"
        >
          完成介绍
          <el-icon><Check /></el-icon>
        </el-button>
      </div>

      <!-- 跳过链接 -->
      <div class="feature-tour-step__skip">
        <el-link type="info" @click="handleSkip">跳过功能介绍</el-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { ArrowLeft, ArrowRight, Check } from '@element-plus/icons-vue'

interface Feature {
  icon: string
  title: string
  description: string
  tips: string[]
}

const emit = defineEmits<{
  prev: []
  next: []
  skip: []
}>()

const currentFeature = ref(0)
const nextFeatureButtonRef = ref<InstanceType<typeof import('element-plus')['ElButton']>>()
const completeButtonRef = ref<InstanceType<typeof import('element-plus')['ElButton']>>()

const features: Feature[] = [
  {
    icon: '📱',
    title: '会话管理',
    description: '灵活管理所有聊天会话，快速找到重要对话',
    tips: [
      '本地置顶重要会话，不受服务端限制',
      '支持筛选和分组（全部/聊天/置顶）',
      '置顶会话支持折叠收起',
    ],
  },
  {
    icon: '💬',
    title: '消息查看',
    description: '完整展示各种类型的消息内容',
    tips: [
      '支持文字、图片、视频、位置等多种类型',
      'Live Photo 和视频直接预览播放',
      '日期快速导航，轻松浏览历史消息',
    ],
  },
  {
    icon: '🔍',
    title: '搜索功能',
    description: '快速找到联系人或消息内容',
    tips: [
      '支持联系人名称搜索',
      '支持消息内容全文搜索',
      '快速定位需要的信息',
    ],
  },
  {
    icon: '📊',
    title: '数据分析',
    description: 'Dashboard 可视化展示您的聊天数据',
    tips: [
      '消息量统计与趋势分析',
      '联系人互动频率排行',
      '了解您的聊天习惯',
    ],
  },
]

const handleNextFeature = () => {
  if (currentFeature.value < features.length - 1) {
    currentFeature.value++
  }
}

const handlePrev = () => {
  emit('prev')
}

const handleNext = () => {
  emit('next')
}

const handleSkip = () => {
  emit('skip')
}

// 聚焦主按钮
const focusPrimaryButton = async () => {
  await nextTick()
  if (currentFeature.value < features.length - 1) {
    nextFeatureButtonRef.value?.$el?.focus()
  } else {
    completeButtonRef.value?.$el?.focus()
  }
}

// 监听当前功能变化，自动聚焦按钮
watch(currentFeature, () => {
  focusPrimaryButton()
})

// 页面加载时自动聚焦主按钮
onMounted(() => {
  focusPrimaryButton()
})
</script>

<style scoped lang="scss">
.feature-tour-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 20px;

  &__content {
    max-width: 700px;
    width: 100%;
  }

  &__title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
    text-align: center;
  }

  &__description {
    font-size: 16px;
    color: #606266;
    line-height: 1.6;
    text-align: center;
    margin: 0 0 40px 0;
  }

  &__cards {
    position: relative;
    min-height: 320px;
    margin-bottom: 24px;
  }

  &__card {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: #f5f7fa;
    border-radius: 16px;
    padding: 32px;
    opacity: 0;
    transform: translateX(50px);
    transition: all 0.4s ease;
    pointer-events: none;

    &--active {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }

  &__card-icon {
    font-size: 64px;
    text-align: center;
    margin-bottom: 20px;
  }

  &__card-content {
    text-align: center;
  }

  &__card-title {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px 0;
  }

  &__card-description {
    font-size: 16px;
    color: #606266;
    line-height: 1.6;
    margin: 0 0 24px 0;
  }

  &__card-list {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    display: inline-block;

    li {
      position: relative;
      padding-left: 24px;
      margin-bottom: 12px;
      font-size: 15px;
      color: #606266;
      line-height: 1.6;

      &::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--el-color-success, #67c23a);
        font-weight: bold;
      }
    }
  }

  &__indicators {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 32px;
  }

  &__indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dcdfe6;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #c0c4cc;
    }

    &--active {
      width: 32px;
      border-radius: 6px;
      background: var(--el-color-primary, #409eff);
    }
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 16px;

    .el-button {
      min-width: 140px;
      min-height: 44px;
    }
  }

  &__skip {
    text-align: center;
  }
}

@media (max-width: 768px) {
  .feature-tour-step {
    padding: 20px;
    min-height: 400px;

    &__title {
      font-size: 22px;
    }

    &__description {
      font-size: 14px;
      margin-bottom: 32px;
    }

    &__card {
      padding: 24px;
    }

    &__card-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    &__card-title {
      font-size: 20px;
    }

    &__card-description {
      font-size: 14px;
      margin-bottom: 20px;
    }

    &__card-list {
      li {
        font-size: 14px;
        margin-bottom: 10px;
      }
    }

    &__actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>