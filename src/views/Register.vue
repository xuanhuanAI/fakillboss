<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">📝 实名注册</h2>
      <form @submit.prevent="handleRegister">
        <!-- 真实姓名 -->
        <div class="form-group">
          <label class="form-label">真实姓名 *</label>
          <input v-model="realName" class="form-input" placeholder="输入真实姓名（用于实名认证）" required @input="nameChecked=false" />
          <div v-if="nameCheckMsg" style="margin-top:4px;font-size:12px;color:var(--danger)">{{ nameCheckMsg }}</div>
        </div>
        <!-- 手机号 -->
        <div class="form-group">
          <label class="form-label">手机号 *</label>
          <input v-model="phone" class="form-input" placeholder="输入手机号" required maxlength="11" @input="phoneChecked=false;smsSent=false" />
          <div v-if="phoneError" style="margin-top:4px;font-size:12px;color:var(--danger)">{{ phoneError }}</div>
        </div>
        <!-- 短信验证码 -->
        <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1">
            <label class="form-label">短信验证码 *</label>
            <input v-model="smsCode" class="form-input" placeholder="输入6位验证码" maxlength="6" required />
          </div>
          <button type="button" class="btn btn-sm" :class="smsSent?'btn-outline':'btn-primary'" @click="sendSMSCode" :disabled="smsSending||countdown>0" style="white-space:nowrap;height:40px">
            {{ smsSending ? '发送中...' : countdown > 0 ? countdown+'s' : smsSent ? '重新获取' : '获取验证码' }}
          </button>
        </div>
        <div v-if="smsError" style="margin-top:4px;font-size:12px;color:var(--danger);margin-bottom:8px">{{ smsError }}</div>
        <div v-if="smsSent" style="font-size:12px;color:var(--success);margin-bottom:4px;background:#f0fdf4;padding:6px 10px;border-radius:6px;border:1px solid #6ee7b7">✅ [模拟] 验证码 <strong style="font-size:16px;letter-spacing:2px">{{ realCode }}</strong>（有效期5分钟，60秒后可重新获取）</div>
        <!-- 用户名 -->
        <div class="form-group">
          <label class="form-label">用户名 *</label>
          <input v-model="username" class="form-input" placeholder="设置用户名（唯一）" required />
        </div>
        <!-- 昵称 -->
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input v-model="nickname" class="form-input" placeholder="昵称（可选）" />
        </div>
        <!-- 密码 -->
        <div class="form-group">
          <label class="form-label">密码 *</label>
          <input v-model="password" class="form-input" type="password" placeholder="至少8位，包含大小写字母+数字+特殊字符" required @input="checkPwd" />
          <div v-if="pwdLevel" style="margin-top:4px">
            <div style="display:flex;gap:4px;align-items:center">
              <div v-for="i in 5" :key="i" style="width:18%;height:4px;border-radius:2px;background: i <= pwdScore ? (pwdScore<=2?'var(--danger)':pwdScore<=3?'var(--warning)':'var(--success)') : '#e5e7eb'"></div>
              <span style="font-size:11px;margin-left:4px;color:var(--text-secondary)">{{ pwdLevel }} ({{ pwdScore }}/5)</span>
            </div>
            <div v-if="pwdErrors.length" style="font-size:11px;color:var(--danger);margin-top:2px">{{ pwdErrors.join("、") }}</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">确认密码 *</label>
          <input v-model="confirmPassword" class="form-input" type="password" placeholder="再次输入密码" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? "注册中..." : "实名注册" }}
        </button>
      </form>
      <div v-if="aiChecking" style="text-align:center;margin-top:12px;font-size:13px;color:var(--primary)">🤖 AI实名校验中...</div>
      <div v-if="error" style="color:var(--danger);font-size:14px;margin-top:12px;text-align:center">{{ error }}</div>
      <div class="auth-footer">已有账号？<router-link to="/login">立即登录</router-link></div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { register } from "@/utils/auth";
import { validateRealName, validatePhone, generateSMSCode, validatePasswordStrength } from "@/utils/ai";
const router = useRouter();
const appStore = useAppStore();
const username = ref(""); const nickname = ref(""); const password = ref(""); const confirmPassword = ref("");
const realName = ref(""); const phone = ref(""); const smsCode = ref("");
const error = ref(""); const loading = ref(false); const aiChecking = ref(false);
const nameChecked = ref(false); const nameCheckMsg = ref("");
const phoneError = ref(""); const phoneChecked = ref(false);
const smsSending = ref(false); const smsSent = ref(false); const smsError = ref("");
const realCode = ref(""); const codeExpiresAt = ref(0);
const countdown = ref(0); let countdownTimer = null;
function startCountdown() { countdown.value = 60; if (countdownTimer) clearInterval(countdownTimer); countdownTimer = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(countdownTimer); countdownTimer = null; } }, 1000); }

const pwdLevel = ref(""); const pwdScore = ref(0); const pwdErrors = ref([]);

function checkPwd() {
  const r = validatePasswordStrength(password.value);
  pwdScore.value = r.score; pwdLevel.value = r.level; pwdErrors.value = r.errors;
}

async function sendSMSCode() {
    const p = validatePhone(phone.value);
    if (!p.valid) { phoneError.value = "请输入正确的11位手机号"; return; }
    phoneError.value = ""; smsError.value = ""; smsSending.value = true;
    try {
      const result = await generateSMSCode(p.phone);
      realCode.value = result.code;
      codeExpiresAt.value = result.expiresAt;
      smsSent.value = true;
      startCountdown();
    } catch (e) { smsError.value = "发送失败: " + e.message; }
    smsSending.value = false;
  }

async function handleRegister() {
  error.value = "";
  // 验证姓名
  if (!nameChecked.value) {
    const nameResult = await validateRealName(realName.value);
    if (!nameResult.valid) { error.value = "实名认证未通过: " + (nameResult.reason || "姓名不合法"); return; }
    nameChecked.value = true;
  }
  // 验证手机
  const p = validatePhone(phone.value);
  if (!p.valid) { error.value = "手机号格式不正确"; return; }
  phoneChecked.value = true;
  // 验证短信验证码
  if (!smsSent.value || !smsCode.value) { error.value = "请先获取短信验证码"; return; }
  if (Date.now() > codeExpiresAt.value) { error.value = "验证码已过期，请重新获取"; return; }
  if (smsCode.value !== realCode.value) { error.value = "验证码错误"; return; }
  // 验证密码一致性
  if (password.value !== confirmPassword.value) { error.value = "两次密码不一致"; return; }
  // 验证密码强度
  const pwdR = validatePasswordStrength(password.value);
  if (!pwdR.valid) { error.value = "密码强度不足: " + pwdR.errors.join("、"); return; }
  // AI实名校验
  aiChecking.value = true;
  try {
    const nr = await validateRealName(realName.value);
    if (!nr.valid) { error.value = "AI实名认证未通过: " + (nr.reason || "姓名不合法"); aiChecking.value = false; return; }
  } catch (e) { console.warn("AI校验失败:", e.message); }
  aiChecking.value = false;

  loading.value = true;
  try {
    const user = await register(username.value, password.value, nickname.value, realName.value, p.phone);
    appStore.setUser(user);
    router.push("/");
  } catch (e) { error.value = e.message; }
  loading.value = false;
}
</script>





