// AI 校验工具 - 支持 OpenAI / DeepSeek 等兼容 API
let aiConfig = null;

export async function loadAIConfig() {
  if (aiConfig) return true;
  try {
    const cached = localStorage.getItem("ai_config");
    if (cached) {
      const data = JSON.parse(cached);
      aiConfig = {
        apiKey: data.apiKey,
        model: data.model || "deepseek-chat",
        baseUrl: data.baseUrl || "https://api.deepseek.com/v1",
      };
      return true;
    }
  } catch (e) {}
  try {
    const res = await fetch("https://qwertyuiop-1454067625.cos.ap-guangzhou.myqcloud.com/config/ai-key.json");
    if (res.ok) {
      const data = await res.json();
      aiConfig = {
        apiKey: data.apiKey,
        model: data.model || "deepseek-chat",
        baseUrl: data.baseUrl || "https://api.deepseek.com/v1",
      };
      localStorage.setItem("ai_config", JSON.stringify(data));
      return true;
    }
  } catch (e) {}
  return false;
}

export function getAIConfig() { return aiConfig; }
export function setAIConfig(config) { aiConfig = config; }

export const AI_PROVIDERS = [
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"] },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"] },
];

/** 带超时的 fetch 封装 */
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(prompt) {
  if (!aiConfig) { const ok = await loadAIConfig(); if (!ok) return null; }
  try {
    const response = await fetchWithTimeout(aiConfig.baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + aiConfig.apiKey },
      body: JSON.stringify({
        model: aiConfig.model, temperature: 0.1,
        messages: [
          { role: "system", content: "你是一个校验专家。只输出 JSON，不要附加其他内容。" },
          { role: "user", content: prompt },
        ],
      }),
    }, 8000);
    if (!response.ok) return null;
    const result = await response.json();
    const text = result.choices[0].message.content;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    if (e.name === "AbortError") console.warn("AI请求超时");
    return null;
  }
}

/** 校验真实姓名是否合法 */
export async function validateRealName(name, idNumber) {
  const nameValid = name && /^[\u4e00-\u9fa5]{2,4}$/.test(name);
  if (!nameValid) return { valid: false, reason: "姓名必须为2-4个中文汉字" };
  const idValid = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idNumber);
  if (!idValid) return { valid: false, reason: "身份证号格式不正确（18位）" };
  try {
    const aiResult = await callAI(`你是一个实名认证专家。请判断以下姓名和身份证号是否匹配。
姓名: "${name}"
身份证号: "${idNumber}"
身份证号中出生日期: ${idNumber.substring(6,14)}
注意：如果姓名和身份证号格式都正确，且无明显矛盾（如生日与年龄相符），判定为有效。
返回JSON: { valid: true/false, reason: "理由" }`);
    if (aiResult) return aiResult;
  } catch (e) {}
  return { valid: true, reason: "" };
}

/** 校验手机号格式 */
export function validatePhone(phone) {
  const cleaned = phone.replace(/\s+/g, "");
  return { valid: /^1[3-9]\d{9}$/.test(cleaned), phone: cleaned };
}

/** AI生成短信验证码（模拟） */
export async function generateSMSCode(phone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  console.log("[模拟短信] 已向 " + phone + " 发送验证码: " + code + "（有效期5分钟）");
  return { code, expiresAt, phone };
}

/** AI校验密码强度 */
export function validatePasswordStrength(pwd) {
  const errors = [];
  if (pwd.length < 8) errors.push("至少8位");
  if (!/[A-Z]/.test(pwd)) errors.push("需包含大写字母");
  if (!/[a-z]/.test(pwd)) errors.push("需包含小写字母");
  if (!/[0-9]/.test(pwd)) errors.push("需包含数字");
  if (!/[!@#$%^&*(),.?":{}|<>_]/.test(pwd)) errors.push("需包含特殊字符");
  const score = (pwd.length >= 8 ? 1 : 0) + (/[A-Z]/.test(pwd) ? 1 : 0) + (/[a-z]/.test(pwd) ? 1 : 0) + (/[0-9]/.test(pwd) ? 1 : 0) + (/[!@#$%^&*(),.?":{}|<>_]/.test(pwd) ? 1 : 0);
  return {
    valid: errors.length === 0,
    score,
    level: score <= 1 ? "弱" : score <= 3 ? "中" : "强",
    errors,
  };
}

/** 校验公司名和职位（宽松模式：AI无法查工商库，只拦截明显乱填） */
export async function validateWithAI(company, title) {
  // 本地基础检查：非空、不含乱码符号
  const c = (company || "").trim();
  const t = (title || "").trim();
  if (!c || c.length < 2 || /[\u0000-\u001f\ufffd]/.test(c)) return { valid: false, message: "公司名称格式不正确" };
  if (!t || t.length < 1 || /[\u0000-\u001f\ufffd]/.test(t)) return { valid: false, message: "岗位名称格式不正确" };
  // 明显乱填的拦截
  if (/^[a-zA-Z0-9]{1,3}$/.test(c)) return { valid: false, message: "公司名称过于简短，请填写完整名称" };
  if (!/[\u4e00-\u9fa5A-Za-z0-9]/.test(t)) return { valid: false, message: "岗位名称格式不正确" };

  try {
    const result = await callAI('你是信息审核助手。注意：你无法联网查询工商注册信息，因此不要以"未查询到"为由拒绝。\n请只拦截明显虚假、乱填或恶意信息（例如"abc公司"、"测试测试"、表情符号、无意义字符等）。\n对于正常的中文公司名和岗位名，即使你不认识，也应判定为有效。\n公司: ' + c + '  岗位: ' + t + '\n返回JSON: { valid: true/false, reason: "" }');
    if (result && result.valid === false) {
      let msg = result.reason || "信息格式可疑";
      return { valid: false, message: msg };
    }
  } catch (e) {}
  return { valid: true, message: "" };
}
