<script setup lang="ts">
interface Props {
  title: string
  url: string
  showMediaResources: boolean
  desc?: string
  thumbUrl?: string
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="message-shopping-miniprogram" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="shopping-card">
        <div class="shopping-header">
          <el-icon class="shopping-icon"><ShoppingCart /></el-icon>
          <span class="shopping-label">购物小程序</span>
        </div>
        
        <div class="shopping-content">
          <div v-if="thumbUrl" class="product-image">
            <img :src="thumbUrl" alt="商品图片" />
          </div>
          
          <div class="product-info">
            <div class="product-title">{{ title }}</div>
            <div v-if="desc" class="product-desc">{{ desc }}</div>
          </div>
        </div>
        
        <div class="shopping-footer">
          <span class="shopping-hint">查看商品</span>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>
      </div>
    </template>
    <span v-else class="media-placeholder">[购物小程序] {{ title }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-shopping-miniprogram {
  cursor: pointer;
  user-select: none;

  .shopping-card {
    min-width: 280px;
    max-width: 320px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    transition: all 0.3s ease;

    &:hover {
      border-color: #ff6b35;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
      transform: translateY(-2px);
    }
  }

  .shopping-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    background: linear-gradient(90deg, #ff6b35 0%, #ff8c42 100%);
    color: #fff;

    .shopping-icon {
      font-size: 16px;
    }

    .shopping-label {
      font-size: 12px;
      font-weight: 500;
    }
  }

  .shopping-content {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #fff;

    .product-image {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      background: var(--el-fill-color-light);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .product-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .product-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        line-height: 1.4;
        margin-bottom: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .product-desc {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }
  }

  .shopping-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: linear-gradient(90deg, #fff5f2 0%, #fff 100%);
    border-top: 1px solid var(--el-border-color-lighter);

    .shopping-hint {
      font-size: 13px;
      color: #ff6b35;
      font-weight: 500;
    }

    .arrow-icon {
      font-size: 14px;
      color: #ff6b35;
    }
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

.dark-mode {
  .message-shopping-miniprogram {
    .shopping-card {
      background: #2b2b2b;
      border-color: var(--el-border-color-darker);
    }

    .shopping-content {
      background: #2b2b2b;

      .product-image {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .shopping-footer {
      background: linear-gradient(90deg, rgba(255, 107, 53, 0.1) 0%, #2b2b2b 100%);
      border-top-color: var(--el-border-color-darker);
    }

    .media-placeholder {
      background: var(--el-fill-color-dark);
      border-color: var(--el-border-color-darker);
    }
  }
}
</style>