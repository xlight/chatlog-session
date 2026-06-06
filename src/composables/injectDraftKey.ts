import type { InjectionKey } from 'vue'

export type InjectDraftFn = (text: string) => void

export const INJECT_DRAFT_KEY: InjectionKey<InjectDraftFn> = Symbol('injectDraft')
