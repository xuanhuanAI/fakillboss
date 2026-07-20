<template>
  <nav class="navbar">
    <router-link to="/" class="navbar-brand">
      <span class="logo-icon">🔍</span>
      <span>职评网</span>
    </router-link>

    <ul class="navbar-links">
      <li>
        <router-link to="/good" active-class="active"><span>👍</span> 好工作</router-link>
      </li>
      <li>
        <router-link to="/medium" active-class="active"><span>👌</span> 中等工作</router-link>
      </li>
      <li>
        <router-link to="/bad" active-class="active"><span>⚠️</span> 避雷工作</router-link>
      </li>
    </ul>

    <div class="navbar-right">
      <template v-if="appStore.isLoggedIn">
        <router-link to="/admin" class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;">⚙️ 管理</router-link>
        <span style="font-size:14px;margin:0 8px;">{{ appStore.currentUser.nickname || appStore.currentUser.username }}</span>
        <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;" @click="handleLogout">退出</button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;">登录</router-link>
        <router-link to="/register" class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;">注册</router-link>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";

const router = useRouter();
const appStore = useAppStore();

function handleLogout() {
  appStore.logout();
  router.push("/");
}
</script>
