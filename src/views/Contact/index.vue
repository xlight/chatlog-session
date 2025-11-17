<template>
  <div class="contact-page flex-center">
    <el-result icon="info" title="联系人" sub-title="功能开发中...">
      <template #extra>
        <el-button type="primary" @click="$router.push('/chat')">返回聊天</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.contact-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
}
</style>