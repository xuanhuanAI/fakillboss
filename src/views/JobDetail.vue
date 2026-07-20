<template>
  <div v-if="job" class="detail-page">
    <div class="detail-header">
      <router-link to="/" class="detail-back">← 返回首页</router-link>
      <h1 class="detail-title">{{ job.title }}</h1>
      <div class="detail-company"><span>🏢</span> {{ job.company }} <span class="badge" :class="'badge-'+type">{{ typeLabel }}</span></div>
      <div class="detail-meta"><span>👤 发布者: {{ job.author }}</span><span>📅 {{ formatTime(job.createdAt) }}</span><span v-if="job.salary">💰 {{ job.salary }}</span></div>
    </div>
    <div class="detail-content">{{ job.description }}</div>
    <div v-if="canDelete" style="display:flex;gap:8px;margin-bottom:24px">
      <button class="btn btn-danger btn-sm" @click="deleteJob">🗑️ 删除此信息</button>
    </div>
    <CommentSection :job-id="job.id" />
  </div>
  <div v-else class="loading"><div class="spinner"></div><p>加载中...</p></div>
</template>
<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import CommentSection from "@/components/CommentSection.vue";
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const type = ref(route.params.type);
const job = ref(null);
const typeLabels = { good: "推荐", medium: "一般", bad: "避雷" };
const typeLabel = computed(() => typeLabels[type.value] || type.value);
const canDelete = computed(() => appStore.isLoggedIn && job.value && (appStore.isAdmin || job.value.authorId === appStore.currentUser?.username));
onMounted(() => {
  const jobs = appStore.jobs[type.value] || [];
  job.value = jobs.find((j) => j.id === route.params.id);
  if (!job.value) router.push("/");
});
async function deleteJob() {
  if (confirm("确定删除此信息吗？")) {
    await appStore.deleteJob(type.value, job.value.id);
    router.push("/" + type.value);
  }
}
function formatTime(t) { if (!t) return ""; return new Date(t).toLocaleString("zh-CN"); }
</script>
