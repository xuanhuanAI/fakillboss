<template>
  <div>
    <div class="page-header">
      <h1 class="page-title"><span>👌</span> 中等工作</h1>
      <button v-if="appStore.isLoggedIn" class="btn btn-warning" @click="showForm = true">
        + 添加记录
      </button>
    </div>

    <div v-if="appStore.jobs.medium.length === 0" class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">还没有中等工作记录</div>
      <button v-if="appStore.isLoggedIn" class="btn btn-warning" style="margin-top: 12px;" @click="showForm = true">
        添加记录
      </button>
      <router-link v-else to="/login" class="btn btn-primary" style="margin-top: 12px;">
        登录后添加
      </router-link>
    </div>

    <div v-else class="job-list">
      <JobCard v-for="job in appStore.jobs.medium" :key="job.id" :job="job" type="medium" />
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content">
        <div class="modal-title">
          <span>👌 添加中等工作</span>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <form @submit.prevent="submitJob">
          <div class="form-group">
            <label class="form-label">岗位名称 *</label>
            <input v-model="form.title" class="form-input" placeholder="例如：后端开发工程师" required />
          </div>
          <div class="form-group">
            <label class="form-label">公司名称 *</label>
            <input v-model="form.company" class="form-input" placeholder="例如：某某科技有限公司" required />
          </div>
          <div class="form-group">
            <label class="form-label">工作体验 *</label>
            <textarea v-model="form.description" class="form-textarea" placeholder="客观描述工作情况、优缺点..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">薪资范围</label>
            <input v-model="form.salary" class="form-input" placeholder="例如：10K-20K" />
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
            <button type="submit" class="btn btn-warning">添加记录</button>
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
  await appStore.addJob('medium', {
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
