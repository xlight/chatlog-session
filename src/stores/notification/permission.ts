/**
 * notification store - permission 子模块
 *
 * 通知权限管理：checkPermission / requestPermission
 */
import { useAppStore } from '../app'
import type { NotificationConfigContext } from './config'
import type { PermissionStatus } from './config'

export interface NotificationPermission {
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
}

export function useNotificationPermission(
  ctx: NotificationConfigContext
): NotificationPermission {
  const { permission } = ctx

  /**
   * 检查通知权限
   */
  async function checkPermission(): Promise<PermissionStatus> {
    if (!('Notification' in window)) {
      permission.value = 'denied'
      return 'denied'
    }

    permission.value = Notification.permission as PermissionStatus
    return permission.value
  }

  /**
   * 请求通知权限
   */
  async function requestPermission(): Promise<PermissionStatus> {
    if (!('Notification' in window)) {
      permission.value = 'denied'
      return 'denied'
    }

    if (permission.value === 'granted') {
      return 'granted'
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result as PermissionStatus

      const appStore = useAppStore()
      if (appStore.isDebug) {
        console.log('🔔 Notification permission:', result)
      }

      return permission.value
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      permission.value = 'denied'
      return 'denied'
    }
  }

  return {
    checkPermission,
    requestPermission,
  }
}
