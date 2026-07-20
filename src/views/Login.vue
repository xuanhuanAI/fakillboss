<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">🔐 登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input v-model="username" class="form-input" placeholder="请输入用户名" required />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="password" class="form-input" type="password" placeholder="请输入密码" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      <div v-if="error" style="color: var(--danger); font-size: 14px; margin-top: 12px; text-align: center;">
        {{ error }}
      </div>
      <div class="auth-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
      <div style="margin-top: 12px; padding: 8px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: var(--text-secondary); text-align: center;">
        管理员: admin / admin123
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { login } from '@/utils/auth';

const router = useRouter();
const appStore = useAppStore();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const user = await login(username.value, password.value);
    if (user) {
      appStore.setUser(user);
      router$.push('/');
    } else {
      error.value = '用户名或密码错误';
    }
  } catch (e) {
    error.value = '登录失败: ' + e.message;
  }
  loading.value = false;
}
</script>
