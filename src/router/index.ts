/**
 * 路由配置
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

/**
 * 路由定义
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/index.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/Onboarding/index.vue'),
    meta: {
      title: '欢迎使用',
      requiresAuth: false,
    },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat/index.vue'),
    meta: {
      title: '聊天',
      icon: 'ChatLineSquare',
    },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('@/views/Contact/index.vue'),
    meta: {
      title: '联系人',
      icon: 'User',
    },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/Search/index.vue'),
    meta: {
      title: '搜索',
      icon: 'Search',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings/index.vue'),
    meta: {
      title: '设置',
      icon: 'Setting',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: { name: 'Home' },
  },
]

/**
 * 创建路由实例
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 全局前置守卫
 */
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - Chatlog Session`
  } else {
    document.title = 'Chatlog Session'
  }

  // 检查是否需要显示 Onboarding
  const onboardingCompleted = localStorage.getItem('onboardingCompleted')
  const apiBaseUrl = localStorage.getItem('apiBaseUrl')

  // 如果未完成引导且不在引导页面，重定向到引导页
  if (!onboardingCompleted && !apiBaseUrl && to.path !== '/onboarding') {
    next('/onboarding')
    return
  }

  // 如果已完成引导但访问引导页，重定向到首页
  if (onboardingCompleted && apiBaseUrl && to.path === '/onboarding') {
    next('/')
    return
  }

  next()
})

/**
 * 全局后置守卫
 */
router.afterEach(() => {
  // 滚动到顶部
  window.scrollTo(0, 0)
})

export default router
