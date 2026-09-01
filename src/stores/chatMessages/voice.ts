/**
 * chatMessages store - voice 子模块
 *
 * 语音播放状态管理
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface ChatMessagesVoice {
  playingVoiceId: Ref<number | null>
  setPlayingVoice: (id: number | null) => void
}

export function useChatMessagesVoice(): ChatMessagesVoice {
  const playingVoiceId = ref<number | null>(null)

  function setPlayingVoice(id: number | null) {
    playingVoiceId.value = id
  }

  return {
    playingVoiceId,
    setPlayingVoice,
  }
}
