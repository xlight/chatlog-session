/**
 * Vite 插件：自动注入版本号和构建日期
 */
import type { Plugin } from 'vite'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface VersionPluginOptions {
  /**
   * 是否包含 git commit hash
   */
  includeGitHash?: boolean
  /**
   * 日期格式化函数
   */
  formatDate?: (date: Date) => string
}

/**
 * 获取 Git commit hash
 */
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 获取 Git 分支名
 */
function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 从 package.json 读取版本号
 */
function getPackageVersion(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    )
    return packageJson.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
function formatDateTime(date: Date): string {
  const dateStr = formatDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${dateStr} ${hours}:${minutes}:${seconds}`
}

/**
 * 创建版本信息插件
 */
export default function versionPlugin(options: VersionPluginOptions = {}): Plugin {
  const { includeGitHash = true, formatDate: customFormatDate } = options

  return {
    name: 'vite-plugin-version',
    
    config() {
      const now = new Date()
      const version = getPackageVersion()
      const buildDate = customFormatDate ? customFormatDate(now) : formatDate(now)
      const buildTime = formatDateTime(now)
      const gitHash = includeGitHash ? getGitHash() : ''
      const gitBranch = getGitBranch()

      // 构建完整版本号
      let fullVersion = version
      if (includeGitHash && gitHash !== 'unknown') {
        fullVersion = `${version}+${gitHash}`
      }

      return {
        define: {
          __APP_VERSION__: JSON.stringify(fullVersion),
          __BUILD_DATE__: JSON.stringify(buildDate),
          __BUILD_TIME__: JSON.stringify(buildTime),
          __GIT_HASH__: JSON.stringify(gitHash),
          __GIT_BRANCH__: JSON.stringify(gitBranch),
        },
      }
    },
  }
}