import { defineStore } from "pinia";
import { getCOSData, putCOSData, initCOSSaved, isCOSReady } from "@/utils/cos";

export const useAppStore = defineStore("app", {
  state: () => ({
    siteConfig: {
      title: "职评网 - 找工作避雷指南",
      backgroundImage: "",
      primaryColor: "#4f46e5",
    },
    currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
    jobs: {
      good: [],
      medium: [],
      bad: [],
    },
    comments: [],
    dataLoaded: false,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    isAdmin: (state) => state.currentUser?.role === "admin",
    cosReady: () => isCOSReady(),
  },
  actions: {
    setUser(user) {
      this.currentUser = user;
      if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
      } else {
        localStorage.removeItem("currentUser");
      }
    },
    logout() {
      this.setUser(null);
    },
    async fetchSiteConfig() {
      try {
        const data = await this.getCOSDataSafe("config/site-config.json");
        if (data) this.siteConfig = { ...this.siteConfig, ...data };
      } catch (e) {
        console.log("使用默认配置");
      }
    },
    async saveSiteConfig() {
      await putCOSData("config/site-config.json", this.siteConfig);
    },
    async fetchJobs(type) {
      try {
        const data = await this.getCOSDataSafe(`data/${type}-jobs.json`);
        this.jobs[type] = data || [];
      } catch (e) {
        this.jobs[type] = [];
      }
    },
    async saveJobs(type) {
      // 不再静默吃错误 - 让调用方知道结果
      await putCOSData(`data/${type}-jobs.json`, this.jobs[type]);
    },
    async fetchComments() {
      try {
        const data = await this.getCOSDataSafe("data/comments.json");
        this.comments = data || [];
      } catch (e) {
        this.comments = [];
      }
    },
    async saveComments() {
      await putCOSData("data/comments.json", this.comments);
    },
    async getCOSDataSafe(key) {
      try {
        return await getCOSData(key);
      } catch (e) {
        console.warn("COS读取失败:", key, e.message);
        return null;
      }
    },

    async addJob(type, job) {
      this.jobs[type].unshift({
        ...job,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      });
      await this.saveJobs(type);
    },
    async deleteJob(type, jobId) {
      this.jobs[type] = this.jobs[type].filter((j) => j.id !== jobId);
      this.comments = this.comments.filter((c) => c.jobId !== jobId);
      await this.saveJobs(type);
      await this.saveComments();
    },
    async addComment(comment) {
      this.comments.unshift({
        ...comment,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      });
      await this.saveComments();
    },
    async deleteComment(commentId) {
      this.comments = this.comments.filter((c) => c.id !== commentId);
      await this.saveComments();
    },

    /** 强制将所有本地数据同步到COS */
    async syncAllToCOS() {
      if (!isCOSReady()) {
        throw new Error("COS 未初始化，请先在管理后台配置密钥");
      }
      const results = [];
      for (const type of ["good", "medium", "bad"]) {
        await this.saveJobs(type);
        results.push(`${type}: ${this.jobs[type].length}条`);
      }
      await this.saveComments();
      results.push(`评论: ${this.comments.length}条`);
      await this.saveSiteConfig();
      results.push("站点配置");
      return results.join(" | ");
    },

    async initApp() {
      if (this.loading) return;
      this.loading = true;
      try {
        await initCOSSaved();
        await this.fetchSiteConfig();
        await Promise.all([
          this.fetchJobs("good"),
          this.fetchJobs("medium"),
          this.fetchJobs("bad"),
          this.fetchComments(),
        ]);
        this.dataLoaded = true;
      } catch (e) {
        console.error("数据加载失败:", e);
      } finally {
        this.loading = false;
      }
    },

    async ensureDataLoaded() {
      if (!this.dataLoaded && !this.loading) {
        await this.initApp();
      }
    },
  },
});
