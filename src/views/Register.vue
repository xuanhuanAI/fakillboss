<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">📝 注册</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input v-model="username" class="form-input" placeholder="请设置用户名" required />
        </div>
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input v-model="nickname" class="form-input" placeholder="请设置昵称（可选）" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="password" class="form-input" type="password" placeholder="请设置密码" required minlength="4" />
        </div>
        <div class="form-group">
          <label class="form-label">确认密码</label>
          <input v-model="confirmPassword" class="form-input" type="password" placeholder="请再次输入密码" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
      <div v-if="error" style="color: var(--danger); font-size: 14px; margin-top: 12px; text-align: center;">
        {{ error }}
      </div>
      <div class="auth-footer">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { register } from '@/utils/auth';

const router = useRouter();
const appStore = useAppStore();
const username = ref('');
const nickname = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  if (password.value !== confirmPassword.value) {
    error.value = '两次密码不一致';
    return;
  }
  if (password.value.length < 4) {
    error.value = '密码至少4位';
    return;
  }
  loading.value = true;
  try {
    const user = await register(username.value, password.value, nickname.value);
    appStore.setUser(user);
    router$.push('/');
  } catch (e) {
    error.value = e.message;
  }
  loading.value = false;
}
</script>
