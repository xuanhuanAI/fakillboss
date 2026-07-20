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

        <div v-if="currentTab === 'overview'">
          <h3>概览</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
            <div class="card" style="text-align:center;padding:20px"><div style="font-size:32px">👍</div><div style="font-size:28px">{{ appStore.jobs.good.length }}</div><div>好工作</div></div>
            <div class="card" style="text-align:center;padding:20px"><div style="font-size:32px">👌</div><div style="font-size:28px">{{ appStore.jobs.medium.length }}</div><div>中等</div></div>
            <div class="card" style="text-align:center;padding:20px"><div style="font-size:32px">⚠️</div><div style="font-size:28px">{{ appStore.jobs.bad.length }}</div><div>避雷</div></div>
          </div>
        </div>

        <div v-if="currentTab === 'content'">
          <h3>内容管理</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" :class="contentFilter === 'all' ? 'btn-primary' : 'btn-outline'" @click="contentFilter = 'all'">全部</button>
            <button class="btn btn-sm" :class="contentFilter === 'good' ? 'btn-success' : 'btn-outline'" @click="contentFilter = 'good'">好工作</button>
            <button class="btn btn-sm" :class="contentFilter === 'medium' ? 'btn-warning' : 'btn-outline'" @click="contentFilter = 'medium'">中等</button>
            <button class="btn btn-sm" :class="contentFilter === 'bad' ? 'btn-danger' : 'btn-outline'" @click="contentFilter = 'bad'">避雷</button>
          </div>
        </div>

        <div v-if="currentTab === 'cos'">
          <h3>COS配置</h3>
          <form @submit.prevent="saveCOSConfig">
            <div><label>SecretId</label><input v-model="cosConfig.SecretId" /></div>
            <div><label>SecretKey</label><input v-model="cosConfig.SecretKey" type="password" /></div>
            <div><label>Bucket</label><input v-model="cosConfig.Bucket" /></div>
            <div><label>Region</label><select v-model="cosConfig.Region"><option>ap-guangzhou</option></select></div>
            <button type="submit" class="btn btn-primary">保存</button>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue"
import { useAppStore } from "@/stores/app"
import { getCOSConfig, initCOS, loadSavedConfig } from "@/utils/cos"
const appStore = useAppStore()
const currentTab = ref("overview")
const contentFilter = ref("all")
const saved = loadSavedConfig()
const cosConfig = ref({SecretId:saved?.SecretId||"",SecretKey:saved?.SecretKey||"",Bucket:saved?.Bucket||getCOSConfig().Bucket,Region:saved?.Region||getCOSConfig().Region})
const menuItems = [{key:"overview",icon:"📊",label:"概览"},{key:"content",icon:"📋",label:"内容"},{key:"cos",icon:"☁",label:"COS"}]
const cosStatus = ref("")
async function saveCOSConfig() { try { await initCOS(cosConfig.value); cosStatus.value = "OK" } catch(e) { cosStatus.value = e.message } }
</script>