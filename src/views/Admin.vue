<template>
  <div>
    <div class="page-header"><h1>⚙️ 管理后台</h1></div>
    <div class="admin-layout">
      <div class="admin-sidebar">
        <div v-for="item in menuItems" :key="item.key" class="admin-sidebar-item" :class="{active: currentTab === item.key}" @click="currentTab = item.key">
          <span>{{ item.icon }}</span> {{ item.label }}
        </div>
      </div>
      <div class="admin-content">

        <!-- 概览 -->
        <div v-if="currentTab === 'overview'">
          <h3>📊 概览</h3>
          <div :style="{padding:'8px 12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px',background:cosConnected?'#ecfdf5':'#fef2f2',color:cosConnected?'#065f46':'#991b1b'}">
            COS状态：{{ cosConnected ? '✅ 已连接' : '❌ 未连接' }}
            <span v-if="!cosConnected">（请到 COS配置 页设置密钥）</span>
          </div>
          <p>👍 好工作: <strong>{{ appStore.jobs.good.length }}</strong> 条</p>
          <p>👌 中等: <strong>{{ appStore.jobs.medium.length }}</strong> 条</p>
          <p>⚠️ 避雷: <strong>{{ appStore.jobs.bad.length }}</strong> 条</p>
          <p>💬 评论: <strong>{{ appStore.comments.length }}</strong> 条</p>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
            <button class="btn btn-primary" @click="syncAll" :disabled="syncing || !cosConnected">
              {{ syncing ? '⏳ 同步中...' : '🔄 强制同步所有数据到COS' }}
            </button>
            <div v-if="syncResult" style="margin-top:8px;padding:8px 12px;background:#ecfdf5;color:#065f46;border-radius:8px;font-size:13px">{{ syncResult }}</div>
            <div v-if="syncError" style="margin-top:8px;padding:8px 12px;background:#fef2f2;color:#991b1b;border-radius:8px;font-size:13px">{{ syncError }}</div>
          </div>
        </div>

        <!-- 内容管理 -->
        <div v-if="currentTab === 'content'">
          <h3>📋 内容管理</h3>
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn btn-sm" :class="contentFilter === 'all' ? 'btn-primary' : 'btn-outline'" @click="contentFilter = 'all'">全部</button>
            <button class="btn btn-sm" :class="contentFilter === 'good' ? 'btn-success' : 'btn-outline'" @click="contentFilter = 'good'">好工作</button>
            <button class="btn btn-sm" :class="contentFilter === 'medium' ? 'btn-warning' : 'btn-outline'" @click="contentFilter = 'medium'">中等</button>
            <button class="btn btn-sm" :class="contentFilter === 'bad' ? 'btn-danger' : 'btn-outline'" @click="contentFilter = 'bad'">避雷</button>
          </div>
          <div v-if="filteredContent.length === 0"><p>暂无内容</p></div>
          <div v-for="item in filteredContent" :key="item.id + item.type" style="border:1px solid #eee;padding:12px;margin-bottom:8px;border-radius:8px">
            <strong>{{ item.title }}</strong> @ {{ item.company }}
            <button class="btn btn-danger btn-sm" style="float:right" @click="deleteContent(item)">删除</button>
            <div style="font-size:12px;color:#999">{{ item.author }} | {{ formatTime(item.createdAt) }}</div>
          </div>
        </div>

        <!-- COS配置 -->
        <div v-if="currentTab === 'cos'">
          <h3>☁ COS配置</h3>
          <div :style="{padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',background:cosConnected?'#ecfdf5':'#fefce8',border:'1px solid '+(cosConnected?'#6ee7b7':'#fde68a'),color:cosConnected?'#065f46':'#92400e'}">
            {{ cosConnected ? '✅ COS已连接，数据可正常读写' : '请先在腾讯云获取 SecretId 和 SecretKey 并填入下方表单' }}
            <br><small v-if="cosConnected">Bucket: {{ bucketName }} | Region: {{ bucketRegion }}</small>
          </div>
          <form @submit.prevent="saveCOSConfig">
            <div class="form-group"><label class="form-label">SecretId</label><input v-model="cosConfig.SecretId" class="form-input" /></div>
            <div class="form-group"><label class="form-label">SecretKey</label><input v-model="cosConfig.SecretKey" class="form-input" type="password" /></div>
            <div class="form-group"><label class="form-label">Bucket</label><input v-model="cosConfig.Bucket" class="form-input" placeholder="your-bucket-1250000000" /></div>
            <div class="form-group"><label class="form-label">Region</label><select v-model="cosConfig.Region" class="form-select">
              <option value="ap-guangzhou">广州</option><option value="ap-shanghai">上海</option><option value="ap-beijing">北京</option>
            </select></div>
            <button type="submit" class="btn btn-primary" :disabled="cosSaving">{{ cosSaving ? '保存中...' : '保存并初始化COS' }}</button>
          </form>
          <div v-if="cosStatus" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--success);color:white">{{ cosStatus }}</div>
          <div v-if="cosError" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:14px;background:var(--danger);color:white">{{ cosError }}</div>
        </div>

        <!-- 站点设置 -->
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
import { ref, computed } from "vue"
import { useAppStore } from "@/stores/app"
import { getCOSConfig, initCOS, loadSavedConfig, isCOSReady } from "@/utils/cos"

const appStore = useAppStore()
const currentTab = ref("overview")
const contentFilter = ref("all")
const cosSaving = ref(false)
const cosStatus = ref("")
const cosError = ref("")
const settingsStatus = ref("")
const settingsError = ref("")
const syncing = ref(false)
const syncResult = ref("")
const syncError = ref("")

const cosConnected = computed(() => isCOSReady())
const bucketName = computed(() => getCOSConfig().Bucket)
const bucketRegion = computed(() => getCOSConfig().Region)

const saved = loadSavedConfig()
const cosConfig = ref({
  SecretId: saved?.SecretId || "",
  SecretKey: saved?.SecretKey || "",
  Bucket: saved?.Bucket || getCOSConfig().Bucket,
  Region: saved?.Region || getCOSConfig().Region
})

const menuItems = [
  {key:"overview", icon:"📊", label:"概览"},
  {key:"content", icon:"📋", label:"内容管理"},
  {key:"cos", icon:"☁", label:"COS配置"},
  {key:"settings", icon:"🎨", label:"站点设置"}
]

const typeLabels = { good:"推荐", medium:"一般", bad:"避雷" }

const filteredContent = computed(() => {
  const items = []
  for (const t of ["good","medium","bad"]) {
    if (contentFilter.value === "all" || contentFilter.value === t)
      for (const job of appStore.jobs[t]) items.push({...job, type: t})
  }
  return items.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
})

async function deleteContent(item) {
  if (confirm("确定删除「" + item.title + "」？")) {
    try {
      await appStore.deleteJob(item.type, item.id)
    } catch (e) {
      alert("删除失败: " + e.message)
    }
  }
}

async function saveCOSConfig() {
  cosStatus.value = ""
  cosError.value = ""
  cosSaving.value = true
  try {
    await initCOS(cosConfig.value)
    cosStatus.value = "✅ COS配置保存成功！"
    // 配置成功后，同步所有现有数据到COS
    try {
      await appStore.syncAllToCOS()
      cosStatus.value = "✅ COS配置保存成功，数据已同步！"
    } catch (e) {
      cosStatus.value = "✅ COS配置成功，但数据同步失败: " + e.message
    }
  } catch (e) {
    cosError.value = "保存失败: " + e.message
  }
  cosSaving.value = false
}

async function syncAll() {
  syncResult.value = ""
  syncError.value = ""
  syncing.value = true
  try {
    const result = await appStore.syncAllToCOS()
    syncResult.value = "✅ 同步成功：" + result
  } catch (e) {
    syncError.value = "❌ 同步失败: " + e.message
  }
  syncing.value = false
}

async function saveSettings() {
  settingsStatus.value = ""
  settingsError.value = ""
  try {
    await appStore.saveSiteConfig()
    settingsStatus.value = "✅ 设置已保存！"
  } catch (e) {
    settingsError.value = "保存失败: " + e.message
  }
}

function formatTime(t) { if (!t) return ""; return new Date(t).toLocaleString("zh-CN") }
</script>
