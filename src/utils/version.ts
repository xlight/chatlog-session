/**
 * 版本信息工具函数
 */

/**
 * 版本信息接口
 */
export interface VersionInfo {
  /** 应用版本号 */
  version: string
  /** 构建日期 */
  buildDate: string
  /** 构建时间 */
  buildTime: string
  /** Git commit hash */
  gitHash: string
  /** Git 分支名 */
  gitBranch: string
  /** 是否为开发版本 */
  isDev: boolean
  /** 完整版本信息 */
  fullVersion: string
}

/**
 * 获取版本信息
 */
export function getVersionInfo(): VersionInfo {
  const version = __APP_VERSION__
  const buildDate = __BUILD_DATE__
  const buildTime = __BUILD_TIME__
  const gitHash = __GIT_HASH__
  const gitBranch = __GIT_BRANCH__

  // 判断是否为开发版本
  const isDev = version.includes('dev') || gitBranch === 'dev' || gitBranch === 'develop'

  // 构建完整版本信息
  let fullVersion = version
  if (gitBranch && gitBranch !== 'unknown' && gitBranch !== 'main') {
    fullVersion += `-${gitBranch}`
  }

  return {
    version,
    buildDate,
    buildTime,
    gitHash,
    gitBranch,
    isDev,
    fullVersion,
  }
}

/**
 * 获取版本号
 */
export function getVersion(): string {
  return __APP_VERSION__
}

/**
 * 获取构建日期
 */
export function getBuildDate(): string {
  return __BUILD_DATE__
}

/**
 * 获取构建时间
 */
export function getBuildTime(): string {
  return __BUILD_TIME__
}

/**
 * 获取 Git Hash
 */
export function getGitHash(): string {
  return __GIT_HASH__
}

/**
 * 获取 Git 分支
 */
export function getGitBranch(): string {
  return __GIT_BRANCH__
}

/**
 * 格式化版本信息为字符串
 */
export function formatVersionInfo(): string {
  const info = getVersionInfo()
  let result = `v${info.version}`

  if (info.gitHash && info.gitHash !== 'unknown') {
    result += ` (${info.gitHash})`
  }

  result += ` - Built on ${info.buildDate}`

  if (info.isDev) {
    result += ' [Development]'
  }

  return result
}

/**
 * 打印版本信息到控制台
 */
export function printVersionInfo(): void {
  const info = getVersionInfo()

  console.log('%c Chatlog Session ', 'background: #409EFF; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
  console.log('%c Version Information ', 'background: #67C23A; color: white; font-weight: bold; padding: 2px 6px;')
  console.table({
    'Version': info.version,
    'Build Date': info.buildDate,
    'Build Time': info.buildTime,
    'Git Hash': info.gitHash || 'N/A',
    'Git Branch': info.gitBranch || 'N/A',
    'Environment': info.isDev ? 'Development' : 'Production',
  })
}

/**
 * 检查版本兼容性
 * @param requiredVersion 要求的最低版本
 */
export function checkVersion(requiredVersion: string): boolean {
  const current = getVersion().split(/[+-]/).shift() || '0.0.0'
  const required = requiredVersion.split(/[+-]/).shift() || '0.0.0'

  const currentParts = current.split('.').map(Number)
  const requiredParts = required.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const currentPart = currentParts[i] || 0
    const requiredPart = requiredParts[i] || 0

    if (currentPart > requiredPart) return true
    if (currentPart < requiredPart) return false
  }

  return true
}

// 在非生产环境下自动打印版本信息
if (import.meta.env.DEV) {
  printVersionInfo()
}