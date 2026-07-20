<template>
  <div>
    <div class="page-header">
      <h1 class="page-title"><span>⚙️</span> 管理后台</h1>
    </div>

    <div class="admin-layout">
      <div class="admin-sidebar">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="admin-sidebar-item"
          :class="{ active: currentTab === item.key }"
          @click="currentTab = item.key"
        >
          <span>{{ item.icon }}</span> {{ item.label }}
        </div>
      </div>

      <div class="admin-content">
        <!-- 概览 -->
        <div v-if="currentTab === 'overview'">
          <h3 style="margin-bottom: 16px;">📊 站点概览</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
            <div class="card" style="text-align: center; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">👍</div>
              <div style="font-size: 28px; font-weight: 700; color: var(--success);">{{ appStore.jobs.good.length }}</div>
              <div style="font-size: 14px; color: var(--text-secondary);">好工作推荐</div>
            </div>
            <div class="card" style="text-align: center; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">👌</div>
              <div style="font-size: 28px; font-weight: 700; color: var(--warning);">{{ appStore.jobs.medium.length }}</div>
              <div style="font-size: 14px; color: var(--text-secondary);">中等工作</div>
            </div>
            <div class="card" style="text-align: center; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
              <div style="font-size: 28px; font-weight: 700; color: var(--danger);">{{ appStore.jobs.bad.length }}</div>
              <div style="font-size: 14px; color: var(--text-secondary);">避雷信息</div>
            </div>
            <div class="card" style="text-align: center; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
              <div style="font-size: 28px; font-weight: 700;">{{ appStore.comments.length }}</div>
              <div style="font-size: 14px; color: var(--text-secondary);">评论总数</div>
            </div>
            <div class="card" style="text-align: center; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
              <div style="font-size: 28px; font-weight: 700;">{{ users.length }}</div>
              <div style="font-size: 14px; color: var(--text-secondary);">注册用户</div>
            </div>
          </div>
        </div>

        <!-- 内容管理 -->
        <div v-if="currentTab === 'content'">
          <h3 style="margin-bottom: 16px;">📋 内容管理</h3>
          <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
            <button class="btn btn-sm" :class="contentFilter === 'all' ? 'btn-primary' : 'btn-outline'" @click="contentFilter = 'all'">全部</button>
            <button class="btn btn-sm" :class="contentFilter === 'good' ? 'btn-success' : 'btn-outline'" @click="contentFilter = 'good'">好工作</button>
            <button class="btn btn-sm" :class="contentFilter === 'medium' ? 'btn-warning' : 'btn-outline'" @click="contentFilter = 'medium'">中等</button>
            <button class="btn btn-sm" :class="contentFilter === 'bad' ? 'btn-danger' : 'btn-outline'" @click="contentFilter = 'bad'">避雷</button>
          </div>

          <div v-for="item in filteredContent" :key="item.id + item.type" class="job-card" :class="'job-card-' + item.type" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <strong>{{ item.title }}</strong>
                <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">@ {{ item.company }}</span>
                <span class="badge" :class="'badge-' + item.type" style="margin-left: 8px;">{{ typeLabels[item.type] }}</span>
              </div>
              <button class="btn btn-danger btn-sm" @click="deleteContent(item)">删除</button>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              作者: {{ item.author }} | {{ formatTime(item.createdAt) }}
            </div>
          </div>
          <div v-if="filteredContent.length === 0" class="empty-state" style="padding: 30px;">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-text">暂无内容</div>
          </div>
        </div>

        <!-- 评论管理 -->
        <div v-if="currentTab === 'comments'">
          <h3 style="margin-bottom: 16px;">💬 评论管理</h3>
          <div v-for="comment in appStore.comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <div class="comment-author">
                <span>👤</span> {{ comment.author }}
                <span class="badge badge-admin" style="font-size: 10px;" v-if="comment.isAdmin">管理员</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                <button class="btn btn-danger btn-sm" @click="deleteComment(comment.id)">删除</button>
              </div>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
          <div v-if="appStore.comments.length === 0" class="empty-state" style="padding: 30px;">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-text">暂无评论</div>
          </div>
        </div>

        <!-- 用户管理 -->
        <div v-if="currentTab === 'users'">
          <h3 style="margin-bottom: 16px;">👥 用户管理</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f9fafb; text-align: left;">
                  <th style="padding: 10px 12px; border-bottom: 2px solid var(--border);">用户名</th>
                  <th style="padding: 10px 12px; border-bottom: 2px solid var(--border);">昵称</th>
                  <th style="padding: 10px 12px; border-bottom: 2px solid var(--border);">角色</th>
                  <th style="padding: 10px 12px; border-bottom: 2px solid var(--border);">注册时间</th>
                  <th style="padding: 10px 12px; border-bottom: 2px solid var(--border);">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.username" style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 12px;">{{ u.username }}</td>
                  <td style="padding: 10px 12px;">{{ u.nickname || '-' }}</td>
                  <td style="padding: 10px 12px;">
                    <span class="badge" :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">
                      {{ u.role === 'admin' ? '管理员' : '用户' }}
                    </span>
                  </td>
                  <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">
                    {{ u.createdAt ? formatTime(u.createdAt) : '-' }}
                  </td>
                  <td style="padding: 10px 12px;">
                    <button
                      v-if="u.role !== 'admin'"
                      class="btn btn-danger btn-sm"
                      @click="deleteUser(u.username)"
                    >
                      删除
                    </button>
                    <span v-else style="font-size: 12px; color: var(--text-secondary);">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- COS配置 -->
        <div v-if="currentTab === 'cos'">
          <h3 style="margin-bottom: 16px;">☁️ 腾讯云COS配置</h3>
          <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
            ⚠️ 请先在腾讯云控制台获取 SecretId 和 SecretKey，并创建一个存储桶。
          </div>
          <form @submit.prevent="saveCOSConfig">
            <div class="form-group">
              <label class="form-label">SecretId</label>
              <input v-model="cosConfig.SecretId" class="form-input" placeholder="请输入SecretId" />
            </div>
            <div class="form-group">
              <label class="form-label">SecretKey</label>
              <input v-model="cosConfig.SecretKey" class="form-input" type="password" placeholder="请输入SecretKey" />
            </div>
            <div class="form-group">
              <label class="form-label">存储桶名称 (Bucket)</label>
              <input v-model="cosConfig.Bucket" class="form-input" placeholder="例如：your-bucket-1250000000" />
            </div>
            <div class="form-group">
              <label class="form-label">所属地域 (Region)</label>
              <select v-model="cosConfig.Region" class="form-select">
                <option value="ap-guangzhou">广州 (ap-guangzhou)</option>
                <option value="ap-shanghai">上海 (ap-shanghai)</option>
                <option value="ap-beijing">北京 (ap-beijing)</option>
                <option value="ap-shenzhen-fsi">深圳金融 (ap-shenzhen-fsi)</option>
                <option value="ap-hongkong">香港 (ap-hongkong)</option>
                <option value="ap-singapore">新加坡 (ap-singapore)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">保存并初始化COS</button>
          </form>
          <div v-if="cosStatus" style="margin-top: 12px; padding: 8px 12px; border-radius: 8px; font-size: 14px; background: var(--success); color: white;">
            {{ cosStatus }}
          </div>
        </div>

        <!-- 站点设置 -->
        <div v-if="currentTab === 'settings'">
          <h3 style="margin-bottom: 16px;">🎨 站点设置</h3>
          <form @submit.prevent="saveSettings">
            <div class="form-group">
              <label class="form-label">网站背景图片URL</label>
              <input v-model="appStore.siteConfig.backgroundImage" class="form-input" placeholder="输入背景图片URL，留空使用默认背景" />
            </div>
            <div style="margin-bottom: 16px;">
              <label class="form-label">背景预览</label>
              <div style="border: 2px dashed var(--border); border-radius: 8px; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f9fafb;">
                <img v-if="appStore.siteConfig.backgroundImage" :src="appStore.siteConfig.backgroundImage" style="max-width: 100%; max-height: 100%; object-fit: cover;" />
                <span v-else style="color: var(--text-secondary); font-size: 14px;">暂无背景图</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">主题色</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input v-model="appStore.siteConfig.primaryColor" class="form-input" style="width: 120px;" placeholder="#4f46e5" />
                <input type="color" v-model="appStore.siteConfig.primaryColor" style="width: 40px; height: 40px; border: none; cursor: pointer; border-radius: 4px;" />
              </div>
            </div>
            <button type="submit" class="btn btn-primary">保存设置</button>
          </form>
          <div v-if="settingsStatus" style="margin-top: 12px; padding: 8px 12px; border-radius: 8px; font-size: 14px; background: var(--success); color: white;">
            {{ settingsStatus }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { getCOSConfig, initCOS, loadSavedConfig } from "@/utils/cos";
import { getAllUsers, deleteUser as deleteUserApi } from '@/utils/auth';

const appStore = useAppStore();
const currentTab = ref('overview');
const contentFilter = ref('all');
const cosStatus = ref('');
const settingsStatus = ref('');
const users = ref([]);
const savedConfig = loadSavedConfig();
const cosConfig = ref({
    SecretId: savedConfig?.SecretId || '',
  SecretKey: savedConfig?.SecretKey || '',
  Bucket: savedConfig?.Bucket || getCOSConfig().Bucket,
  Region: savedConfig?.Region || getCOSConfig().Region,
});

const typeLabels = { good: '推荐', medium: '一般', bad: '避雷' };

const menuItems = [
  { key: 'overview', icon: '📊', label: '概览' },
  { key: 'content', icon: '📋', label: '内容管理' },
  { key: 'comments', icon: '💬', label: '评论管理' },
  { key: 'users', icon: '👥', label: '用户管理' },
  { key: 'cos', icon: '☁️', label: 'COS配置' },
  { key: 'settings', icon: '🎨', label: '站点设置' },
];

const filteredContent = computed(() => {
  const all = [];
  for (const type of ['good', 'medium', 'bad']) {
    if (contentFilter.value === 'all' || contentFilter.value === type) {
      for (const job of appStore.jobs[type]) {
        all$.push({ ...job, type });
      }
    }
  }
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

onMounted(async () => {
  users.value = await getAllUsers();
});

async function deleteContent(item) {
  if ($`确定删除「${item.title}」吗？`) {
    await appStore.deleteJob(item.type, item.id);
  }
}

async function deleteComment(id) {
  if (confirm('确定删除此评论吗？')) {
    await appStore.deleteComment(id);
  }
}

async function deleteUser(username) {
  if ($`确定删除用户「${username}」吗？`) {
    await deleteUserApi(username);
    users.value = await getAllUsers();
  }
}

async function saveCOSConfig() {
  try {
    await initCOS(cosConfig.value);
    cosStatus.value = 'COS配置已保存，连接成功！';
  } catch (e) {
    cosStatus.value = '配置已保存，但连接测试失败：' + e.message + '（可稍后重试）';
  }
}

async function saveSettings() {
  await appStore.saveSiteConfig();
  settingsStatus.value = '设置已保存！';
}
</script>
