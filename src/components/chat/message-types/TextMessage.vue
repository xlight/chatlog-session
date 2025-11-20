<script setup lang="ts">
interface Props {
  content: string
}

defineProps<Props>()
</script>

<template>
  <div class="message-text">
    {{ content }}
  </div>
</template>

<style lang="scss" scoped>
.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>