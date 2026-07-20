import { defineStore } from "pinia";
import { getCOSData, putCOSData } from "@/utils/cos";

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
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    isAdmin: (state) => state.currentUser?.role === "admin",
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
        const data = await getCOSData("config/site-config.json");
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
        const data = await getCOSData(`data/${type}-jobs.json`);
        this.jobs[type] = data || [];
      } catch (e) {
        this.jobs[type] = [];
      }
    },
    async saveJobs(type) {
      await putCOSData(`data/${type}-jobs.json`, this.jobs[type]);
    },
    async fetchComments() {
      try {
        const data = await getCOSData("data/comments.json");
        this.comments = data || [];
      } catch (e) {
        this.comments = [];
      }
    },
    async saveComments() {
      await putCOSData("data/comments.json", this.comments);
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
    async initApp() {
      await this.fetchSiteConfig();
      await Promise.all([
        this.fetchJobs("good"),
        this.fetchJobs("medium"),
        this.fetchJobs("bad"),
        this.fetchComments(),
      ]);
    },
  },
});
