/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/**
 * 环境变量类型定义
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_BASE_PATH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * 构建时注入的全局变量
 */
declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string
declare const __BUILD_TIME__: string
declare const __GIT_HASH__: string
declare const __GIT_BRANCH__: string