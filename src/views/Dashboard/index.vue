<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { request } from '@/utils/request'
import { useContactStore } from '@/stores/contact'
import { formatFileSize, formatNumber } from '@/utils/format'
import { formatDate } from '@/utils/date'
import Avatar from '@/components/common/Avatar.vue'
import { mediaAPI } from '@/api/media'
import type { DashboardData } from '@/api/dashboard'

const contactStore = useContactStore()
const loading = ref(false)
const dashboardData = ref<DashboardData | null>(null)

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const res = await request.get<DashboardData>('/api/v1/dashboard')
    dashboardData.value = res
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

// 计算属性：消息类型排序
const sortedMsgTypes = computed(() => {
  if (!dashboardData.value?.overview?.msgTypes) return []
  const types = dashboardData.value.overview.msgTypes
  const total = dashboardData.value.overview.msgStats.total_msgs

  return Object.entries(types)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// 计算属性：时间跨度
const timeSpan = computed(() => {
  if (!dashboardData.value?.overview?.timeline) return '-'
  const { earliest_msg_time, latest_msg_time, duration_days } = dashboardData.value.overview.timeline
  const start = formatDate(new Date(earliest_msg_time * 1000))
  const end = formatDate(new Date(latest_msg_time * 1000))
  return `${start} ~ ${end} (${duration_days}天)`
})

// 计算属性：存储占用
const storageUsage = computed(() => {
  if (!dashboardData.value?.overview?.dbStats) return { db: '-', dir: '-', total: '-' }
  const { db_size_mb, dir_size_mb } = dashboardData.value.overview.dbStats
  const total_mb = db_size_mb + dir_size_mb
  return {
    db: formatFileSize(db_size_mb * 1024 * 1024),
    dir: formatFileSize(dir_size_mb * 1024 * 1024),
    total: formatFileSize(total_mb * 1024 * 1024)
  }
})

// 获取头像 URL
const getAvatarUrl = (avatarPath: string) => {
  return mediaAPI.getAvatarUrl(avatarPath)
}

// 颜色调色板
const colors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
  '#36cfc9', '#9254de', '#ff9c6e', '#597ef7', '#ff85c0'
]

// 计算属性：饼图样式
const pieChartStyle = computed(() => {
  let currentAngle = 0
  const segments = sortedMsgTypes.value.map((item, index) => {
    const color = colors[index % colors.length]
    const angle = (item.percentage / 100) * 360
    const start = currentAngle
    const end = currentAngle + angle
    currentAngle = end
    return `${color} ${start}deg ${end}deg`
  })
  return {
    background: `conic-gradient(${segments.join(', ')})`
  }
})

// 来源渠道颜色映射
const sourceChannelColors: Record<string, string> = {
  '群聊数据': '#409EFF',
  '私聊数据': '#67C23A'
}
const defaultSourceColor = '#909399'

// 计算属性：来源渠道
const sourceChannels = computed(() => {
  if (!dashboardData.value?.visualization?.dataTypeAnalysis?.source_channels) return []
  return Object.entries(dashboardData.value.visualization.dataTypeAnalysis.source_channels)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: data.percentage,
      color: sourceChannelColors[name] || defaultSourceColor
    }))
    .sort((a, b) => b.count - a.count)
})

// 计算属性：群聊分析概览
const groupOverview = computed(() => {
  return dashboardData.value?.visualization?.groupAnalysis?.overview || null
})
</script>

<template>
  <div class="dashboard-view">
    <div class="view-header">
      <div class="header-left">
        <h2>数据总览</h2>
        <span v-if="dashboardData?.overview?.user" class="user-badge">
          用户: {{ dashboardData.overview.user }}
        </span>
      </div>
      <el-button type="primary" :loading="loading" @click="fetchDashboardData">
        <el-icon class="el-icon--left"><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div v-if="loading && !dashboardData" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="dashboardData" class="dashboard-content">
      <!-- 概览卡片 -->
      <div class="overview-grid">
        <!-- 消息总数 -->
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon blue"><ChatDotRound /></el-icon>
              <span>消息总数</span>
            </div>
          </template>
          <div class="stat-value">{{ formatNumber(dashboardData.overview.msgStats.total_msgs) }}</div>
          <div class="stat-footer">
            <div class="stat-item">
              <span class="label">发送</span>
              <span class="value">{{ formatNumber(dashboardData.overview.msgStats.sent_msgs) }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="label">接收</span>
              <span class="value">{{ formatNumber(dashboardData.overview.msgStats.received_msgs) }}</span>
            </div>
          </div>
        </el-card>

        <!-- 存储占用 -->
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon orange"><Files /></el-icon>
              <span>存储占用</span>
            </div>
          </template>
          <div class="stat-value">{{ storageUsage.total }}</div>
          <div class="stat-footer">
            <div class="stat-item">
              <span class="label">数据库</span>
              <span class="value">{{ storageUsage.db }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="label">资源文件</span>
              <span class="value">{{ storageUsage.dir }}</span>
            </div>
          </div>
        </el-card>

        <!-- 社交网络 -->
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon green"><Connection /></el-icon>
              <span>社交网络</span>
            </div>
          </template>
          <div class="stat-value">{{ formatNumber(contactStore.totalContacts) }} 人 + {{ formatNumber(dashboardData.visualization.groupAnalysis.overview.total_groups) }} 群</div>
          <div class="stat-footer">
            <div class="stat-item">
              <span class="label">活跃</span>
              <span class="value">{{ formatNumber(dashboardData.visualization.relationshipNetwork.nodes.length) }} 人</span>
            </div>


            <div > ➕ </div>
            <div class="stat-item">
              <span class="label"></span>
              <span class="value">{{ formatNumber(dashboardData.visualization.groupAnalysis.overview.active_groups) }} 群</span>
            </div>
          </div>
        </el-card>

        <!-- 时间跨度 -->
        <el-card shadow="hover" class="overview-card">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon purple"><Timer /></el-icon>
              <span>时间跨度</span>
            </div>
          </template>
          <div class="stat-value small">{{ dashboardData.overview.timeline.duration_days }} 天</div>
          <div class="stat-footer single">
            <span class="value small-text">{{ timeSpan }}</span>
          </div>
        </el-card>
        <!-- 消息类型分布 -->
        <el-card shadow="hover" class="chart-card col-span-2">
          <template #header>
            <div class="card-header">
              <span>消息类型分布</span>
            </div>
          </template>
          <div class="pie-chart-container">
            <div class="pie-chart" :style="pieChartStyle"></div>
            <div class="chart-legend">
              <div v-for="(item, index) in sortedMsgTypes" :key="item.name" class="legend-item">
                <span class="legend-color" :style="{ backgroundColor: colors[index % colors.length] }"></span>
                <span class="legend-info">
                  <span class="legend-name">{{ item.name }}</span>
                  <span class="legend-count">{{ formatNumber(item.count) }}</span>
                </span>
                <span class="legend-percent">{{ item.percentage < 1 ? '<1%' : `${item.percentage.toFixed(1)}%` }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <div class="combined-column col-span-2">
          <!-- 来源渠道 -->
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>来源渠道</span>
              </div>
            </template>
            <div class="stacked-bar-container">
              <div class="stacked-bar">
                <div
                  v-for="item in sourceChannels"
                  :key="item.name"
                  class="bar-segment"
                  :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                  :title="`${item.name}: ${formatNumber(item.count)} (${item.percentage.toFixed(1)}%)`"
                ></div>
              </div>
              <div class="chart-legend horizontal">
                <div v-for="item in sourceChannels" :key="item.name" class="legend-item">
                  <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
                  <span class="legend-name">{{ item.name }}</span>
                  <span class="legend-value">{{ formatNumber(item.count) }} ({{ item.percentage.toFixed(1) }}%)</span>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 群聊分析 -->
          <el-card shadow="hover" class="overview-card  chart-card" v-if="groupOverview">
            <template #header>
              <div class="card-header">
                <span>群聊分析</span>
              </div>
            </template>
            <div class="stat-value">
              <span class="label">今日消息: </span>
              <span class="value">{{ formatNumber(groupOverview.today_messages) }}</span>
            </div>


            <div class="stat-footer">
              <div class="stat-item">
                <span class="label">周均消息</span>
                <span class="value">{{ formatNumber(groupOverview.weekly_avg) }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="label">活跃群聊</span>
                <span class="value">{{ formatNumber(groupOverview.active_groups) }}</span>
                <span class="sub-label">/ {{ formatNumber(groupOverview.total_groups) }} 总数</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="label">活跃时段</span>
                <span class="value highlight">{{ groupOverview.most_active_hour }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 活跃群聊 -->
        <el-card shadow="hover" class="chart-card col-span-2">
          <template #header>
            <div class="card-header">
              <span>活跃群聊</span>
            </div>
          </template>
          <el-table :data="dashboardData.overview.groups" style="width: 100%" size="small">
            <el-table-column prop="NickName" label="群名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="member_count" label="成员" width="80" align="center" />
            <el-table-column prop="message_count" label="消息数" width="100" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.message_count) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 常用联系人 -->
        <el-card shadow="hover" class="chart-card col-span-2">
          <template #header>
            <div class="card-header">
              <span>常用联系人</span>
            </div>
          </template>
          <div class="contact-list">
            <div v-for="node in dashboardData.visualization.relationshipNetwork.nodes" :key="node.name" class="contact-item">
              <Avatar :src="getAvatarUrl(node.avatar)" :name="node.name" :size="40" />
              <div class="contact-info">
                <div class="contact-name">{{ node.name }}</div>
                <div class="contact-msgs">{{ formatNumber(node.messages) }} 条消息</div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);

  .view-header {
    padding: 16px 24px;
    background-color: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .user-badge {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        background: var(--el-fill-color);
        padding: 2px 8px;
        border-radius: 12px;
      }
    }
  }

  .dashboard-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color);
      border-radius: 3px;
    }
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .overview-card {
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;

      .header-icon {
        font-size: 18px;

        &.blue { color: #409eff; }
        &.orange { color: #e6a23c; }
        &.green { color: #67c23a; }
        &.purple { color: #a0cfff; }
      }
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: var(--el-text-color-primary);
      margin: 12px 0;

      &.small {
        font-size: 24px;
      }
    }

    .stat-footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      row-gap: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);

      &.single {
        justify-content: flex-start;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;

        .value {
          color: var(--el-text-color-regular);
          font-weight: 500;
        }
      }

      .stat-divider {
        width: 1px;
        height: 12px;
        background-color: var(--el-border-color);
        margin: 0 12px;
      }

      .small-text {
        font-size: 12px;
      }
    }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
  }

  .chart-card {
    height: 100%;
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      flex: 1;
      overflow: hidden;
    }
  }

  .col-span-2 {
    grid-column: span 2;
  }

  .combined-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .pie-chart-container {
    display: flex;
    align-items: center;
    gap: 24px;
    height: 100%;
    padding: 12px 0;

    .pie-chart {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      flex-shrink: 0;
      position: relative;

      // 中间挖空做成环形图
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 70%;
        height: 70%;
        background-color: var(--el-bg-color-overlay);
        border-radius: 50%;
      }
    }

    .chart-legend {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
      padding-right: 8px;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--el-border-color);
        border-radius: 2px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        font-size: 13px;
        gap: 8px;

        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-info {
          flex: 1;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;

          .legend-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .legend-count {
            color: var(--el-text-color-secondary);
          }
        }

        .legend-percent {
          width: 45px;
          text-align: right;
          font-weight: 500;
          color: var(--el-text-color-regular);
        }
      }
    }
  }

  .stacked-bar-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 12px 0;
    gap: 16px;

    .stacked-bar {
      height: 24px;
      width: 100%;
      display: flex;
      border-radius: 12px;
      overflow: hidden;
      background-color: var(--el-fill-color-light);

      .bar-segment {
        height: 100%;
        transition: width 0.3s ease;

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .chart-legend.horizontal {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;

      .legend-item {
        display: flex;
        align-items: center;
        font-size: 13px;
        gap: 6px;

        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-value {
          color: var(--el-text-color-secondary);
          margin-left: 4px;
        }
      }
    }
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 8px;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      .contact-info {
        flex: 1;
        min-width: 0;

        .contact-name {
          font-weight: 500;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contact-msgs {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .loading-container {
    padding: 24px;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .dashboard-content {
    padding: 16px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .channel-stats {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 12px 0;
    justify-content: center;
    height: 100%;

    .channel-item {
      .channel-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 14px;

        .channel-count {
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .group-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 8px 0;
    height: 100%;
    align-content: center;

    .group-stat-item {
      background-color: var(--el-fill-color-light);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-bottom: 4px;
      }

      .value {
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);

        &.highlight {
          color: var(--el-color-primary);
          font-size: 16px;
        }
      }

      .sub-label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
        transform: scale(0.9);
      }
    }
  }
}
</style>
