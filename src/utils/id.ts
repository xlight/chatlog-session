/**
 * 共享 ID 生成工具
 *
 * 优先使用 crypto.randomUUID，回退到时间戳 + 随机数。
 * 收敛 ai/console.ts、ai/agent.ts、ai/activityLog.ts 三处重复实现。
 */

export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
