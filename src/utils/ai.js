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

async function callAI(prompt) {
  if (!aiConfig) { const ok = await loadAIConfig(); if (!ok) return null; }
  const response = await fetch(aiConfig.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + aiConfig.apiKey },
    body: JSON.stringify({
      model: aiConfig.model, temperature: 0.1,
      messages: [
        { role: "system", content: "你是一个校验专家。只输出 JSON，不要附加其他内容。" },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) return null;
  const result = await response.json();
  const text = result.choices[0].message.content;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

/** 校验真实姓名是否合法 */
export async function validateRealName(name) {
  try {
    const result = await callAI(`判断以下姓名是否为真实合理的中文姓名（不接受英文、数字、特殊字符）："${name}"
返回JSON: { valid: true/false, reason: "理由" }`);
    if (result) return result;
  } catch {}
  return { valid: name && /^[\u4e00-\u9fa5]{2,4}$/.test(name), reason: "" };
}

/** 校验手机号格式 */
export function validatePhone(phone) {
  const cleaned = phone.replace(/\s+/g, "");
  return { valid: /^1[3-9]\d{9}$/.test(cleaned), phone: cleaned };
}

/** AI生成短信验证码（模拟） */
export async function generateSMSCode(phone) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[模拟短信] 已向 ${phone} 发送验证码: ${code}`);
  return code;
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
    score, // 0-5
    level: score <= 1 ? "弱" : score <= 3 ? "中" : "强",
    errors,
  };
}

/** 校验公司名和职位 */
export async function validateWithAI(company, title) {
  const prompt = `请判断以下公司名和岗位是否真实存在：
公司: ${company}  岗位: ${title}
返回JSON: { valid: true/false, companyValid: true/false, titleValid: true/false, similarCompany: "", similarTitle: "", reason: "" }`;
  try {
    const result = await callAI(prompt);
    if (result && !result.valid) {
      let msg = result.reason || "信息可能不真实";
      if (result.similarCompany) msg += "。你是否想找: " + result.similarCompany;
      if (result.similarTitle) msg += " / 职位: " + result.similarTitle;
      return { valid: false, message: msg };
    }
  } catch {}
  return { valid: true, message: "" };
}

