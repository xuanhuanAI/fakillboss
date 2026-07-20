<template>
  <div>
    <div class="page-header">
      <h1 class="page-title"><span>👍</span> 好工作推荐</h1>
      <button v-if="appStore.isLoggedIn" class="btn btn-success" @click="showForm = true">
        + 发布推荐
      </button>
    </div>

    <div v-if="appStore.jobs.good.length === 0" class="empty-state">
      <div class="empty-state-icon">🎉</div>
      <div class="empty-state-text">还没有人分享好工作，来做第一个推荐人吧！</div>
      <button v-if="appStore.isLoggedIn" class="btn btn-success" style="margin-top: 12px;" @click="showForm = true">
        发布推荐
      </button>
      <router-link v-else to="/login" class="btn btn-primary" style="margin-top: 12px;">
        登录后发布
      </router-link>
    </div>

    <div v-else class="job-list">
      <JobCard v-for="job in appStore.jobs.good" :key="job.id" :job="job" type="good" />
    </div>

    <!-- 发布表单弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content">
        <div class="modal-title">
          <span>👍 推荐好工作</span>
          <button class="modal-close" @click="showForm = false">&times;</button>
        </div>
        <form @submit.prevent="submitJob">
          <div class="form-group">
            <label class="form-label">岗位名称 *</label>
            <input v-model="form.title" class="form-input" placeholder="例如：前端开发工程师" required />
          </div>
          <div class="form-group">
            <label class="form-label">公司名称 *</label>
            <input v-model="form.company" class="form-input" placeholder="例如：某某科技有限公司" required />
          </div>
          <div class="form-group">
            <label class="form-label">推荐理由 *</label>
            <textarea v-model="form.description" class="form-textarea" placeholder="分享你的真实工作体验、薪资待遇、团队氛围等..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">薪资范围</label>
            <input v-model="form.salary" class="form-input" placeholder="例如：15K-25K / 年薪30W+" />
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
            <button type="submit" class="btn btn-success">发布推荐</button>
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
  await appStore.addJob('good', {
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
