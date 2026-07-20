<template>
  <div class="app-container" :style="bgStyle">
    <NavBar />
    <main class="main-content">
      <router-view />
    </main>
    <footer class="site-footer">
      <p>© 2026 职评网 - 找工作避雷指南 | 数据存储于腾讯云COS</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAppStore } from "@/stores/app";
import NavBar from "@/components/NavBar.vue";

const appStore = useAppStore();
const bgStyle = computed(() => {
  if (appStore.siteConfig?.backgroundImage) {
    return {
      backgroundImage: `url(${appStore.siteConfig.backgroundImage})`,
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      backgroundPosition: "center",
    };
  }
  return {};
});
</script>
