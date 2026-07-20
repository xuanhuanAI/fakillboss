<template>
  <div v-if="job" class="detail-page">
    <div class="detail-header">
      <router-link to="/" class="detail-back">鈫?杩斿洖棣栭〉</router-link>
      <h1 class="detail-title">{{ job.title }}</h1>
      <div class="detail-company">
        <span>馃彚</span> {{ job.company }}
        <span class="badge" :class="'badge-' + type">{{ typeLabel }}</span>
      </div>
      <div class="detail-meta">
        <span>馃懁 鍙戝竷鑰? {{ job.author }}</span>
        <span>馃搮 {{ formatTime(job.createdAt) }}</span>
        <span v-if="job.salary">馃挵 {{ job.salary }}</span>
      </div>
    </div>

    <div class="detail-content">{{ job.description }}</div>

    <div v-if="canDelete" style="display: flex; gap: 8px; margin-bottom: 24px;">
      <button class="btn btn-danger btn-sm" @click="deleteJob">馃棏锔?鍒犻櫎姝や俊鎭?/button>
    </div>

    <CommentSection :job-id="job.id" />
  </div>
  <div v-else class="loading">
    <div class="spinner"></div>
    <p>鍔犺浇涓?..</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import CommentSection from '@/components/CommentSection.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const type = ref(route.params.type);
const job = ref(null);

const typeLabels = { good: '鎺ㄨ崘', medium: '涓€鑸?, bad: '閬块浄' };
const typeLabel = computed(() => typeLabels[type.value] || type.value);

const canDelete = computed(() => {
  if (!appStore.isLoggedIn || !job.value) return false;
  return (
    appStore.isAdmin ||
    job.value.authorId === appStore.currentUser?.username
  );
});

onMounted(() => {
  const jobs = appStore.jobs[type.value] || [];
  job.value = jobs.find((j) => j.id === route.params.id);
  if (!job.value) {
    router$.push('/');
  }
});

async function deleteJob() {
  if (confirm('纭畾鍒犻櫎姝や俊鎭悧锛?)) {
    await appStore.deleteJob(type.value, job.value.id);
    router$.push('/' + type.value);
  }
}

function formatTime(t) {
  if (!t) return '';
  return new Date(t).toLocaleString('zh-CN');
}
</script>
