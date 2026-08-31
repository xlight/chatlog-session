<script setup lang="ts">
import { computed } from 'vue'
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  favoriteTitle: string
  favoriteDesc: string
  favoriteCount: number
  favoriteTypes: string[]
  showMediaResources: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

const formattedDesc = computed(() => props.favoriteDesc.replace(/\s+/g, ' ').trim())
</script>

<template>
  <div class="message-favorite" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="favorite-card">
        <div class="favorite-header">
          <el-icon class="favorite-icon"><Star /></el-icon>
          <span class="favorite-title">{{ favoriteTitle }}</span>
        </div>

        <div v-if="formattedDesc" class="favorite-desc">
          {{ formattedDesc }}
        </div>

        <div v-if="favoriteTypes.length > 0" class="favorite-types">
          <el-tag
            v-for="type in favoriteTypes"
            :key="type"
            size="small"
            effect="plain"
            type="warning"
          >
            {{ type }}
          </el-tag>
        </div>

        <div class="favorite-footer">
          <div class="footer-info">
            <el-icon class="footer-icon"><CollectionTag /></el-icon>
            <span class="favorite-count">共 {{ favoriteCount }} 项内容</span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 24) }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use './_shared.scss' as *;

.message-favorite {
  cursor: pointer;
  max-width: 360px;

  .favorite-card {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s ease;

    &:hover {
      background: var(--el-fill-color);
      border-color: var(--el-border-color-light);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  .favorite-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .favorite-icon {
    font-size: 20px;
    color: var(--el-color-warning);
    flex-shrink: 0;
  }

  .favorite-title {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .favorite-desc {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.5;
    margin-bottom: 10px;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .favorite-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .favorite-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .footer-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .footer-icon,
  .arrow-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .favorite-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .arrow-icon {
    color: var(--el-text-color-placeholder);
    transition: transform 0.2s ease;
  }

  .media-placeholder {


    @include media-placeholder;


  }

  &:hover .arrow-icon {
    transform: translateX(2px);
    color: var(--el-color-warning);
  }
}
</style>
