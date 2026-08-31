<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useContactStore } from '@/stores/contact'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useVirtualizer } from '@tanstack/vue-virtual'
import Avatar from '@/components/common/Avatar.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'
import LoadingProgress from '@/components/common/LoadingProgress.vue'
import ContactDetail from './ContactDetail.vue'
import type { Contact, ContactFilterType } from '@/types'
import { ContactType } from '@/types/contact'
import { flattenGroups } from '@/utils/contact-grouping'

const appStore = useAppStore()
const contactStore = useContactStore()
const router = useRouter()

// 当前选中的联系人
const selectedContact = ref<Contact | null>(null)

// UI 状态
const showBackTop = ref(false)
const parentRef = ref<HTMLElement | null>(null)
const pullDistance = ref(0)
const isPulling = ref(false)

// 直接使用 store 的计算属性
const filteredContacts = computed(() => contactStore.filteredContacts)
const contactGroups = computed(() => contactStore.contactGroups)
const letterIndexList = computed(() => contactStore.letterIndexList)
const stats = computed(() => contactStore.contactStats)

// 扁平化列表用于虚拟滚动
const flattenedContacts = computed(() => {
  if (contactStore.sortBy === 'name') {
    return filteredContacts.value.map(contact => ({
      type: 'item' as const,
      key: contact.wxid,
      data: contact,
    }))
  }
  return flattenGroups(contactGroups.value)
})

// 虚拟滚动
const virtualizer = useVirtualizer(computed(() => ({
  count: flattenedContacts.value.length,
  getScrollElement: () => parentRef.value,
  estimateSize: (i: number) => {
    const item = flattenedContacts.value[i]
    return item?.type === 'header' ? 36 : 72
  },
  getItemKey: (i: number) => flattenedContacts.value[i]?.key ?? String(i),
  overscan: 5,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 获取虚拟行对应的扁平化项
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFlatItem(index: number): any {
  return flattenedContacts.value[index]
}

// 处理筛选类型变更
const handleFilterChange = (val: string | number | boolean | undefined) => {
  if (typeof val === 'string') {
    contactStore.setFilterType(val as ContactFilterType)
  }
}

// 处理滚动
const handleScroll = () => {
  showBackTop.value = (parentRef.value?.scrollTop ?? 0) > 300
}

// 回到顶部
const scrollToTop = () => {
  virtualizer.value.scrollToIndex(0, { behavior: 'smooth' })
}

// 跳转到指定字母
const jumpToLetter = (letter: string) => {
  const targetIndex = flattenedContacts.value.findIndex(item => {
    if (item.type === 'header') {
      if (letter === '⭐' && item.header === '星标朋友') return true
      return item.header === letter
    }
    return false
  })

  if (targetIndex >= 0) {
    virtualizer.value.scrollToIndex(targetIndex, { align: 'start' })
  }
}

// 下拉刷新相关
const handleTouchStart = () => {
  if (parentRef.value && parentRef.value.scrollTop === 0) {
    isPulling.value = true
    pullDistance.value = 0
  }
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isPulling.value) return
  const startY = event.touches[0].clientY
  if (startY > 0) {
    pullDistance.value = Math.min(startY / 2, 100)
    if (pullDistance.value > 0) event.preventDefault()
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  isPulling.value = false

  if (pullDistance.value > 50) {
    pullDistance.value = 0
    await handleRefresh()
  } else {
    pullDistance.value = 0
  }
}

// 后台刷新
const startBackgroundRefresh = async () => {
  if (contactStore.isBackgroundLoading) {
    ElMessage.warning('正在后台刷新中，请稍候...')
    return
  }

  try {
    await contactStore.loadContactsInBackground({
      batchSize: 500,
      batchDelay: 100,
    })
    ElMessage.success(`后台刷新完成，已加载 ${contactStore.contacts.length} 个联系人`)
  } catch (err) {
    console.error('后台刷新失败:', err)
    ElMessage.error('后台刷新失败')
  }
}

// 加载联系人
const loadContacts = async () => {
  try {
    await contactStore.loadContacts()

    // 如果数据库为空，自动触发后台加载
    if (contactStore.contacts.length === 0) {
      if (appStore.isDebug) console.log('数据库为空，自动触发后台加载')
      ElMessage.info('数据库已更新，正在重新加载联系人...')
      await startBackgroundRefresh()
    }
  } catch (e: unknown) {
    console.error('加载联系人失败:', e)
    ElMessage.error('加载联系人失败')
  }
}

// 搜索处理
const handleSearch = (value: string) => {
  contactStore.setSearchKeyword(value)
}

// 查看联系人详情
const viewContact = (contact: Contact) => {
  selectedContact.value = contact
  if (appStore.isMobile) {
    appStore.navigateToDetail('contactDetail', { contactId: contact.wxid })
  }
}

// 发起聊天
const startChat = (contact: Contact) => {
  router.push({ path: '/chat', query: { talker: contact.wxid } })
}

// 刷新
const handleRefresh = async () => {
  try {
    await contactStore.refreshContacts()
    ElMessage.success('刷新成功')
  } catch {
    ElMessage.error('刷新失败')
  }
}

// 初始化
onMounted(() => {
  if (!contactStore.hasContacts) {
    loadContacts()
  }
})
</script>

<template>
  <div class="contact-page" :class="{ 'mobile-page': appStore.isMobile }">
    <div class="contact-container">
      <!-- 左侧：联系人列表 -->
      <div
        class="contact-list-panel"
        :class="{ 'mobile-hidden': appStore.isMobile && appStore.showContactDetail }"
      >
        <!-- 头部 -->
        <div class="contact-header">
          <div class="header-title">
            <h2>联系人</h2>
            <el-tag v-if="stats.total > 0" size="small" type="info">
              {{ stats.total }}
            </el-tag>
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
            :model-value="contactStore.searchKeyword"
            placeholder="搜索联系人"
            size="default"
            class="contact-search"
            @search="handleSearch"
          />

          <!-- 筛选和排序 -->
          <div class="contact-filters">
            <el-radio-group
              :model-value="contactStore.filterType"
              size="small"
              @change="handleFilterChange"
            >
              <el-radio-button value="friend"> 好友 ({{ stats.friends }}) </el-radio-button>
              <el-radio-button value="chatroom"> 群聊 ({{ stats.chatrooms }}) </el-radio-button>
              <el-radio-button value="official"> 公众号 ({{ stats.official }}) </el-radio-button>
              <el-radio-button value="all"> 全部 ({{ stats.total }}) </el-radio-button>
            </el-radio-group>

            <el-button-group size="small" class="sort-buttons">
              <el-button
                :type="contactStore.sortBy === 'pinyin' ? 'primary' : 'default'"
                @click="contactStore.setSortBy('pinyin')"
              >
                <el-icon><Sort /></el-icon>
                字母
              </el-button>
              <el-button
                :type="contactStore.sortBy === 'name' ? 'primary' : 'default'"
                @click="contactStore.setSortBy('name')"
              >
                <el-icon><List /></el-icon>
                列表
              </el-button>
            </el-button-group>
          </div>
        </div>

        <!-- 加载中 -->
        <Loading v-if="contactStore.loading" text="加载联系人中..." />

        <!-- 错误状态 -->
        <Error
          v-else-if="contactStore.error"
          title="加载失败"
          :error="contactStore.error"
          @retry="handleRefresh"
        />

        <!-- 空状态 -->
        <Empty
          v-else-if="filteredContacts.length === 0"
          icon="User"
          :description="contactStore.searchKeyword ? '未找到匹配的联系人' : '暂无联系人'"
        >
          <el-button v-if="!contactStore.searchKeyword" type="primary" @click="handleRefresh">
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
            v-if="pullDistance > 0"
            class="pull-refresh-indicator"
            :style="{ height: `${pullDistance}px` }"
          >
            <div class="refresh-content">
              <el-icon v-if="pullDistance > 50"><Check /></el-icon>
              <el-icon v-else><ArrowDown /></el-icon>
              <span>{{ pullDistance > 50 ? '松开刷新' : '下拉刷新' }}</span>
            </div>
          </div>

          <div
            ref="parentRef"
            class="contact-scroller"
            @scroll="handleScroll"
          >
            <!-- 下拉刷新提示 -->
            <div
              v-if="pullDistance > 0"
              class="pull-refresh-indicator"
              :style="{ height: `${pullDistance}px` }"
            >
              <div class="refresh-content">
                <el-icon v-if="pullDistance > 50"><Check /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
                <span>{{ pullDistance > 50 ? '松开刷新' : '下拉刷新' }}</span>
              </div>
            </div>

            <div
              :style="{
                height: `${totalSize}px`,
                width: '100%',
                position: 'relative',
              }"
            >
              <div
                :style="{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
                }"
              >
                <div
                  v-for="virtualRow in virtualRows"
                  :key="String(virtualRow.key)"
                  :data-index="virtualRow.index"
                >
                  <!-- 分组头 -->
                  <div
                    v-if="getFlatItem(virtualRow.index)?.type === 'header'"
                    class="group-header"
                    :class="{ 'starred-header': getFlatItem(virtualRow.index)?.header === '星标朋友' }"
                    :data-letter="getFlatItem(virtualRow.index)?.header === '星标朋友' ? '⭐' : getFlatItem(virtualRow.index)?.header"
                  >
                    <div class="header-text">
                      <span v-if="getFlatItem(virtualRow.index)?.header === '星标朋友'" class="star-icon">⭐</span>
                      <span>{{ getFlatItem(virtualRow.index)?.header }}</span>
                    </div>
                    <span v-if="getFlatItem(virtualRow.index)?.header === '星标朋友'" class="count">
                      ({{ contactGroups.find(g => g.key === '⭐')?.count || 0 }})
                    </span>
                  </div>

                  <!-- 联系人项 -->
                  <div
                    v-else
                    class="contact-item"
                    @click="viewContact(getFlatItem(virtualRow.index)?.data!)"
                  >
                    <Avatar
                      :src="getFlatItem(virtualRow.index)?.data!.avatar"
                      :name="getFlatItem(virtualRow.index)?.data!.nickname"
                      :size="48"
                      class="contact-avatar"
                    />

                    <div class="contact-info">
                      <div class="contact-name">
                        <span class="name-text">{{ getFlatItem(virtualRow.index)?.data!.remark || getFlatItem(virtualRow.index)?.data!.nickname }}</span>
                        <el-icon v-if="getFlatItem(virtualRow.index)?.data!.isStarred" color="#f59e0b" size="16">
                          <StarFilled />
                        </el-icon>
                      </div>
                      <div class="contact-desc">
                        <el-tag
                          v-if="getFlatItem(virtualRow.index)?.data!.type"
                          size="small"
                          :type="getFlatItem(virtualRow.index)?.data!.type === ContactType.Chatroom ? 'warning' : 'info'"
                          effect="plain"
                        >
                          {{ getFlatItem(virtualRow.index)?.data!.type === ContactType.Chatroom ? '群聊' : '好友' }}
                        </el-tag>
                        <span v-if="getFlatItem(virtualRow.index)?.data!.alias" class="alias">{{ getFlatItem(virtualRow.index)?.data!.alias }}</span>
                      </div>
                    </div>

                    <div class="contact-actions">
                      <el-button text type="primary" size="small" @click.stop="startChat(getFlatItem(virtualRow.index)?.data!)">
                        <el-icon><ChatDotRound /></el-icon>
                        发消息
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 字母索引 -->
          <div
            v-if="letterIndexList.length > 0 && contactStore.sortBy === 'pinyin'"
            class="letter-index"
          >
            <div
              v-for="index in letterIndexList"
              :key="index.key"
              class="letter-item"
              :class="{
                disabled: !index.enabled,
                starred: index.type === 'starred',
                special: index.type === 'special',
              }"
              @click="index.enabled && jumpToLetter(index.key)"
            >
              {{ index.label }}
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
      <div
        class="contact-detail-panel"
        :class="{ 'mobile-visible': appStore.isMobile && appStore.showContactDetail }"
      >
        <ContactDetail
          v-if="appStore.isMobile && appStore.showContactDetail && appStore.currentMobileContactId"
          :contact-id="appStore.currentMobileContactId"
        />
        <ContactDetail
          v-else-if="!appStore.isMobile && selectedContact"
          :contact-id="selectedContact.wxid"
        />
        <el-empty
          v-else-if="!appStore.isMobile"
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

.contact-list-panel {
  width: 320px;
  height: 100%;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease-out;

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
      overflow-y: auto;
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
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;

      .header-text {
        display: flex;
        align-items: center;
        gap: 6px;

        .star-icon {
          font-size: 14px;
        }
      }

      .count {
        color: var(--el-text-color-placeholder);
        font-size: 11px;
      }

      &.starred-header {
        background-color: #fffbf0;
        color: #ff9500;
        font-size: 13px;

        .star-icon {
          color: #ff9500;
        }
      }
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
        color: var(--el-text-color-regular);
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;

        &:hover:not(.disabled) {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
        }

        &.disabled {
          color: var(--el-text-color-placeholder);
          cursor: default;
        }

        &.starred {
          color: #ff9500;
        }

        &.special {
          font-weight: 700;
        }
      }
    }

    .back-top-button {
      position: absolute;
      right: 40px;
      bottom: 20px;
      z-index: 100;
    }
  }
}

.contact-detail-panel {
  flex: 1;
  height: 100%;
  background-color: var(--el-bg-color-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 移动端适配
.mobile-page {
  .contact-container {
    position: relative;
  }

  .contact-list-panel {
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1;

    &.mobile-hidden {
      transform: translateX(-100%);
    }
  }

  .contact-detail-panel {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;

    &.mobile-visible {
      transform: translateX(0);
      z-index: 2;
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
