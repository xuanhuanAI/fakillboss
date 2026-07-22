<template>
  <div class="comment-section">
    <div class="comment-section-title">
      <span>💬</span> 评论 ({{ filteredComments.length }})
      <span v-if="newCount > 0" style="margin-left:8px;font-size:11px;color:var(--success)">{{ newCount }} 条新评论</span>
    </div>

    <div v-if="appStore.isLoggedIn" style="margin-bottom: 16px;">
      <textarea v-model="newComment" class="form-textarea" placeholder="写下你的评论..." style="min-height: 60px; margin-bottom: 8px;"></textarea>
      <div v-if="commentError" style="color:var(--danger);font-size:13px;margin-bottom:8px">{{ commentError }}</div>
      <button class="btn btn-primary btn-sm" @click="submitComment" :disabled="!newComment.trim() || submitting">
        {{ submitting ? '发表中...' : '发表评论' }}
      </button>
      <span v-if="commentSuccess" style="margin-left:8px;color:var(--success);font-size:13px">✅ 评论已发布</span>
    </div>
    <div v-else style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; font-size: 14px; color: var(--text-secondary);">
      <router-link to="/login" style="color: var(--primary);">登录</router-link> 后即可发表评论
    </div>

    <div v-if="filteredComments.length === 0" class="empty-state" style="padding: 30px;">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">暂无评论，来发表第一条评论吧</div>
    </div>

    <div v-for="comment in filteredComments" :key="comment.id" class="comment-item" :class="{ 'comment-new': comment._new }">
      <div class="comment-header">
        <div class="comment-author">
          <span>👤</span> {{ comment.author }}
          <span v-if="comment.isAdmin" class="badge badge-admin" style="font-size: 10px;">管理员</span>
        </div>
        <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
      </div>
      <div class="comment-content">{{ comment.content }}</div>
      <div v-if="canDelete(comment)" class="comment-actions">
        <button class="btn btn-danger btn-sm" @click="handleDeleteComment(comment.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAppStore } from "@/stores/app";

const props = defineProps({ jobId: String });
const appStore = useAppStore();
const newComment = ref("");
const submitting = ref(false);
const commentError = ref("");
const commentSuccess = ref(false);
const newCount = ref(0);
let pollTimer = null;
let lastCommentCount = 0;

const comments = computed(() => appStore.comments.filter((c) => c.jobId === props.jobId));
const filteredComments = computed(() => [...comments.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

function canDelete(comment) { return appStore.isAdmin || comment.authorId === appStore.currentUser?.username; }

async function pollComments() {
  try {
    const { getCOSData } = await import("@/utils/cos");
    const data = await getCOSData("data/comments.json");
    if (data && data.length > appStore.comments.length) {
      for (const c of data) {
        if (!appStore.comments.find((x) => x.id === c.id)) {
          c._new = true;
          appStore.comments.push(c);
        }
      }
      newCount.value = appStore.comments.length - lastCommentCount;
      if (newCount.value > 0) setTimeout(() => { newCount.value = 0; }, 4000);
      lastCommentCount = appStore.comments.length;
    }
  } catch (e) { /* 静默处理 */ }
}

async function submitComment() {
  if (!newComment.value.trim() || submitting.value) return;
  submitting.value = true; commentError.value = ""; commentSuccess.value = false;
  try {
    await appStore.addComment({
      jobId: props.jobId,
      author: appStore.currentUser.nickname || appStore.currentUser.username,
      authorId: appStore.currentUser.username,
      content: newComment.value.trim(),
      isAdmin: appStore.isAdmin,
    });
    newComment.value = ""; commentSuccess.value = true;
    lastCommentCount = appStore.comments.length;
    setTimeout(() => { commentSuccess.value = false; }, 3000);
  } catch (e) { commentError.value = "发布失败: " + e.message; }
  submitting.value = false;
}

async function handleDeleteComment(id) {
  if (confirm("确定删除此评论？")) { try { await appStore.deleteComment(id); } catch (e) { alert("删除失败: " + e.message); } }
}

function formatTime(t) { if (!t) return ""; return new Date(t).toLocaleString("zh-CN"); }

onMounted(() => {
  lastCommentCount = appStore.comments.length;
  // 每2秒轮询新评论
  pollTimer = setInterval(pollComments, 2000);
});
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });
</script>
<style scoped>
.comment-new { animation: fadeIn 0.5s ease; }
@keyframes fadeIn { from { opacity: 0.5; background: #f0fdf4; } to { opacity: 1; background: transparent; } }
</style>
