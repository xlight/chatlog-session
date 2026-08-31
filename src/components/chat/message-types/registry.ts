import { Component } from 'vue'

// 导入所有消息类型组件
import TextMessage from './TextMessage.vue'
import ImageMessage from './ImageMessage.vue'
import VideoMessage from './VideoMessage.vue'
import VoiceMessage from './VoiceMessage.vue'
import EmojiMessage from './EmojiMessage.vue'
import FileMessage from './FileMessage.vue'
import LinkMessage from './LinkMessage.vue'
import MiniProgramMessage from './MiniProgramMessage.vue'
import ShoppingMiniProgramMessage from './ShoppingMiniProgramMessage.vue'
import ShortVideoMessage from './ShortVideoMessage.vue'
import PatMessage from './PatMessage.vue'
import LiveMessage from './LiveMessage.vue'
import JielongMessage from './JielongMessage.vue'
import ForwardedMessage from './ForwardedMessage.vue'
import FavoriteMessage from './FavoriteMessage.vue'
import RedPacketMessage from './RedPacketMessage.vue'
import LocationMessage from './LocationMessage.vue'
import ContactCardMessage from './ContactCardMessage.vue'
import TransferMessage from './TransferMessage.vue'
import QQMailMessage from './QQMailMessage.vue'
import QQMusicMessage from './QQMusicMessage.vue'
import CardPackageMessage from './CardPackageMessage.vue'
import VoiceCallMessage from './VoiceCallMessage.vue'
import EmojiNotDownloadedMessage from './EmojiNotDownloadedMessage.vue'
import ReferMessage from './ReferMessage.vue'

/**
 * 消息类型组件注册表
 * 将组件名称映射到实际的 Vue 组件
 */
export const MESSAGE_COMPONENT_REGISTRY: Record<string, Component> = {
  TextMessage,
  ImageMessage,
  VideoMessage,
  VoiceMessage,
  EmojiMessage,
  FileMessage,
  LinkMessage,
  MiniProgramMessage,
  ShoppingMiniProgramMessage,
  ShortVideoMessage,
  PatMessage,
  LiveMessage,
  JielongMessage,
  ForwardedMessage,
  FavoriteMessage,
  RedPacketMessage,
  LocationMessage,
  ContactCardMessage,
  TransferMessage,
  QQMailMessage,
  QQMusicMessage,
  CardPackageMessage,
  VoiceCallMessage,
  EmojiNotDownloadedMessage,
  ReferMessage,
}

/**
 * 根据组件名称获取组件
 * @deprecated 使用 config 直接获取组件引用替代。计划在后续清理 change 中移除。
 */
export function getMessageComponent(componentName: string): Component | undefined {
  return MESSAGE_COMPONENT_REGISTRY[componentName]
}

/**
 * 检查组件是否已注册
 * @deprecated 使用 config 直接获取组件引用替代。计划在后续清理 change 中移除。
 */
export function isComponentRegistered(componentName: string): boolean {
  return componentName in MESSAGE_COMPONENT_REGISTRY
}
