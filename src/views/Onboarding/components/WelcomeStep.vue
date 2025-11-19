<template>
  <div class="welcome-step">
    <div class="welcome-step__content">
      <!-- Logo 区域 -->
      <div class="welcome-step__logo">
        <div class="welcome-step__logo-icon">💬</div>
        <h1 class="welcome-step__title">欢迎使用 ChatLog Session</h1>
      </div>

      <!-- 描述 -->
      <p class="welcome-step__description">查看和浏览您的聊天记录归档</p>

      <!-- 功能列表 -->
      <div class="welcome-step__features">
        <div class="welcome-step__feature">
          <div class="welcome-step__feature-icon">📱</div>
          <div class="welcome-step__feature-text">
            <div class="welcome-step__feature-title">浏览所有会话记录</div>
            <div class="welcome-step__feature-desc">快速查看所有聊天会话</div>
          </div>
        </div>

        <div class="welcome-step__feature">
          <div class="welcome-step__feature-icon">💬</div>
          <div class="welcome-step__feature-text">
            <div class="welcome-step__feature-title">查看完整聊天历史</div>
            <div class="welcome-step__feature-desc">自动加载所有历史消息</div>
          </div>
        </div>

        <div class="welcome-step__feature">
          <div class="welcome-step__feature-icon">🔍</div>
          <div class="welcome-step__feature-text">
            <div class="welcome-step__feature-title">搜索联系人和消息</div>
            <div class="welcome-step__feature-desc">快速找到需要的内容</div>
          </div>
        </div>

        <div class="welcome-step__feature">
          <div class="welcome-step__feature-icon">📊</div>
          <div class="welcome-step__feature-text">
            <div class="welcome-step__feature-title">支持多种消息类型</div>
            <div class="welcome-step__feature-desc">文字、图片、视频等</div>
          </div>
        </div>
      </div>

      <!-- 按钮区域 -->
      <div class="welcome-step__actions">
        <el-button type="primary" size="large" @click="handleStart">
          开始配置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  next: []
}>()

const handleStart = () => {
  emit('next')
}
</script>

<style scoped lang="scss">
.welcome-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 20px;

  &__content {
    max-width: 600px;
    width: 100%;
    text-align: center;
  }

  &__logo {
    margin-bottom: 32px;
  }

  &__logo-icon {
    font-size: 80px;
    margin-bottom: 16px;
    animation: bounce 2s ease-in-out infinite;
  }

  &__title {
    font-size: 32px;
    font-weight: 600;
    color: #303133;
    margin: 0;
    line-height: 1.4;
  }

  &__description {
    font-size: 18px;
    color: #606266;
    margin: 0 0 48px 0;
    line-height: 1.6;
  }

  &__features {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 48px;
    text-align: left;
  }

  &__feature {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    background: #f5f7fa;
    border-radius: 12px;
    transition: all 0.3s ease;

    &:hover {
      background: #ecf5ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
    }
  }

  &__feature-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  &__feature-text {
    flex: 1;
  }

  &__feature-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
  }

  &__feature-desc {
    font-size: 14px;
    color: #909399;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 16px;

    .el-button {
      min-width: 160px;
      padding: 12px 32px;
      font-size: 16px;
    }
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (max-width: 768px) {
  .welcome-step {
    padding: 20px;
    min-height: 400px;

    &__logo-icon {
      font-size: 60px;
    }

    &__title {
      font-size: 24px;
    }

    &__description {
      font-size: 16px;
      margin-bottom: 32px;
    }

    &__features {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }

    &__feature {
      padding: 16px;
    }

    &__feature-icon {
      font-size: 28px;
    }

    &__feature-title {
      font-size: 14px;
    }

    &__feature-desc {
      font-size: 12px;
    }

    &__actions {
      .el-button {
        min-width: 140px;
        font-size: 14px;
      }
    }
  }
}
</style>