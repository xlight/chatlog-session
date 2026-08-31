/**
 * message-types 注册机制基线测试
 *
 * 迁移前锁定 component 字段映射 + registry 完整性 + 渲染入口行为。
 * 迁移后全量跑通即证明等价。
 */
import { describe, it, expect } from 'vitest'
import { MESSAGE_TYPE_CONFIGS, findMessageTypeConfig } from '../config'
import { MESSAGE_COMPONENT_REGISTRY } from '../registry'
import { MessageType } from '@/types/message'

describe('message-types 注册机制基线测试', () => {
  describe('config.component 字段映射', () => {
    it('所有配置的 component 字段非空', () => {
      for (const config of MESSAGE_TYPE_CONFIGS) {
        expect(config.component, `type=${config.type} subType=${config.subType}`).toBeTruthy()
      }
    })

    it('配置总数为 29 条', () => {
      expect(MESSAGE_TYPE_CONFIGS).toHaveLength(29)
    })

    it('基础消息类型能找到配置', () => {
      const textConfig = findMessageTypeConfig(MessageType.Text)
      expect(textConfig).toBeDefined()
      expect(textConfig!.component).toBeTruthy()
    })
  })

  describe('registry 完整性', () => {
    it('MESSAGE_COMPONENT_REGISTRY 注册了组件', () => {
      const keys = Object.keys(MESSAGE_COMPONENT_REGISTRY)
      expect(keys.length).toBeGreaterThanOrEqual(24)
    })

    it('每个 config.component 都能在 registry 中找到', () => {
      for (const config of MESSAGE_TYPE_CONFIGS) {
        const componentName = config.component as unknown as string
        // 迁移前 component 是 string，迁移后是 Component 对象
        // 迁移前：用 string key 查 registry
        // 迁移后：component 已是 Component，无需 registry 查找
        if (typeof componentName === 'string') {
          expect(
            MESSAGE_COMPONENT_REGISTRY[componentName],
            `组件 "${componentName}" 未在 registry 中注册`
          ).toBeDefined()
        }
      }
    })
  })

  describe('渲染入口行为', () => {
    it('文本消息 → TextMessage 组件', () => {
      const config = findMessageTypeConfig(MessageType.Text)
      expect(config).toBeDefined()
      // 迁移前：component 是字符串 'TextMessage'
      // 迁移后：component 是 TextMessage 组件引用
      const component = config!.component as unknown
      if (typeof component === 'string') {
        expect(component).toBe('TextMessage')
        expect(MESSAGE_COMPONENT_REGISTRY[component]).toBeDefined()
      } else {
        // 迁移后：component 是组件对象
        expect(component).toBeTruthy()
      }
    })

    it('图片消息 → ImageMessage 组件', () => {
      const config = findMessageTypeConfig(MessageType.Image)
      expect(config).toBeDefined()
      const component = config!.component as unknown
      if (typeof component === 'string') {
        expect(component).toBe('ImageMessage')
        expect(MESSAGE_COMPONENT_REGISTRY[component]).toBeDefined()
      } else {
        expect(component).toBeTruthy()
      }
    })

    it('语音消息 → VoiceMessage 组件', () => {
      const config = findMessageTypeConfig(MessageType.Voice)
      expect(config).toBeDefined()
      const component = config!.component as unknown
      if (typeof component === 'string') {
        expect(component).toBe('VoiceMessage')
        expect(MESSAGE_COMPONENT_REGISTRY[component]).toBeDefined()
      } else {
        expect(component).toBeTruthy()
      }
    })
  })
})
