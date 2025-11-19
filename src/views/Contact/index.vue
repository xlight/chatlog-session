<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useContactStore } from '@/stores/contact'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import Avatar from '@/components/common/Avatar.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'
import LoadingProgress from '@/components/common/LoadingProgress.vue'
import type { Contact } from '@/types'
import { ContactType } from '@/types/contact'

const contactStore = useContactStore()
const router = useRouter()

// 状态
const loading = ref(false)
const refreshing = ref(false)
const error = ref<Error | null>(null)
const searchText = ref('')
const filterType = ref<'all' | 'friends' | 'groups' | 'starred'>('all')
const sortBy = ref<'name' | 'pinyin'>('pinyin')

const showBackTop = ref(false)
const scrollerRef = ref()
const pullDistance = ref(0)
const isPulling = ref(false)

// 计算属性
const filteredContacts = computed(() => {
  // 确保 contacts 是数组
  const allContacts = Array.isArray(contactStore.contacts)
    ? contactStore.contacts
    : []

  let contacts = allContacts

  // 按类型筛选
  switch (filterType.value) {
    case 'friends':
      contacts = allContacts.filter(c => c.type === ContactType.Friend)
      break
    case 'groups':
      contacts = allContacts.filter(c => c.type === ContactType.Chatroom)
      break
    case 'starred':
      contacts = allContacts.filter(c => c.isStarred === true)
      break
  }

  // 搜索过滤
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    contacts = contacts.filter(contact =>
      contact.nickname.toLowerCase().includes(keyword) ||
      contact.alias?.toLowerCase().includes(keyword) ||
      contact.remark?.toLowerCase().includes(keyword) ||
      contact.wxid?.toLowerCase().includes(keyword)
    )
  }

  return contacts
})

// 扁平化列表用于虚拟滚动
const flattenedContacts = computed(() => {
  const result: Array<{ type: 'header' | 'item', key: string, data?: Contact, header?: string }> = []

  if (sortBy.value === 'name') {
    // 不分组，直接返回联系人列表
    filteredContacts.value.forEach(contact => {
      result.push({
        type: 'item',
        key: contact.wxid,
        data: contact
      })
    })
  } else {
    // 按首字母分组
    const grouped: Record<string, Contact[]> = {}
    filteredContacts.value.forEach(contact => {
      const initial = contact.nickname.charAt(0).toUpperCase()
      if (!grouped[initial]) {
        grouped[initial] = []
      }
      grouped[initial].push(contact)
    })

    // 按字母排序
    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })

    // 构建扁平化列表
    sortedLetters.forEach(letter => {
      // 添加分组头
      result.push({
        type: 'header',
        key: `header-${letter}`,
        header: letter
      })
      // 添加该组的联系人
      grouped[letter].forEach(contact => {
        result.push({
          type: 'item',
          key: contact.wxid,
          data: contact
        })
      })
    })
  }

  return result
})

// 获取字母索引列表
const letterIndexList = computed(() => {
  if (sortBy.value !== 'pinyin') return []

  const letters = new Set<string>()
  flattenedContacts.value.forEach(item => {
    if (item.type === 'header' && item.header) {
      letters.add(item.header)
    }
  })

  return Array.from(letters).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
})

// 统计信息
const stats = computed(() => {
  const allContacts = Array.isArray(contactStore.contacts)
    ? contactStore.contacts
    : []

  return {
    total: allContacts.length,
    friends: allContacts.filter(c => c.type === ContactType.Friend).length,
    groups: allContacts.filter(c => c.type === ContactType.Chatroom).length,
    starred: allContacts.filter(c => c.isStarred === true).length
  }
})

// 处理滚动到底部
const handleScroll = (event: any) => {
  const { scrollTop } = event.target

  // 显示回到顶部按钮
  showBackTop.value = scrollTop > 300
}

// 回到顶部
const scrollToTop = () => {
  if (scrollerRef.value && scrollerRef.value.$el) {
    const scrollElement = scrollerRef.value.$el.querySelector('.vue-recycle-scroller__item-wrapper')
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

// 跳转到指定字母
const jumpToLetter = (letter: string) => {
  const element = document.querySelector(`[data-letter="${letter}"]`)
  if (element && scrollerRef.value && scrollerRef.value.$el) {
    const scrollElement = scrollerRef.value.$el.querySelector('.vue-recycle-scroller__item-wrapper')
    const scrollerRect = scrollElement?.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    if (scrollElement && scrollerRect) {
      const offset = elementRect.top - scrollerRect.top + scrollElement.scrollTop
      scrollElement.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }
}

// 下拉刷新相关
const handleTouchStart = (_event: TouchEvent) => {
  if (scrollerRef.value && scrollerRef.value.$el) {
    const scrollElement = scrollerRef.value.$el.querySelector('.vue-recycle-scroller__item-wrapper')
    if (scrollElement && scrollElement.scrollTop === 0) {
      isPulling.value = true
      pullDistance.value = 0
    }
  }
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isPulling.value) return

  const startY = event.touches[0].clientY

  if (startY > 0) {
    pullDistance.value = Math.min(startY / 2, 100)
    if (pullDistance.value > 0) {
      event.preventDefault()
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return

  isPulling.value = false

  if (pullDistance.value > 50) {
    // 触发刷新
    refreshing.value = true
    pullDistance.value = 0

    try {
      // 重新加载
      await loadContacts()

      ElMessage.success('刷新成功')
    } catch (err) {
      ElMessage.error('刷新失败')
    } finally {
      refreshing.value = false
    }
  } else {
    pullDistance.value = 0
  }
}

// 加载联系人
// 手动触发后台刷新
const startBackgroundRefresh = async () => {
  if (contactStore.isBackgroundLoading) {
    ElMessage.warning('正在后台刷新中，请稍候...')
    return
  }

  try {
    await contactStore.loadContactsInBackground({
      batchSize: 500,
      batchDelay: 100,
      useCache: true
    })
    ElMessage.success('后台刷新完成')
  } catch (err) {
    console.error('后台刷新失败:', err)
    ElMessage.error('后台刷新失败')
  }
}

const loadContacts = async () => {
  loading.value = true
  error.value = null

  try {
    // 只从数据库加载联系人
    const { db } = await import('@/utils/db')
    const cached = await db.getAllContacts()

    if (cached.length > 0) {
      contactStore.contacts = cached
      contactStore.totalContacts = cached.length
      console.log(`📦 从数据库加载 ${cached.length} 个联系人`)
    } else {
      console.warn('⚠️ 数据库中没有联系人数据，请点击"后台刷新"加载')
    }
  } catch (e: any) {
    error.value = e
    console.error('从数据库加载联系人失败:', e)
    ElMessage.error('加载联系人失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = (value: string) => {
  searchText.value = value
}

// 查看联系人详情
const viewContact = (contact: Contact) => {
  console.log('查看联系人:', contact)
  // TODO: 打开联系人详情弹窗或跳转详情页
}

// 发起聊天
const startChat = (contact: Contact) => {
  // 跳转到聊天页面并选择该联系人的会话
  router.push({
    path: '/chat',
    query: { talker: contact.wxid }
  })
}

// 刷新
const handleRefresh = () => {
  loadContacts()
}

// 初始化
onMounted(() => {
  if (contactStore.contacts.length === 0) {
    loadContacts()
  }
})
</script>

<template>
  <div class="contact-page">
    <div class="contact-container">
      <!-- 左侧：联系人列表 -->
      <div class="contact-list-panel">
        <!-- 头部 -->
        <div class="contact-header">
          <div class="header-title">
            <h2>联系人</h2>
            <el-tag v-if="stats.total > 0" size="small" type="info">
              {{ stats.total }}
            </el-tag>
            <!-- 后台刷新按钮 -->
            <el-button
              type="primary"
              size="small"
              :loading="contactStore.isBackgroundLoading"
              @click="startBackgroundRefresh"
            >
              <el-icon v-if="!contactStore.isBackgroundLoading"><RefreshRight /></el-icon>
              {{ contactStore.isBackgroundLoading ? '刷新中...' : '后台刷新' }}
            </el-button>
          </div>

          <!-- 后台加载进度条 -->
          <LoadingProgress
            :progress="contactStore.loadProgress"
            :visible="contactStore.isBackgroundLoading"
            position="top"
            :show-details="true"
          />

          <!-- 搜索框 -->
          <SearchBar
            v-model="searchText"
            placeholder="搜索联系人"
            size="default"
            class="contact-search"
            @search="handleSearch"
          />

          <!-- 筛选和排序 -->
          <div class="contact-filters">
            <el-radio-group v-model="filterType" size="small">
              <el-radio-button label="all">
                全部 ({{ stats.total }})
              </el-radio-button>
              <el-radio-button label="friends">
                好友 ({{ stats.friends }})
              </el-radio-button>
              <el-radio-button label="groups">
                群聊 ({{ stats.groups }})
              </el-radio-button>
              <el-radio-button label="starred">
                星标 ({{ stats.starred }})
              </el-radio-button>
            </el-radio-group>

            <el-button-group size="small" class="sort-buttons">
              <el-button
                :type="sortBy === 'pinyin' ? 'primary' : 'default'"
                @click="sortBy = 'pinyin'"
              >
                <el-icon><Sort /></el-icon>
                字母
              </el-button>
              <el-button
                :type="sortBy === 'name' ? 'primary' : 'default'"
                @click="sortBy = 'name'"
              >
                <el-icon><List /></el-icon>
                列表
              </el-button>
            </el-button-group>
          </div>
        </div>

        <!-- 加载状态 -->
        <Loading v-if="loading" text="加载联系人中..." />

        <!-- 错误状态 -->
        <Error
          v-else-if="error"
          title="加载失败"
          :error="error"
          @retry="handleRefresh"
        />

        <!-- 空状态 -->
        <Empty
          v-else-if="filteredContacts.length === 0"
          icon="User"
          :description="searchText ? '未找到匹配的联系人' : '暂无联系人'"
        >
          <el-button v-if="!searchText" type="primary" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </Empty>

        <!-- 联系人列表 - 虚拟滚动 -->
        <div
          v-else
          class="contact-list-container"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- 下拉刷新提示 -->
          <div
            v-if="pullDistance > 0 || refreshing"
            class="pull-refresh-indicator"
            :style="{ height: `${pullDistance}px` }"
          >
            <div class="refresh-content">
              <el-icon v-if="refreshing" class="is-loading"><Loading /></el-icon>
              <el-icon v-else-if="pullDistance > 50"><Check /></el-icon>
              <el-icon v-else><ArrowDown /></el-icon>
              <span>{{ refreshing ? '刷新中...' : pullDistance > 50 ? '松开刷新' : '下拉刷新' }}</span>
            </div>
          </div>

          <RecycleScroller
            ref="scrollerRef"
            :items="flattenedContacts"
            :item-size="72"
            :min-item-size="36"
            key-field="key"
            class="contact-scroller"
            :buffer="200"
            :page-mode="false"
            @scroll="handleScroll"
          >
            <template #default="{ item }">
              <!-- 分组头 -->
              <div
                v-if="item.type === 'header'"
                :key="`header-${item.header}`"
                :data-letter="item.header"
                class="group-header"
              >
                {{ item.header }}
              </div>

              <!-- 联系人项 -->
              <div
                v-else
                class="contact-item"
                @click="viewContact(item.data!)"
              >
                <Avatar
                  :src="item.data!.avatar"
                  :name="item.data!.nickname"
                  :size="48"
                  class="contact-avatar"
                />

                <div class="contact-info">
                  <div class="contact-name">
                    <span class="name-text">{{ item.data!.remark || item.data!.nickname }}</span>
                    <el-icon v-if="item.data!.isStarred" color="#f59e0b" size="16">
                      <StarFilled />
                    </el-icon>
                  </div>
                  <div class="contact-desc">
                    <el-tag
                      v-if="item.data!.type"
                      size="small"
                      :type="item.data!.type === ContactType.Chatroom ? 'warning' : 'info'"
                      effect="plain"
                    >
                      {{ item.data!.type === ContactType.Chatroom ? '群聊' : '好友' }}
                    </el-tag>
                    <span v-if="item.data!.alias" class="alias">{{ item.data!.alias }}</span>
                  </div>
                </div>

                <div class="contact-actions">
                  <el-button
                    text
                    type="primary"
                    size="small"
                    @click.stop="startChat(item.data!)"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                    发消息
                  </el-button>
                </div>
              </div>
            </template>
          </RecycleScroller>

          <!-- 字母索引 -->
          <div v-if="letterIndexList.length > 0 && sortBy === 'pinyin'" class="letter-index">
            <div
              v-for="letter in letterIndexList"
              :key="letter"
              class="letter-item"
              @click="jumpToLetter(letter)"
            >
              {{ letter }}
            </div>
          </div>

          <!-- 回到顶部按钮 -->
          <transition name="fade">
            <el-button
              v-if="showBackTop"
              class="back-top-button"
              circle
              type="primary"
              size="large"
              @click="scrollToTop"
            >
              <el-icon><Top /></el-icon>
            </el-button>
          </transition>
        </div>
      </div>

      <!-- 右侧：联系人详情 -->
      <div class="contact-detail-panel">
        <el-empty
          description="选择一个联系人查看详情"
          :image-size="160"
        >
          <template #image>
            <el-icon size="160" color="#909399">
              <UserFilled />
            </el-icon>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.contact-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.contact-container {
  display: flex;
  width: 100%;
  height: 100%;
}

// 联系人列表面板
.contact-list-panel {
  width: 380px;
  height: 100%;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .contact-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;

    .header-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .el-tag {
        flex-shrink: 0;
      }

      .el-button {
        margin-left: auto;
      }
    }

    .contact-search {
      margin-bottom: 12px;
    }

    .contact-filters {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .el-radio-group {
        width: 100%;

        :deep(.el-radio-button) {
          flex: 1;

          .el-radio-button__inner {
            width: 100%;
            font-size: 12px;
            padding: 8px 4px;
          }
        }
      }

      .sort-buttons {
        width: 100%;

        .el-button {
          flex: 1;
        }
      }
    }
  }

  .contact-list-container {
    flex: 1;
    overflow: hidden;
    position: relative;

    .contact-scroller {
      height: 100%;
    }

    .group-header {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--el-text-color-secondary);
      background-color: var(--el-fill-color-light);
      height: 36px;
      display: flex;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:hover {
        background-color: var(--el-fill-color-light);

        .contact-actions {
          opacity: 1;
        }
      }

      .contact-avatar {
        flex-shrink: 0;
      }

      .contact-info {
        flex: 1;
        min-width: 0;

        .contact-name {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;

          .name-text {
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .contact-desc {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;

          .alias {
            color: var(--el-text-color-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .contact-actions {
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.2s;
      }
    }

    // 虚拟滚动样式覆盖
    :deep(.vue-recycle-scroller) {
      outline: none;
    }

    :deep(.vue-recycle-scroller__item-wrapper) {
      overflow: visible;
    }

    :deep(.vue-recycle-scroller__item-view) {
      overflow: visible;
    }

    :deep(.vue-recycle-scroller__slot) {
      display: none;
    }

    .loading-more,
    .no-more {
      padding: 16px;
      text-align: center;
      font-size: 14px;
      color: var(--el-text-color-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .loading-more {
      .is-loading {
        animation: rotating 2s linear infinite;
      }
    }

    // 下拉刷新提示
    .pull-refresh-indicator {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: var(--el-bg-color);
      z-index: 100;
      transition: height 0.2s;
      overflow: hidden;

      .refresh-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        font-size: 14px;
        color: var(--el-text-color-secondary);

        .is-loading {
          animation: rotating 2s linear infinite;
        }
      }
    }

    // 字母索引
    .letter-index {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 50;
      padding: 4px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 12px;

      .letter-item {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--el-color-primary);
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        border-radius: 50%;

        &:hover {
          background-color: var(--el-color-primary);
          color: white;
          transform: scale(1.2);
        }

        &:active {
          transform: scale(1.1);
        }
      }
    }

    // 回到顶部按钮
    .back-top-button {
      position: absolute;
      right: 20px;
      bottom: 80px;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

      &:hover {
        transform: scale(1.1);
      }

      &:active {
        transform: scale(1.05);
      }
    }

    @keyframes rotating {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  }
}

// 联系人详情面板
.contact-detail-panel {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-bg-color);
  min-width: 0;
}

// 响应式
// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

// 响应式设计
@media (max-width: 768px) {
  .contact-container {
    flex-direction: column;
  }

  .contact-list-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .contact-detail-panel {
    display: none;
  }

  .contact-list-container {
    .back-top-button {
      right: 16px;
      bottom: 60px;
    }
  }
}
</style>
