import Clarity from '@microsoft/clarity'

let initialized = false

export function useClarity() {
  function init(projectId: string) {
    if (initialized) return
    Clarity.init(projectId)
    initialized = true
  }

  function setTag(key: string, value: string | string[]) {
    if (!initialized) return
    Clarity.setTag(key, value)
  }

  function trackEvent(eventName: string) {
    if (!initialized) return
    Clarity.event(eventName)
  }

  function identify(userId: string, userHint?: string) {
    if (!initialized) return
    Clarity.identify(userId, undefined, undefined, userHint)
  }

  function setConsent(consent: boolean) {
    if (!initialized) return
    Clarity.consent(consent)
  }

  return { init, setTag, trackEvent, identify, setConsent }
}
