// Microsoft Clarity 分析 SDK
// @microsoft/clarity 为可选依赖，通过 CDN 脚本加载，未加载时静默降级
// 全局 window.clarity 由 CDN 脚本注入（index.html）

let initialized = false

interface ClarityAPI {
  init: (projectId: string) => void
  setTag: (key: string, value: string | string[]) => void
  event: (eventName: string) => void
  identify: (userId: string, sessionId?: string, pageId?: string, userHint?: string) => void
  consent: (consent: boolean) => void
  upgrade: (upgradeReason: string) => void
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    clarity?: ClarityAPI
  }
}

function getClarity(): ClarityAPI | undefined {
  return typeof window !== 'undefined' ? window.clarity : undefined
}

export function useClarity() {
  function init(projectId: string) {
    if (initialized) return
    const c = getClarity()
    if (c) {
      c.init(projectId)
      initialized = true
    }
  }

  function setTag(key: string, value: string | string[]) {
    if (!initialized) return
    getClarity()?.setTag(key, value)
  }

  function trackEvent(eventName: string) {
    if (!initialized) return
    getClarity()?.event(eventName)
  }

  function identify(userId: string, userHint?: string) {
    if (!initialized) return
    getClarity()?.identify(userId, undefined, undefined, userHint)
  }

  function setConsent(consent: boolean) {
    if (!initialized) return
    getClarity()?.consent(consent)
  }

  return { init, setTag, trackEvent, identify, setConsent }
}
