# Changelog

## [0.22.0] - 2026-03-12

### Added

#### Gap 生命周期治理能力

- 新增 Gap 相邻/重叠窗口自动合并策略，减少历史加载中的 Gap 碎片化展示。
- 新增 Gap 估算置信度分级（high / medium / low），为后续文案分级提供统一基础。
- 新增历史锚点推进断言与调试指标，便于定位重复窗口请求与锚点未前移问题。

### Changed

#### Gap / EmptyRange 语义与交互优化

- 历史加载与 Gap 加载流程统一为“显式重复衔接才判定已打通缺口”的策略，避免误删 Gap。
- Gap 文案改为置信度驱动：
  - 高置信显示“约 N 条消息”；
  - 中低置信统一显示“还有更多消息”。
- EmptyRange 与 Gap 视觉层级显式区分：
  - EmptyRange 作为“证据态”提示（不可点击）；
  - Gap 作为“行动态”入口（可点击加载）。
- 历史加载锚点逻辑抽取为统一函数，`MessageList` 与 `chat` store 复用同一策略，减少分叉。

### Technical Details

- **修改文件**:
  - `src/stores/chat/utils.ts` - 新增 Gap 置信度计算、Gap 范围解析、Gap 合并与统一历史锚点工具
  - `src/stores/chat.ts` - 接入 Gap 生命周期规则、置信度文案、结构化调试指标与锚点推进断言
  - `src/types/message.ts` - 扩展 `gapData` 元信息（估算值、置信度）并调整 Gap 时间锚点语义
  - `src/components/chat/MessageList.vue` - 改为复用统一历史锚点函数
  - `src/components/chat/MessageBubble.vue` - EmptyRange / Gap 视觉样式与文案层级优化

### User Experience

- “加载更多历史消息”在复杂时间窗口场景下更稳定，Gap 提示更少、语义更明确。
- 用户更容易区分“该窗口已探测为空”与“该窗口仍可继续补齐”的状态。
- Gap 数量提示更可信，降低低置信估算带来的误导。

### Notes

- 本版本聚焦虚拟窗口状态机（Gap / EmptyRange）的稳定性和可解释性，为后续历史加载体验优化与回归验证提供基础。
