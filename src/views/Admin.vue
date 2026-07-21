<template>
  <div>
    <div class="page-header"><h1>⚙️ 管理后台</h1></div>
    <div class="admin-layout">
      <div class="admin-sidebar">
        <div v-for="item in menuItems" :key="item.key" class="admin-sidebar-item" :class="{active: currentTab === item.key}" @click="currentTab = item.key"><span>{{ item.icon }}</span> {{ item.label }}</div>
      </div>
      <div class="admin-content">

        <div v-if="currentTab === 'overview'">
          <h3>📊 概览</h3>
          <div :style="{padding:'8px 12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px',background:cosConnected?'#ecfdf5':'#fef2f2',color:cosConnected?'#065f46':'#991b1b'}">COS状态：{{ cosConnected ? '✅ 已连接' : '❌ 未连接' }}<span v-if="!cosConnected">（请到 COS配置 页设置密钥）</span></div>
          <p>👍 好工作: <strong>{{ appStore.jobs.good.length }}</strong> 条</p>
          <p>👌 中等: <strong>{{ appStore.jobs.medium.length }}</strong> 条</p>
          <p>⚠️ 避雷: <strong>{{ appStore.jobs.bad.length }}</strong> 条</p>
          <p>💬 评论: <strong>{{ appStore.comments.length }}</strong> 条</p>
          <p>🏢 已收录公司: <strong>{{ appStore.companies.length }}</strong> 个</p>
          <p>📌 已收录职位: <strong>{{ appStore.jobTitles.length }}</strong> 个</p>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
            <button class="btn btn-primary" @click="syncAll" :disabled="syncing || !cosConnected">{{ syncing ? '⏳ 同步中...' : '🔄 强制同步所有数据到COS' }}</button>
            <div v-if="syncResult" style="margin-top:8px;padding:8px 12px;background:#ecfdf5;color:#065f46;border-radius:8px;font-size:13px">{{ syncResult }}</div>
            <div v-if="syncError" style="margin-top:8px;padding:8px 12px;background:#fef2f2;color:#991b1b;border-radius:8px;font-size:13px">{{ syncError }}</div>
          </div>
        </div>

        <div v-if="currentTab === 'content'">
          <h3>📋 内容管理</h3>
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn btn-sm" :class="contentFilter === 'all' ? 'btn-primary' : 'btn-outline'" @click="contentFilter = 'all'">全部</button>
            <button class="btn btn-sm" :class="contentFilter === 'good' ? 'btn-success' : 'btn-outline'" @click="contentFilter = 'good'">好工作</button>
            <button class="btn btn-sm" :class="contentFilter === 'medium' ? 'btn-warning' : 'btn-outline'" @click="contentFilter = 'medium'">中等</button>
            <button class="btn btn-sm" :class="contentFilter === 'bad' ? 'btn-danger' : 'btn-outline'" @click="contentFilter = 'bad'">避雷</button>
          </div>
          <div v-if="filteredContent.length === 0"><p>暂无内容</p></div>
          <div v-for="item in filteredContent" :key="item.id + item.type" style="border:1px solid #eee;padding:12px;margin-bottom:8px;border-radius:8px"><strong>{{ item.title }}</strong> @ {{ item.company }}<button class="btn btn-danger btn-sm" style="float:right" @click="deleteContent(item)">删除</button><div style="font-size:12px;color:#999">{{ item.author }} | {{ formatTime(item.createdAt) }}</div></div>
        </div>

        <div v-if="currentTab === 'companies'">
          <h3>🏢 公司管理</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">只有收录的公司才能被发布。</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
            <label class="form-label">批量添加</label>
            <textarea v-model="bulkText" class="form-textarea" placeholder="腾讯科技&#10;阿里巴巴&#10;字节跳动, 美团" style="min-height:80px;margin-bottom:8px"></textarea>
            <button class="btn btn-primary btn-sm" @click="addBulk" :disabled="!bulkText.trim()">批量添加</button><span v-if="bulkStatus" style="margin-left:8px;font-size:13px">{{ bulkStatus }}</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px"><input v-model="newCompany" class="form-input" placeholder="输入公司名称" @keyup.enter="addSingle" /><button class="btn btn-success btn-sm" @click="addSingle" :disabled="!newCompany.trim()">添加</button></div>
          <div v-if="companyError" style="color:var(--danger);font-size:13px;margin-bottom:8px">{{ companyError }}</div>
          <div v-if="appStore.companies.length === 0" style="text-align:center;padding:30px;color:var(--text-secondary)">还没有收录任何公司</div>
          <div v-else style="max-height:400px;overflow-y:auto"><div v-for="c in sortedCompanies" :key="c.name" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border)"><span>{{ c.name }}</span><button class="btn btn-danger btn-sm" @click="removeCompany(c.name)">删除</button></div></div>
        </div>

        <div v-if="currentTab === 'titles'">
          <h3>📌 职位管理</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">只有收录的职位才能被发布。已预置常见职位。</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
            <label class="form-label">批量添加</label>
            <textarea v-model="titleBulkText" class="form-textarea" placeholder="前端工程师&#10;产品经理, 数据分析" style="min-height:80px;margin-bottom:8px"></textarea>
            <button class="btn btn-primary btn-sm" @click="addTitleBulk" :disabled="!titleBulkText.trim()">批量添加</button><span v-if="titleBulkStatus" style="margin-left:8px;font-size:13px">{{ titleBulkStatus }}</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px"><input v-model="newTitle" class="form-input" placeholder="输入职位名称" @keyup.enter="addTitleSingle" /><button class="btn btn-success btn-sm" @click="addTitleSingle" :disabled="!newTitle.trim()">添加</button></div>
          <div v-if="titleError" style="color:var(--danger);font-size:13px;margin-bottom:8px">{{ titleError }}</div>
          <div v-if="appStore.jobTitles.length === 0" style="text-align:center;padding:30px;color:var(--text-secondary)">还没有收录任何职位</div>
          <div v-else style="max-height:400px;overflow-y:auto"><div v-for="t in sortedTitles" :key="t.name" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border)"><span>{{ t.name }}</span><button class="btn btn-danger btn-sm" @click="removeTitle(t.name)">删除</button></div></div>
        </div>

        <!-- AI配置 -->
        <div v-if="currentTab === 'ai'">
          <h3>🤖 AI校验配置</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">配置 AI API 密钥后，用户上传公司工作时自动进行 AI 校验。</p>
          <form @submit.prevent="saveAIConfig">
            <div class="form-group"><label class="form-label">AI 提供商</label>
              <select v-model="aiForm.provider" class="form-select" @change="onProviderChange">
                <option value="deepseek">DeepSeek（推荐）</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">API Key</label><input v-model="aiForm.apiKey" class="form-input" type="password" /></div>
            <div class="form-group"><label class="form-label">接口地址</label><input v-model="aiForm.baseUrl" class="form-input" /></div>
            <div class="form-group"><label class="form-label">模型</label><input v-model="aiForm.model" class="form-input" /></div>
            <button type="submit" class="btn btn-primary" :disabled="aiSaving">{{ aiSaving ? '保存中...' : '保存并启用AI校验' }}</button>
          </form>
          <div v-if="aiStatus" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--success);color:white">{{ aiStatus }}</div>
          <div v-if="aiError" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--danger);color:white">{{ aiError }}</div>
        </div>

        <div v-if="currentTab === 'cos'">
          <h3>☁ COS配置</h3>
          <div :style="{padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',background:cosConnected?'#ecfdf5':'#fefce8',border:'1px solid '+(cosConnected?'#6ee7b7':'#fde68a'),color:cosConnected?'#065f46':'#92400e'}">{{ cosConnected ? '✅ COS已连接' : '请先在腾讯云获取 SecretId 和 SecretKey' }}<br><small v-if="cosConnected">Bucket: {{ bucketName }} | Region: {{ bucketRegion }}</small></div>
          <form @submit.prevent="saveCOSConfig">
            <div class="form-group"><label class="form-label">SecretId</label><input v-model="cosConfig.SecretId" class="form-input" /></div>
            <div class="form-group"><label class="form-label">SecretKey</label><input v-model="cosConfig.SecretKey" class="form-input" type="password" /></div>
            <div class="form-group"><label class="form-label">Bucket</label><input v-model="cosConfig.Bucket" class="form-input" /></div>
            <div class="form-group"><label class="form-label">Region</label><select v-model="cosConfig.Region" class="form-select"><option value="ap-guangzhou">广州</option><option value="ap-shanghai">上海</option><option value="ap-beijing">北京</option></select></div>
            <button type="submit" class="btn btn-primary" :disabled="cosSaving">{{ cosSaving ? '保存中...' : '保存并初始化COS' }}</button>
          </form>
          <div v-if="cosStatus" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--success);color:white">{{ cosStatus }}</div>
          <div v-if="cosError" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--danger);color:white">{{ cosError }}</div>
        </div>

        <div v-if="currentTab === 'settings'">
          <h3>🎨 站点设置</h3>
          <form @submit.prevent="saveSettings">
            <div class="form-group"><label class="form-label">背景图片URL</label><input v-model="appStore.siteConfig.backgroundImage" class="form-input" placeholder="输入背景图片URL" /></div>
            <div class="form-group"><label class="form-label">主题色</label><input v-model="appStore.siteConfig.primaryColor" class="form-input" style="width:120px" /></div>
            <button type="submit" class="btn btn-primary">保存设置</button>
          </form>
          <div v-if="settingsStatus" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--success);color:white">{{ settingsStatus }}</div>
          <div v-if="settingsError" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--danger);color:white">{{ settingsError }}</div>
        </div>

      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useAppStore } from "@/stores/app"
import { getCOSConfig, initCOS, isCOSReady, loadSavedConfig } from "@/utils/cos"

const appStore = useAppStore()
const currentTab = ref("overview")
const contentFilter = ref("all")
const cosSaving = ref(false)
const cosStatus = ref("")
const cosError = ref(""
const cosConnected = computed(() => isCOSReady())
const bucketName = computed(() => getCOSConfig().Bucket)
const bucketRegion = computed(() => getCOSConfig().Region)
const saved = loadSavedConfig()
const cosConfig = ref({
  SecretId: saved?.SecretId || "",
  SecretKey: saved?.SecretKey || "",
  Bucket: saved?.Bucket || getCOSConfig().Bucket,
  Region: saved?.Region || getCOSConfig().Region
}))
const settingsStatus = ref("")
const settingsError = ref("")
const syncing = ref(false)
const syncResult = ref("")
const syncError = ref("")
const newCompany = ref("")
const bulkText = ref("")
const companyError = ref("")
const bulkStatus = ref("")
const newTitle = ref("")
const titleBulkText = ref("")
const titleError = ref("")
const titleBulkStatus = ref("")

// AI配置
const aiForm = ref({ apiKey: "", model: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1", provider: "deepseek" })

// 加载已保存的AI配置（localStorage兜底，再尝试从COS读取）
async function loadAIConfig() {
  // 1. 先从localStorage读取缓存
  try {
    const cached = localStorage.getItem("ai_config");
    if (cached) {
      const cfg = JSON.parse(cached);
      Object.assign(aiForm.value, cfg);
    }
  } catch(e) {}
  // 2. 如果有COS权限，从COS读取最新配置覆盖
  try {
    const { getCOSData } = await import("@/utils/cos");
    const data = await getCOSData("config/ai-key.json");
    if (data) {
      aiForm.value.apiKey = data.apiKey || "";
      aiForm.value.model = data.model || "deepseek-chat";
      aiForm.value.baseUrl = data.baseUrl || "https://api.deepseek.com/v1";
      aiForm.value.provider = data.provider || "deepseek";
      // 同步到 localStorage 缓存
      localStorage.setItem("ai_config", JSON.stringify(aiForm.value));
    }
  } catch(e) { /* 无COS权限，使用localStorage缓存 */ }
}
const aiSaving = ref(false)
const aiStatus = ref("")
const aiError = ref("")

const cosConnected = computed(() => isCOSReady())
const bucketName = computed(() => getCOSConfig().Bucket)
const bucketRegion = computed(() => getCOSConfig().Region)
const AI_PROVIDERS = {
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
}
function onProviderChange() { const p = AI_PROVIDERS[aiForm.value.provider]; if (p) { aiForm.value.baseUrl = p.baseUrl; aiForm.value.model = p.model } }

const sortedCompanies = computed(() => [...appStore.companies].sort((a,b)=>a.name.localeCompare(b.name,"zh")))
const sortedTitles = computed(() => [...appStore.jobTitles].sort((a,b)=>a.name.localeCompare(b.name,"zh")))

// 页面加载和切换到AI标签时自动加载配置
onMounted(() => { loadAIConfig(); });
watch(currentTab, (tab) => { if (tab === "ai") loadAIConfig(); })

const menuItems = [
  {key:"overview", icon:"📊", label:"概览"}, {key:"content", icon:"📋", label:"内容管理"},
  {key:"companies", icon:"🏢", label:"公司管理"}, {key:"titles", icon:"📌", label:"职位管理"},
  {key:"ai", icon:"🤖", label:"AI配置"}, {key:"cos", icon:"☁", label:"COS配置"},
  {key:"settings", icon:"🎨", label:"站点设置"}
]

const filteredContent = computed(() => {
  const items = []
  for (const t of ["good","medium","bad"])
    if (contentFilter.value === "all" || contentFilter.value === t)
      for (const job of appStore.jobs[t]) items.push({...job, type: t})
  return items.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
})

async function deleteContent(item) { if (confirm("确定删除「"+item.title+"」？")) { try { await appStore.deleteJob(item.type, item.id) } catch(e) { alert("删除失败: "+e.message) } } }

async function addSingle() { companyError.value = ""; try { await appStore.addCompany(newCompany.value); newCompany.value = "" } catch(e) { companyError.value = e.message } }
async function addBulk() { bulkStatus.value = ""; try { const c=await appStore.addCompaniesBulk(bulkText.value); bulkStatus.value="✅ 成功添加 "+c+" 个公司"; bulkText.value="" } catch(e) { bulkStatus.value="❌ "+e.message } }
async function removeCompany(n) { if (confirm("确定删除「"+n+"」？")) { await appStore.removeCompany(n) } }

async function addTitleSingle() { titleError.value = ""; try { await appStore.addJobTitle(newTitle.value); newTitle.value="" } catch(e) { titleError.value=e.message } }
async function addTitleBulk() { titleBulkStatus.value=""; try { const c=await appStore.addJobTitlesBulk(titleBulkText.value); titleBulkStatus.value="✅ 成功添加 "+c+" 个职位"; titleBulkText.value="" } catch(e) { titleBulkStatus.value="❌ "+e.message } }
async function removeTitle(n) { if (confirm("确定删除「"+n+"」？")) { await appStore.removeJobTitle(n) } }

async function saveAIConfig() {
    aiStatus.value=""; aiError.value=""; aiSaving.value=true
    try {
      // 先保存到localStorage（保证刷新不丢失）
      localStorage.setItem("ai_config", JSON.stringify(aiForm.value));
      // 如果有COS权限，同步到COS
      const { getCOSConfig:g, getCOS:c } = await import("@/utils/cos")
      const cos = c()
      if (cos) {
        const cfg = g()
        await cos.putObject({
          Bucket: cfg.Bucket, Region: cfg.Region,
          Key: "config/ai-key.json",
          Body: JSON.stringify({ apiKey: aiForm.value.apiKey, model: aiForm.value.model, baseUrl: aiForm.value.baseUrl, provider: aiForm.value.provider }),
          ContentType: "application/json",
        })
      }
      aiStatus.value = "✅ AI校验配置已保存！"
  } catch(e) { aiError.value = "保存失败: "+e.message }
  aiSaving.value = false
}

async function saveCOSConfig() {
  cosStatus.value=""; cosError.value=""; cosSaving.value=true
  try {
    await initCOS(cosConfig.value)
    cosStatus.value="✅ COS配置保存成功！"
    try { await appStore.syncAllToCOS(); cosStatus.value="✅ COS配置保存成功，数据已同步！" } catch(e) { cosStatus.value="✅ COS配置成功，但同步失败: "+e.message }
  } catch(e) { cosError.value="保存失败: "+e.message }
  cosSaving.value=false
}

async function syncAll() {
  syncResult.value=""; syncError.value=""; syncing.value=true
  try { const r=await appStore.syncAllToCOS(); syncResult.value="✅ 同步成功："+r } catch(e) { syncError.value="❌ 同步失败: "+e.message }
  syncing.value=false
}

async function saveSettings() {
  settingsStatus.value=""; settingsError.value=""
  try { await appStore.saveSiteConfig(); settingsStatus.value="✅ 设置已保存！" } catch(e) { settingsError.value="保存失败: "+e.message }
}

function formatTime(t) { if (!t) return ""; return new Date(t).toLocaleString("zh-CN") }
</script>




