<script setup lang="ts">
interface AppearanceSettingsData {
  theme: string
  language: string
  fontSize: number
}

const props = defineProps<{
  modelValue: AppearanceSettingsData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AppearanceSettingsData]
  themeChange: [theme: string]
}>()

const fontSizeOptions = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
  { label: '特大', value: 'extra-large' },
]

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const themeOptions = [
  { label: '浅色', value: 'light', icon: 'Sunny' },
  { label: '深色', value: 'dark', icon: 'Moon' },
  { label: '跟随系统', value: 'auto', icon: 'Monitor' },
]

const updateValue = <K extends keyof AppearanceSettingsData>(
  key: K,
  value: AppearanceSettingsData[K]
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const handleThemeChange = (val: string | number | boolean | undefined) => {
  const theme = String(val)
  updateValue('theme', theme)
  emit('themeChange', theme)
}
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <h3>外观设置</h3>
      <p>自定义界面外观</p>
    </div>

    <el-form label-position="left" label-width="120px">
      <el-form-item label="主题模式">
        <el-radio-group :model-value="modelValue.theme" @update:model-value="handleThemeChange">
          <el-radio-button v-for="option in themeOptions" :key="option.value" :value="option.value">
            <el-icon><component :is="option.icon" /></el-icon>
            {{ option.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="语言">
        <el-select
          :model-value="modelValue.language"
          style="width: 200px"
          @update:model-value="(val: string) => updateValue('language', val)"
        >
          <el-option
            v-for="option in languageOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="字体大小">
        <el-radio-group
          :model-value="modelValue.fontSize"
          @update:model-value="
            (val: string | number | boolean | undefined) =>
              val !== undefined && updateValue('fontSize', Number(val))
          "
        >
          <el-radio-button
            v-for="option in fontSizeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.setting-section {
  .section-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }
}
</style>
