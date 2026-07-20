<template>
  <div class="comment-section">
    <div class="comment-section-title">
      <span>💬</span> 评论 ({{ comments.length }})
    </div>

    <div v-if="appStore.isLoggedIn" style="margin-bottom: 16px;">
      <textarea
        v-model="newComment"
        class="form-textarea"
        placeholder="写下你的评论..."
        style="min-height: 60px; margin-bottom: 8px;"
      ></textarea>
      <button class="btn btn-primary btn-sm" @click="submitComment" :disabled="!newComment.trim()">
        发表评论
      </button>
    </div>
    <div v-else style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; font-size: 14px; color: var(--text-secondary);">
      <router-link to="/login" style="color: var(--primary);">登录</router-link> 后即可发表评论
    </div>

    <div v-if="filteredComments.length === 0" class="empty-state" style="padding: 30px;">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">暂无评论，来发表第一条评论吧</div>
    </div>

    <div v-for="comment in filteredComments" :key="comment.id" class="comment-item">
      <div class="comment-header">
        <div class="comment-author">
          <span>👤</span> {{ comment.author }}
          <span v-if="comment.isAdmin" class="badge badge-admin" style="font-size: 10px;">管理员</span>
        </div>
        <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
      </div>
      <div class="comment-content">{{ comment.content }}</div>
      <div v-if="canDelete(comment)" class="comment-actions">
        <button class="btn btn-danger btn-sm" @click="deleteComment(comment.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAppStore } from '@/stores/app';

const props = defineProps({
  jobId: String,
});

const appStore = useAppStore();
const newComment = ref('');

const comments = computed(() => {
  return appStore.comments.filter((c) => c.jobId === props.jobId);
});

const filteredComments = computed(() => {
  return [...comments.value].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
});

function canDelete(comment) {
  return appStore.isAdmin || comment.authorId === appStore.currentUser?.username;
}

async function submitComment() {
  if (!newComment.value.trim()) return;
  await appStore.addComment({
    jobId: props.jobId,
    author: appStore.currentUser.nickname || appStore.currentUser.username,
    authorId: appStore.currentUser.username,
    content: newComment.value.trim(),
    isAdmin: appStore.isAdmin,
  });
  newComment.value = '';
}

async function deleteComment(id) {
  if (confirm('确定删除此评论？')) {
    await appStore.deleteComment(id);
  }
}

function formatTime(t) {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleString('zh-CN');
}
</script>
