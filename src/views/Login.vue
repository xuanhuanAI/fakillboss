<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">🔐 登录</h2>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-sm" :class="loginMode==='pwd'?'btn-primary':'btn-outline'" @click="loginMode='pwd'" style="flex:1">密码登录</button>
        <button class="btn btn-sm" :class="loginMode==='phone'?'btn-primary':'btn-outline'" @click="loginMode='phone'" style="flex:1">手机验证码登录</button>
      </div>

      <!-- 密码登录 -->
      <form v-if="loginMode==='pwd'" @submit.prevent="handlePwdLogin">
        <div class="form-group"><label class="form-label">用户名</label><input v-model="username" class="form-input" placeholder="请输入用户名" required /></div>
        <div class="form-group"><label class="form-label">密码</label><input v-model="password" class="form-input" type="password" placeholder="请输入密码" required /></div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">{{ loading ? "登录中..." : "登录" }}</button>
        <div style="text-align:center;margin-top:12px"><router-link to="/reset-password" style="font-size:13px;color:var(--text-secondary)">忘记密码？</router-link></div>
      </form>

      <!-- 手机验证码登录 -->
      <form v-if="loginMode==='phone'" @submit.prevent="handlePhoneLogin">
        <div class="form-group"><label class="form-label">手机号</label><input v-model="phoneLogin" class="form-input" placeholder="请输入绑定手机号" required maxlength="11" /></div>
        <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1"><label class="form-label">验证码</label><input v-model="phoneCode" class="form-input" placeholder="6位验证码" maxlength="6" required /></div>
          <button type="button" class="btn btn-sm btn-primary" @click="sendPhoneCode" :disabled="codeSending||phoneCountdown>0" style="white-space:nowrap;height:40px">{{ codeSending ? '发送中' : phoneCountdown > 0 ? phoneCountdown+'s' : '获取验证码' }}</button>
        </div>
        <div v-if="phoneLoginError" style="color:var(--danger);font-size:12px;margin-bottom:8px">{{ phoneLoginError }}</div>
        <div v-if="phoneCodeSent" style="font-size:12px;color:var(--success);margin-bottom:8px;background:#f0fdf4;padding:6px 10px;border-radius:6px;border:1px solid #6ee7b7">✅ [模拟] 验证码 <strong style="font-size:16px;letter-spacing:2px">{{ phoneRealCode }}</strong>（5分钟有效）</div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">{{ loading ? "登录中..." : "手机验证登录" }}</button>
      </form>

      <div v-if="error" style="color:var(--danger);font-size:14px;margin-top:12px;text-align:center">{{ error }}</div>
      <div class="auth-footer">还没有账号？<router-link to="/register">立即实名注册</router-link></div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { login, loginByPhone } from "@/utils/auth";
import { validatePhone, generateSMSCode } from "@/utils/ai";

const router = useRouter();
const appStore = useAppStore();

const loginMode = ref("pwd");
const username = ref("");
const password = ref("");
const phoneLogin = ref("");
const phoneCode = ref("");
const error = ref("");
const loading = ref(false);
const phoneLoginError = ref("");
const codeSending = ref(false);
const phoneRealCode = ref("");
const phoneCodeSent = ref(false);
const phoneCountdown = ref(0);
const phoneCodeExpires = ref(0);
let phoneTimer = null;

function startPhoneCD() {
  phoneCountdown.value = 60;
  if (phoneTimer) clearInterval(phoneTimer);
  phoneTimer = setInterval(() => {
    phoneCountdown.value--;
    if (phoneCountdown.value <= 0) { clearInterval(phoneTimer); phoneTimer = null; }
  }, 1000);
}

async function handlePwdLogin() {
  error.value = "";
  loading.value = true;
  try {
    const user = await login(username.value, password.value);
    if (user) { appStore.setUser(user); router.push("/"); }
    else { error.value = "用户名或密码错误"; }
  } catch (e) { error.value = "登录失败: " + e.message; }
  loading.value = false;
}

async function sendPhoneCode() {
  const p = validatePhone(phoneLogin.value);
  if (!p.valid) { phoneLoginError.value = "请输入正确的手机号"; return; }
  phoneLoginError.value = "";
  codeSending.value = true;
  try {
    const result = await generateSMSCode(p.phone);
    phoneRealCode.value = result.code;
    phoneCodeExpires.value = result.expiresAt;
    phoneCodeSent.value = true;
    startPhoneCD();
  } catch (e) { phoneLoginError.value = "发送失败: " + e.message; }
  codeSending.value = false;
}

async function handlePhoneLogin() {
  error.value = "";
  phoneLoginError.value = "";
  if (!phoneCodeSent.value || !phoneCode.value) { phoneLoginError.value = "请先获取验证码"; return; }
  if (Date.now() > phoneCodeExpires.value) { phoneLoginError.value = "验证码已过期，请重新获取"; return; }
  if (phoneCode.value !== phoneRealCode.value) { phoneLoginError.value = "验证码错误"; return; }
  loading.value = true;
  try {
    const p = validatePhone(phoneLogin.value);
    const user = await loginByPhone(p.phone);
    appStore.setUser(user);
    router.push("/");
  } catch (e) { error.value = e.message; }
  loading.value = false;
}
</script>
