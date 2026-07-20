<template>
  <div>
    <div class="hero-section">
      <h1 class="hero-title">职评网</h1>
      <p class="hero-subtitle">找工作避雷指南 — 分享真实工作体验，帮助求职者做出明智选择</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <router-link to="/good" class="btn btn-primary btn-lg">查看好工作推荐</router-link>
        <router-link to="/bad" class="btn btn-danger btn-lg">查看避雷名单</router-link>
      </div>
    </div>
    <div class="module-grid">
      <router-link to="/good" class="module-card module-card-good">
        <div class="module-icon">👍</div>
        <div class="module-name" style="color:#065f46">好工作</div>
        <div class="module-desc">分享优质公司和岗位，推荐值得加入的团队</div>
        <div class="module-count badge badge-good">{{ appStore.jobs.good.length }} 条推荐</div>
      </router-link>
      <router-link to="/medium" class="module-card module-card-medium">
        <div class="module-icon">👌</div>
        <div class="module-name" style="color:#92400e">中等工作</div>
        <div class="module-desc">一般般的工作，优缺点都有，自行判断</div>
        <div class="module-count badge badge-medium">{{ appStore.jobs.medium.length }} 条记录</div>
      </router-link>
      <router-link to="/bad" class="module-card module-card-bad">
        <div class="module-icon">⚠️</div>
        <div class="module-name" style="color:#991b1b">避雷工作</div>
        <div class="module-desc">踩坑经验分享，帮你避开坑爹公司和岗位</div>
        <div class="module-count badge badge-bad">{{ appStore.jobs.bad.length }} 条避雷</div>
      </router-link>
    </div>
    <div style="margin-top:48px">
      <h2 style="font-size:22px;font-weight:700;margin-bottom:16px">📢 最新动态</h2>
      <div class="job-list">
        <div v-for="item in recentJobs" :key="item.id + item.type">
          <JobCard :job="item" :type="item.type" />
        </div>
      </div>
      <div v-if="recentJobs.length === 0" class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">还没有任何工作信息</div>
        <router-link v-if="appStore.isLoggedIn" to="/good" class="btn btn-primary" style="margin-top:12px">发布第一条信息</router-link>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted } from "vue";
import { useAppStore } from "@/stores/app";
import JobCard from "@/components/JobCard.vue";
const appStore = useAppStore();
const recentJobs = computed(() => {
  const all = [];
  for (const type of ["good", "medium", "bad"]) {
    for (const job of appStore.jobs[type]) {
      all.push({ ...job, type });
    }
  }
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
});
onMounted(() => {
  if (appStore.jobs.good.length === 0) appStore.initApp();
});
</script>
