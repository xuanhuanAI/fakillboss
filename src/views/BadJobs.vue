<template>
  <div>
    <div class="page-header"><h1 class="page-title"><span>⚠️</span> 避雷工作</h1><button v-if="appStore.isLoggedIn" class="btn btn-danger" @click="showForm = true">+ 发布避雷</button></div>
    <div v-if="appStore.loading && appStore.jobs.bad.length === 0" class="loading"><div class="spinner"></div><p>加载中...</p></div>
    <div v-else-if="appStore.jobs.bad.length === 0" class="empty-state">
      <div class="empty-state-icon">🛡️</div><div class="empty-state-text">还没有人分享避雷信息</div>
      <button v-if="appStore.isLoggedIn" class="btn btn-danger" style="margin-top:12px" @click="showForm = true">发布避雷</button>
      <router-link v-else to="/login" class="btn btn-primary" style="margin-top:12px">登录后发布</router-link>
    </div>
    <div v-else class="job-list"><JobCard v-for="job in appStore.jobs.bad" :key="job.id" :job="job" type="bad" /></div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content">
        <div class="modal-title"><span>⚠️ 发布避雷信息</span><button class="modal-close" @click="showForm = false">&times;</button></div>
        <form @submit.prevent="submitJob">
          <div class="form-group" style="position:relative">
            <label class="form-label">岗位名称 *</label>
            <input v-model="form.title" class="form-input" placeholder="搜索职位名称" required @input="sf1=true" @focus="sf1=true" @blur="onTitleBlur" />
            <div v-if="sf1 && ft1.length>0" style="position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:8px;z-index:100;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
              <div v-for="t in ft1" :key="t.name" style="padding:8px 12px;cursor:pointer;font-size:14px" @mousedown.prevent="form.title=t.name;sf1=false" @mouseover="h1=ft1.indexOf(t)" :style="{background:h1===ft1.indexOf(t)?'#eef2ff':''}">{{ t.name }}</div>
            </div>
            <div v-if="tc1 && !tc1.valid && form.title" style="margin-top:4px;font-size:12px;color:var(--danger)">{{ tc1.message }}</div>
          </div>
          <div class="form-group" style="position:relative">
            <label class="form-label">公司名称 *</label>
            <input v-model="form.company" class="form-input" placeholder="搜索公司名称" required @input="sf2=true" @focus="sf2=true" @blur="onCompanyBlur" />
            <div v-if="sf2 && fc2.length>0" style="position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border);border-radius:8px;z-index:100;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
              <div v-for="c in fc2" :key="c.name" style="padding:8px 12px;cursor:pointer;font-size:14px" @mousedown.prevent="form.company=c.name;sf2=false" @mouseover="h2=fc2.indexOf(c)" :style="{background:h2===fc2.indexOf(c)?'#eef2ff':''}">{{ c.name }}</div>
            </div>
            <div v-if="cc2 && !cc2.valid && form.company" style="margin-top:4px;font-size:12px;color:var(--danger)">{{ cc2.message }}</div>
          </div>
          <div class="form-group"><label class="form-label">避雷原因 *</label><textarea v-model="form.description" class="form-textarea" required></textarea></div>
          <div class="form-group"><label class="form-label">涉及金额</label><input v-model="form.salary" class="form-input" /></div>
          <div v-if="aiChecking" style="font-size:13px;color:var(--primary);margin-bottom:8px">🤖 AI校验中...</div>
          <div v-if="publishError" style="color:var(--danger);font-size:13px;margin-bottom:8px">{{ publishError }}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
            <button type="submit" class="btn btn-danger" :disabled="publishing||aiChecking">{{ publishing?'发布中...':aiChecking?'校验中...':'发布避雷' }}</button>
          </div>
        </form>
      </div>
    </div>
    <div v-if="toastMsg" class="toast" :class="toastType" style="position:fixed;top:80px;right:24px;z-index:3000">{{ toastMsg }}</div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { validateWithAI } from '@/utils/ai';
import JobCard from '@/components/JobCard.vue';
const appStore = useAppStore();
const showForm = ref(false); const publishing = ref(false); const publishError = ref("");
const toastMsg = ref(""); const toastType = ref("toast-success");
const sf1 = ref(false); const h1 = ref(-1); const sf2 = ref(false); const h2 = ref(-1);
const aiChecking = ref(false);
const form = ref({ title:'', company:'', description:'', salary:'' });
onMounted(() => { appStore.ensureDataLoaded(); });
const ft1 = computed(() => { const q = (form.value.title||"").trim().toLowerCase(); if(!q)return appStore.jobTitles.slice(0,10); return appStore.jobTitles.filter(t=>t.name.toLowerCase().includes(q)).slice(0,10); });
const fc2 = computed(() => { const q = (form.value.company||"").trim().toLowerCase(); if(!q)return appStore.companies.slice(0,10); return appStore.companies.filter(c=>c.name.toLowerCase().includes(q)).slice(0,10); });
const tc1 = computed(() => { if(!form.value.title||!form.value.title.trim())return null; return appStore.validateJobTitle(form.value.title); });
const cc2 = computed(() => { if(!form.value.company||!form.value.company.trim())return null; return appStore.validateCompany(form.value.company); });
function showToast(m,t){toastMsg.value=m;toastType.value=t;setTimeout(()=>{toastMsg.value="";},3000);}
function onTitleBlur(){setTimeout(()=>sf1.value=false,200);}
function onCompanyBlur(){setTimeout(()=>sf2.value=false,200);}
async function submitJob(){
  const tc=appStore.validateJobTitle(form.value.title); if(!tc.valid){publishError.value=tc.message;return;}
  const cc=appStore.validateCompany(form.value.company); if(!cc.valid){publishError.value=cc.message;return;}
  aiChecking.value=true; publishError.value="";
  try { const ai=await validateWithAI(form.value.company,form.value.title); if(!ai.valid){publishError.value="🤖 AI校验未通过: "+ai.message;aiChecking.value=false;return;} } catch(e) { console.warn("AI失败放行:",e.message); }
  aiChecking.value=false;
  publishing.value=true;
  try{await appStore.addJob('bad',{title:form.value.title,company:form.value.company,description:form.value.description,salary:form.value.salary,author:appStore.currentUser.nickname||appStore.currentUser.username,authorId:appStore.currentUser.username});form.value={title:'',company:'',description:'',salary:''};showForm.value=false;showToast("✅ 发布成功！");}
  catch(e){publishError.value=e.message;showToast("❌ 发布失败","toast-error");}
  publishing.value=false;
}
</script>

