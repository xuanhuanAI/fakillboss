<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">🔑 找回密码</h2>
      <div v-if="step === 1">
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">输入绑定的手机号，AI将发送验证码</p>
        <div class="form-group"><label class="form-label">手机号</label><input v-model="phone" class="form-input" placeholder="输入绑定的手机号" required /></div>
        <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1"><label class="form-label">验证码</label><input v-model="smsCode" class="form-input" placeholder="6位验证码" maxlength="6" required /></div>
          <button type="button" class="btn btn-sm btn-primary" @click="sendResetCode" :disabled="sending||cd>0" style="white-space:nowrap;height:40px">{{ sending ? '发送中' : cd > 0 ? cd+'s' : '获取验证码' }}</button>
        </div>
        <div v-if="smsError" style="color:var(--danger);font-size:12px;margin-bottom:8px">{{ smsError }}</div>
        <button class="btn btn-primary" style="width:100%" @click="verifyCode" :disabled="!smsCode">验证身份</button>
      </div>
      <div v-if="step === 2">
        <p style="font-size:14px;color:var(--success);margin-bottom:16px">✅ 身份验证通过，请设置新密码</p>
        <div class="form-group"><label class="form-label">新密码</label><input v-model="newPassword" class="form-input" type="password" placeholder="至少8位，包含大小写字母+数字+特殊字符" required @input="checkPwd" /></div>
        <div v-if="pwdLevel" style="font-size:12px;margin-bottom:8px">
          <span :style="{color:pwdScore<=2?'var(--danger)':pwdScore<=3?'var(--warning)':'var(--success)'}">{{ pwdLevel }} ({{ pwdScore }}/5)</span>
          <span v-if="pwdErrors.length" style="color:var(--danger);margin-left:4px">{{ pwdErrors.join("、") }}</span>
        </div>
        <div class="form-group"><label class="form-label">确认新密码</label><input v-model="confirmPwd" class="form-input" type="password" placeholder="再次输入新密码" required /></div>
        <button class="btn btn-primary" style="width:100%" @click="resetPwd" :disabled="resetting">{{ resetting ? '重置中...' : '重置密码' }}</button>
      </div>
      <div v-if="error" style="color:var(--danger);font-size:14px;margin-top:12px;text-align:center">{{ error }}</div>
      <div v-if="success" style="color:var(--success);font-size:14px;margin-top:12px;text-align:center">{{ success }}</div>
      <div class="auth-footer"><router-link to="/login">返回登录</router-link></div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { validatePhone, generateSMSCode, validatePasswordStrength } from "@/utils/ai";
import { resetPasswordByPhone } from "@/utils/auth";
const router = useRouter();
const step = ref(1); const phone = ref(""); const smsCode = ref("");
const newPassword = ref(""); const confirmPwd = ref("");
const error = ref(""); const success = ref("");
const sending = ref(false); const smsError = ref("");
const resetting = ref(false);
const realCode = ref("");
const codeExpires = ref(0);
const cd = ref(0); let cdTimer = null;
function startCD() { cd.value = 60; if (cdTimer) clearInterval(cdTimer); cdTimer = setInterval(() => { cd.value--; if (cd.value <= 0) { clearInterval(cdTimer); cdTimer = null; } }, 1000); }
const pwdLevel = ref(""); const pwdScore = ref(0); const pwdErrors = ref([]);

function checkPwd() { const r = validatePasswordStrength(newPassword.value); pwdScore.value = r.score; pwdLevel.value = r.level; pwdErrors.value = r.errors; }

async function sendResetCode() {
  const p = validatePhone(phone.value); if (!p.valid) { smsError.value = "请输入正确的手机号"; return; }
  smsError.value = ""; sending.value = true;
  realCode.value = await generateSMSCode(p.phone);
  sending.value = false;
}

async function verifyCode() {
  error.value = "";
  if (Date.now() > codeExpires.value) { error.value = "验证码已过期，请重新获取"; return; }
  if (smsCode.value !== realCode.value) { error.value = "验证码错误"; return; }
  step.value = 2;
}

async function resetPwd() {
  error.value = ""; success.value = "";
  if (newPassword.value !== confirmPwd.value) { error.value = "两次密码不一致"; return; }
  const r = validatePasswordStrength(newPassword.value);
  if (!r.valid) { error.value = "密码强度不足: " + r.errors.join("、"); return; }
  resetting.value = true;
  try {
    const p = validatePhone(phone.value);
    await resetPasswordByPhone(p.phone, newPassword.value);
    success.value = "✅ 密码已重置，请用新密码登录";
    setTimeout(() => router.push("/login"), 2000);
  } catch (e) { error.value = e.message; }
  resetting.value = false;
}
</script>

