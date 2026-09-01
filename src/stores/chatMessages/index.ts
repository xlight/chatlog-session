/**
 * chatMessages store - 组合入口
 *
 * 将 core/render/voice/load 子模块组合为统一的 useChatMessagesStore
 */
import { defineStore } from 'pinia'
import { useChatMessagesCore } from './core'
import { useChatMessagesRender } from './render'
import { useChatMessagesVoice } from './voice'
import { useChatMessagesLoad } from './load'

export const useChatMessagesStore = defineStore('chatMessages', () => {
  const core = useChatMessagesCore()
  const render = useChatMessagesRender(core)
  const voice = useChatMessagesVoice()
  const load = useChatMessagesLoad(core, render)

  function $reset() {
    render.abortBatchRender()
    core.$resetCore()
    render.$resetRender()
    voice.playingVoiceId.value = null
  }

  return {
    // State from core
    messages: core.messages,
    currentTalker: core.currentTalker,
    totalMessages: core.totalMessages,
    currentPage: core.currentPage,
    pageSize: core.pageSize,
    hasMore: core.hasMore,
    loading: core.loading,
    error: core.error,
    loadingHistory: core.loadingHistory,
    historyLoadMessage: core.historyLoadMessage,
    // State from render
    scrollTargetId: render.scrollTargetId,
    isBatchRendering: render.isBatchRendering,
    // State from voice
    playingVoiceId: voice.playingVoiceId,

    // Getters
    currentMessages: core.currentMessages,
    messagesByDate: render.messagesByDate,
    mediaMessages: render.mediaMessages,
    imageMessages: render.imageMessages,
    videoMessages: render.videoMessages,
    fileMessages: render.fileMessages,

    // Cache & Refresh 封装方法
    getCacheMetadata: load.getCacheMetadata,
    removeCache: load.removeCache,
    getCache: load.getCache,
    isAutoRefreshEnabled: load.isAutoRefreshEnabled,
    triggerRefresh: load.triggerRefresh,
    handleCacheUpdateData: load.handleCacheUpdateData,

    // Actions
    init: load.init,
    loadMessages: load.loadMessages,
    loadMessagesWithBatchRender: load.loadMessagesWithBatchRender,
    loadMoreMessages: load.loadMoreMessages,
    loadHistoryMessages: load.loadHistoryMessages,
    loadGapMessages: load.loadGapMessages,
    removeGapMessages: load.removeGapMessages,
    removeGapMessage: load.removeGapMessage,
    hasGapMessage: load.hasGapMessage,
    refreshMessages: load.refreshMessages,
    switchSession: load.switchSession,
    batchRenderMessages: render.batchRenderMessages,
    abortBatchRender: render.abortBatchRender,
    getMessageById: core.getMessageById,
    getMessageIndex: core.getMessageIndex,
    jumpToMessage: render.jumpToMessage,
    setPlayingVoice: voice.setPlayingVoice,
    getMessageStats: load.getMessageStats,
    clearError: core.clearError,
    $reset,
    cleanup: load.cleanup,
  }
})
