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
