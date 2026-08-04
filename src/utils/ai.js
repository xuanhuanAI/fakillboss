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
        provider: data.provider || "deepseek",
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
        provider: data.provider || "deepseek",
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
  { name: "智谱GLM（联网搜索）", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4-flash", "glm-4-air", "glm-4-plus"] },
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

async function callAI(prompt, options = {}) {
  if (!aiConfig) { const ok = await loadAIConfig(); if (!ok) return null; }
  const body = {
    model: aiConfig.model, temperature: 0.1,
    messages: [
      { role: "system", content: "你是一个校验专家。只输出 JSON，不要附加其他内容。" },
      { role: "user", content: prompt },
    ],
  };
  // 智谱联网搜索模式：启用 web_search 工具
  if (aiConfig.provider === "zhipu" && options.searchQuery) {
    body.tools = [
      { type: "web_search", web_search: { enable: true, search_query: options.searchQuery } },
    ];
  }
  const timeoutMs = options.searchQuery ? 25000 : 8000;
  try {
    const response = await fetchWithTimeout(aiConfig.baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + aiConfig.apiKey },
      body: JSON.stringify(body),
    }, timeoutMs);
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

/** 常见公司组织形式后缀 */
const COMPANY_SUFFIXES = [
  "有限责任公司", "股份有限公司", "有限公司", "集团", "公司",
  "工作室", "中心", "工厂", "厂", "事务所", "商行",
  "合作社", "研究院", "研究所", "医院", "学校", "银行",
  "证券", "保险", "基金会", "协会", "商会",
];

/** 明显乱填/测试关键词 */
const FAKE_WORDS = [
  "测试", "演示", "示例", "随便", "某某", "哈哈", "呵呵",
  "测试测试", "test", "demo", "假的", "虚构", "乱写",
  "阿斯顿", "撒大声地", "asdf", "qwerty", "abc", "123",
];

/** ===== 自建联网搜索（爬虫 + 代理，免费） ===== */

/** 从必应搜索结果 HTML 中解析标题、链接、摘要 */
function parseBingResults(html) {
  const items = [];
  // 匹配 <li class="b_algo">...</li> 块
  const blocks = html.match(/<li[^>]*class="b_algo"[^>]*>[\s\S]*?<\/li>/g) || [];
  for (const block of blocks) {
    const titleMatch = block.match(/<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h2>/i);
    if (!titleMatch) continue;
    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (title) items.push({ title, url, snippet });
  }
  return items;
}

/** 通过免费 CORS 代理抓取必应搜索结果 */
async function searchCompanyWeb(company) {
  const q = encodeURIComponent(company);
  const searchUrl = "https://cn.bing.com/search?q=" + q + "&setlang=zh-CN&count=10";
  const proxies = [
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  ];
  for (const buildProxy of proxies) {
    try {
      const res = await fetchWithTimeout(buildProxy(searchUrl), {}, 12000);
      if (!res.ok) continue;
      const html = await res.text();
      if (!html || html.includes("请输入验证码") || html.includes("b_verification")) continue;
      const items = parseBingResults(html);
      if (items.length > 0) return items;
    } catch (e) {
      console.warn("自建搜索代理失败:", e.message);
    }
  }
  return [];
}

/** 校验公司名和职位：本地规则 + AI 双重校验 */
export async function validateWithAI(company, title) {
  const c = (company || "").trim();
  const t = (title || "").trim();

  // ===== 本地规则校验 =====
  if (!c) return { valid: false, message: "请输入公司名称" };
  if (!t) return { valid: false, message: "请输入岗位名称" };
  if (c.length < 4) return { valid: false, message: "公司名称过短，请填写完整工商注册名称" };
  if (c.length > 50) return { valid: false, message: "公司名称过长，请检查是否填写正确" };

  // 必须包含常见组织形式后缀
  const hasSuffix = COMPANY_SUFFIXES.some((s) => c.includes(s));
  if (!hasSuffix) {
    return { valid: false, message: "公司名称格式不规范，请填写包含“有限公司/集团/工作室/中心”等字样的完整名称" };
  }

  // 拦截明显乱填词
  const lowerC = c.toLowerCase();
  for (const w of FAKE_WORDS) {
    if (lowerC.includes(w.toLowerCase())) {
      return { valid: false, message: "公司名称包含疑似测试或乱填内容，请核实后重新填写" };
    }
  }
  for (const w of FAKE_WORDS) {
    if (t.toLowerCase().includes(w.toLowerCase())) {
      return { valid: false, message: "岗位名称包含疑似测试或乱填内容，请核实后重新填写" };
    }
  }

  // 岗位名不能是纯叠字或无意义字符
  if (!/[\u4e00-\u9fa5A-Za-z]/.test(t)) return { valid: false, message: "岗位名称格式不正确" };
  if (t.length > 30) return { valid: false, message: "岗位名称过长，请检查是否填写正确" };

  // ===== AI 校验 =====
  // 联网搜索模式（智谱GLM）：真实搜索公司名，搜到=真实，搜不到=存疑
  if (aiConfig && aiConfig.provider === "zhipu") {
    return await validateCompanyWithSearch(c, t);
  }
  // 自建联网搜索模式（DeepSeek/OpenAI + 免费搜索代理）
  const searchResults = await searchCompanyWeb(c);
  if (searchResults.length > 0) {
    // 把搜索结果喂给 AI 判断
    const snippets = searchResults.slice(0, 5).map((r, i) => (i + 1) + ". " + r.title + " - " + r.url + (r.snippet ? " | " + r.snippet : "")).join("\n");
    try {
      const result = await callAI('你是企业信息审核助手。以下是搜索引擎返回的“' + c + '”相关结果：\n' + snippets + '\n请判断：\n1. 搜索结果中是否有与公司名匹配的真实信息（官网、招聘、新闻、工商记录、企业查询平台等）。\n2. 如果搜索到了该公司信息 → valid: true。\n3. 如果搜索结果明显不相关或全是无关内容 → valid: false。\n4. 岗位名称“' + t + '”是否像真实职业。\n返回JSON: { valid: true/false, reason: "简短理由" }');
      if (result && result.valid === false) {
        return { valid: false, message: result.reason || "搜索结果不相关，该公司可能不存在" };
      }
      if (result && result.valid === true) return { valid: true, message: "" };
    } catch (e) {}
  }

  // 离线模式（搜索失败时的回退）：按命名规范判断
  try {
    const result = await callAI('你是公司信息审核助手。你无法联网查询工商注册库，因此不要以"未查询到"为由拒绝。\n请根据以下规则判断：\n1. 公司名称是否符合中国工商注册命名规范（行政区划+字号+行业+组织形式，如“郑州天桥电子商务有限公司”）。\n2. 公司名称是否完整（必须含“有限公司/集团/工作室/中心/厂”等组织形式字样）。\n3. 岗位名称是否像真实的职业/岗位（如“前端开发工程师”“销售经理”），而不是乱填（如“打酱油”“睡觉”“王八”等）。\n4. 是否有明显虚假、低俗、恶意或广告性质的内容。\n只要名称规范、岗位合理，即使你不认识这家公司，也应判定为有效。\n公司: ' + c + '\n岗位: ' + t + '\n返回JSON: { valid: true/false, reason: "简短理由" }');
    if (result && result.valid === false) {
      return { valid: false, message: result.reason || "信息疑似不真实" };
    }
  } catch (e) {}
  return { valid: true, message: "" };
}

/** 联网搜索校验公司真实性（智谱GLM web_search） */
async function validateCompanyWithSearch(company, title) {
  try {
    const result = await callAI('你是一个企业信息审核助手。请根据刚才联网搜索到的结果判断：\n1. 是否搜索到了与公司名一致的真实信息（官网、新闻报道、招聘信息、工商记录、企业查询平台等）。\n2. 只要搜索到了该公司的相关公开信息 → valid: true。\n3. 完全没有搜索到该公司的任何信息 → valid: false，reason 写“未搜索到该公司的公开信息，可能为虚构”。\n4. 同时判断岗位名称是否像真实职业（如“前端开发工程师”），不是乱填。\n公司: ' + company + '\n岗位: ' + title + '\n返回JSON: { valid: true/false, reason: "简短理由" }', { searchQuery: company });
    if (result && result.valid === true) return { valid: true, message: "" };
    if (result && result.valid === false) {
      return { valid: false, message: result.reason || "未搜索到该公司的公开信息" };
    }
    return { valid: true, message: "" };
  } catch (e) {
    console.warn("联网校验失败:", e.message);
    return { valid: true, message: "" };
  }
}
