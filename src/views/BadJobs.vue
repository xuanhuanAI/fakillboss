<template>
  <div>
    <div class="page-header">
      <h1 class="page-title"><span>⚠️</span> 避雷工作</h1>
      <button v-if="appStore.isLoggedIn" class="btn btn-danger" @click="showForm = true">
        + 发布避雷
      </button>
    </div>

    <div v-if="appStore.jobs.bad.length === 0" class="empty-state">
      <div class="empty-state-icon">🛡️</div>
      <div class="empty-state-text">还没有人分享避雷信息，来帮助更多人避坑吧！</div>
      <button v-if="appStore.isLoggedIn" class="btn btn-danger" style="margin-top: 12px;" @click="showForm = true">
        发布避雷
      </button>
      <router-link v-else to="/login" class="btn btn-primary" style="margin-top: 12px;">
        登录后发布
      </router-link>
    </div>

    <div v-else class="job-list">
      <JobCard v-for="job in appStore.jobs.bad" :key="job.id" :job="job" type="bad" />
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content">
        <div class="modal-title">
          <span>⚠️ 发布避雷信息</span>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <form @submit.prevent="submitJob">
          <div class="form-group">
            <label class="form-label">岗位名称 *</label>
            <input v-model="form.title" class="form-input" placeholder="例如：销售代表" required />
          </div>
          <div class="form-group">
            <label class="form-label">公司名称 *</label>
            <input v-model="form.company" class="form-input" placeholder="例如：某某科技有限公司" required />
          </div>
          <div class="form-group">
            <label class="form-label">避雷原因 *</label>
            <textarea v-model="form.description" class="form-textarea" placeholder="详细描述避雷原因：薪资不实、加班严重、PUA文化、拖欠工资等..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">涉及金额（如有）</label>
            <input v-model="form.salary" class="form-input" placeholder="例如：拖欠工资15K / 押金2000" />
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
            <button type="submit" class="btn btn-danger">发布避雷</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '@/stores/app';
import JobCard from '@/components/JobCard.vue';

const appStore = useAppStore();
const showForm = ref(false);
const form = ref({ title: '', company: '', description: '', salary: '' });

async function submitJob() {
  await appStore.addJob('bad', {
    title: form.value.title,
    company: form.value.company,
    description: form.value.description,
    salary: form.value.salary,
    author: appStore.currentUser.nickname || appStore.currentUser.username,
    authorId: appStore.currentUser.username,
  });
  form.value = { title: '', company: '', description: '', salary: '' };
  showForm.value = false;
}
</script>
