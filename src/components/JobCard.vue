<template>
  <div class="job-card" :class="'job-card-' + type" @click="goToDetail">
    <div class="job-card-title">
      <span>{{ job.title }}</span>
      <span class="badge" :class="'badge-' + type">{{ typeLabel }}</span>
    </div>
    <div class="job-card-company">
      <span>🏢</span> {{ job.company }}
    </div>
    <div class="job-card-desc">{{ job.description }}</div>
    <div class="job-card-footer">
      <span>👤 {{ job.author }}</span>
      <span>{{ formatTime(job.createdAt) }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  job: Object,
  type: String,
});

const typeLabels = { good: '推荐', medium: '一般', bad: '避雷' };
const typeLabel = typeLabels[props.type] || props.type;

function goToDetail() {
  const router = { push: (path) => window.location.hash = '#/' + path };
  // Use the app router
  window.location.hash = '#/job/' + props.type + '/' + props.job.id;
}

function formatTime(t) {
  if (!t) return '';
  return new Date(t).toLocaleDateString('zh-CN');
}
</script>
