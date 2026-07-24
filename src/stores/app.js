import { defineStore } from "pinia";
import { getCOSData, putCOSData, initCOSSaved, isCOSReady, isWriteReady } from "@/utils/cos";
import { syncPendingUsers } from "@/utils/auth";

const PENDING_COMMENTS_KEY = "pending_comments";

// 常见职位列表（作为默认种子数据）
const DEFAULT_JOB_TITLES = [
  "前端开发工程师", "后端开发工程师", "全栈开发工程师", "移动端开发工程师",
  "软件工程师", "高级软件工程师", "测试工程师", "测试开发工程师",
  "运维工程师", "DevOps工程师", "安全工程师", "网络工程师",
  "产品经理", "高级产品经理", "产品总监", "项目经理",
  "UI设计师", "UX设计师", "视觉设计师", "交互设计师",
  "数据分析师", "数据工程师", "数据科学家", "算法工程师",
  "机器学习工程师", "深度学习工程师", "NLP工程师", "计算机视觉工程师",
  "销售代表", "销售经理", "销售总监", "客户经理",
  "市场专员", "市场经理", "市场总监", "品牌经理",
  "新媒体运营", "内容运营", "用户运营", "活动运营",
  "人力资源专员", "HRBP", "招聘专员", "HR经理",
  "财务专员", "会计", "出纳", "财务经理", "CFO",
  "行政专员", "行政经理", "前台", "后勤",
  "客服专员", "客服经理", "技术支持工程师",
  "采购专员", "采购经理", "供应链专员",
  "物流专员", "物流经理", "仓储管理",
  "法务专员", "法务经理", "法务总监",
  "实施工程师", "售前工程师", "售后工程师",
  "架构师", "技术总监", "技术VP", "CTO",
  "CEO", "COO", "总经理", "副总裁",
  "咨询顾问", "管理培训生", "实习生", "助理",
  "平面设计师", "视频剪辑师", "文案策划", "编导",
];

export const useAppStore = defineStore("app", {
  state: () => ({
    siteConfig: {
      title: "职评网 - 找工作避雷指南",
      backgroundImage: "",
      primaryColor: "#4f46e5",
    },
    currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
    jobs: { good: [], medium: [], bad: [] },
    comments: [],
    companies: [],
    jobTitles: [],
    dataLoaded: false,_loadingPromise: null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    isAdmin: (state) => state.currentUser?.role === "admin",
    cosReady: () => isCOSReady(),
    companyNames: (state) => state.companies.map((c) => c.name),
    jobTitleNames: (state) => state.jobTitles.map((t) => t.name),
  },
  actions: {
    setUser(user) {
      this.currentUser = user;
      if (user) localStorage.setItem("currentUser", JSON.stringify(user));
      else localStorage.removeItem("currentUser");
    },
    logout() { this.setUser(null); },

    async fetchSiteConfig() {
      try {
        const data = await this.getCOSDataSafe("config/site-config.json");
        if (data) this.siteConfig = { ...this.siteConfig, ...data };
      } catch (e) { /* 使用默认配置 */ }
    },
    async saveSiteConfig() { await putCOSData("config/site-config.json", this.siteConfig); },

    async fetchJobs(type) {
      try {
        const data = await this.getCOSDataSafe(`data/${type}-jobs.json`);
        this.jobs[type] = data || [];
      } catch (e) { this.jobs[type] = []; }
    },
    async saveJobs(type) { await putCOSData(`data/${type}-jobs.json`, this.jobs[type]); },

    async fetchComments() {
      try {
        const data = await this.getCOSDataSafe("data/comments.json");
        this.comments = data || [];
      } catch (e) { this.comments = []; }
      // 合并本地待同步评论
      await this.mergePendingComments();
    },
    async saveComments() { await putCOSData("data/comments.json", this.comments); },

    // ==================== 公司管理 ====================

    async fetchCompanies() {
      try {
        const data = await this.getCOSDataSafe("data/companies.json");
        this.companies = data || [];
      } catch (e) { this.companies = []; }
    },
    async saveCompanies() { await putCOSData("data/companies.json", this.companies); },

    async extractCompaniesFromJobs() {
      const nameSet = new Set(this.companies.map((c) => c.name));
      let added = 0;
      for (const type of ["good", "medium", "bad"]) {
        for (const job of this.jobs[type]) {
          if (job.company && !nameSet.has(job.company)) {
            nameSet.add(job.company);
            this.companies.push({ name: job.company, addedBy: "system", addedAt: new Date().toISOString() });
            added++;
          }
        }
      }
      if (added > 0) await this.saveCompanies();
      return added;
    },

    async addCompany(name) {
      const exists = this.companies.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (exists) throw new Error("该公司已在收录名单中");
      this.companies.push({ name: name.trim(), addedBy: this.currentUser?.username || "unknown", addedAt: new Date().toISOString() });
      await this.saveCompanies();
    },
    async addCompaniesBulk(text) {
      const names = text.split(/[\n,，、]+/).map((s) => s.trim()).filter(Boolean);
      if (names.length === 0) throw new Error("没有有效的公司名称");
      let added = 0;
      const existing = new Set(this.companies.map((c) => c.name.trim().toLowerCase()));
      for (const name of names) {
        if (!existing.has(name.toLowerCase())) {
          this.companies.push({ name, addedBy: this.currentUser?.username || "unknown", addedAt: new Date().toISOString() });
          existing.add(name.toLowerCase());
          added++;
        }
      }
      if (added === 0) throw new Error("这些公司都已收录");
      await this.saveCompanies();
      return added;
    },
    async removeCompany(name) {
      this.companies = this.companies.filter((c) => c.name !== name);
      await this.saveCompanies();
    },

    validateCompany(name) {
      if (!name || !name.trim()) return { valid: false, message: "请输入公司名称" };
      // 不再做名单校验，全部由 AI 审核
      return { valid: true, match: name.trim() };
    },

    // ==================== 职位管理 ====================

    async fetchJobTitles() {
      try {
        const data = await this.getCOSDataSafe("data/job-titles.json");
        this.jobTitles = data || DEFAULT_JOB_TITLES.map((t) => ({ name: t, addedBy: "system", addedAt: new Date().toISOString() }));
      } catch (e) { this.jobTitles = DEFAULT_JOB_TITLES.map((t) => ({ name: t, addedBy: "system", addedAt: new Date().toISOString() })); }
    },
    async saveJobTitles() { await putCOSData("data/job-titles.json", this.jobTitles); },

    async extractJobTitlesFromJobs() {
      const nameSet = new Set(this.jobTitles.map((t) => t.name));
      let added = 0;
      for (const type of ["good", "medium", "bad"]) {
        for (const job of this.jobs[type]) {
          if (job.title && !nameSet.has(job.title)) {
            nameSet.add(job.title);
            this.jobTitles.push({ name: job.title, addedBy: "system", addedAt: new Date().toISOString() });
            added++;
          }
        }
      }
      if (added > 0) await this.saveJobTitles();
      return added;
    },

    async addJobTitle(name) {
      const exists = this.jobTitles.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (exists) throw new Error("该职位已在收录名单中");
      this.jobTitles.push({ name: name.trim(), addedBy: this.currentUser?.username || "unknown", addedAt: new Date().toISOString() });
      await this.saveJobTitles();
    },
    async addJobTitlesBulk(text) {
      const names = text.split(/[\n,，、]+/).map((s) => s.trim()).filter(Boolean);
      if (names.length === 0) throw new Error("没有有效的职位名称");
      let added = 0;
      for (const name of names) {
        if (!this.jobTitles.find((t) => t.name.trim().toLowerCase() === name.toLowerCase())) {
          this.jobTitles.push({ name, addedBy: this.currentUser?.username || "unknown", addedAt: new Date().toISOString() });
          added++;
        }
      }
      if (added === 0) throw new Error("这些职位都已存在");
      await this.saveJobTitles();
      return added;
    },
    async removeJobTitle(name) {
      this.jobTitles = this.jobTitles.filter((t) => t.name !== name);
      await this.saveJobTitles();
    },

    validateJobTitle(title) {
      if (!title || !title.trim()) return { valid: false, message: "请输入岗位名称" };
      // 不再做名单校验，全部由 AI 审核
      return { valid: true, match: title.trim() };
    },

    // ==================== 评论暂存（改进版） ====================

    getPendingComments() {
      try {
        const data = localStorage.getItem(PENDING_COMMENTS_KEY);
        return data ? JSON.parse(data) : [];
      } catch { return []; }
    },
    savePendingComments(comments) {
      localStorage.setItem(PENDING_COMMENTS_KEY, JSON.stringify(comments));
    },

    /**
     * 从 localStorage 合并待同步评论到当前列表，并尝试写入 COS
     */
    async mergePendingComments() {
      const pending = this.getPendingComments();
      if (pending.length === 0) return;
      let changed = false;
      for (const pc of pending) {
        if (!this.comments.find((c) => c.id === pc.id)) {
          this.comments.push(pc);
          changed = true;
        }
      }
      if (changed && isWriteReady()) {
        try { await this.saveComments(); } catch (e) { console.warn("合并待同步评论后保存失败:", e.message); }
      }
      // 清空待同步列表
      this.savePendingComments([]);
    },

    async getCOSDataSafe(key) {
      try { return await getCOSData(key); }
      catch (e) { console.warn("COS读取失败:", key, e.message); return null; }
    },

    async addJob(type, job) {
      if (!job.company || !job.company.trim()) throw new Error("请输入公司名称");
      if (!job.title || !job.title.trim()) throw new Error("请输入岗位名称");
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

    /**
     * 添加评论并保存：
     * 1) 先添加到本地状态
     * 2) 保存到 localStorage 待同步列表（防止丢失）
     * 3) 如果有写权限，立即写入 COS
     * 这样即使 COS 暂时不可写，评论也不会丢失
     */
    async addComment(comment) {
      const newComment = { ...comment, id: Date.now().toString(), createdAt: new Date().toISOString() };
      // 1. 加入本地状态
      this.comments.unshift(newComment);
      // 2. 保存到 localStorage 待同步列表
      const pending = this.getPendingComments();
      pending.push(newComment);
      this.savePendingComments(pending);
      // 3. 如果有写权限，立即写入 COS
      if (isWriteReady()) {
        try {
          await this.saveComments();
          // 写入成功后清除待同步（注意：只清除已同步的评论）
          const remaining = this.getPendingComments().filter(
            (p) => !this.comments.find((c) => c.id === p.id)
          );
          this.savePendingComments(remaining);
        } catch (e) {
          console.warn("评论写入COS失败（已本地暂存，管理员同步时会自动发布）:", e.message);
        }
      }
    },
    async deleteComment(commentId) {
      this.comments = this.comments.filter((c) => c.id !== commentId);
      if (isWriteReady()) {
        try { await this.saveComments(); } catch (e) { console.warn("删除评论写入COS失败:", e.message); }
      }
    },

    async syncAllToCOS() {
      if (!isCOSReady()) throw new Error("COS 未初始化");
      await this.mergePendingComments();
      const results = [];
      for (const type of ["good", "medium", "bad"]) {
        await this.saveJobs(type);
        results.push(`${type}: ${this.jobs[type].length}条`);
      }
      await this.saveComments(); results.push(`评论: ${this.comments.length}条`);
      await this.saveCompanies(); results.push(`公司: ${this.companies.length}个`);
      await this.saveJobTitles(); results.push(`职位: ${this.jobTitles.length}个`);
      await syncPendingUsers();
      const pu = JSON.parse(localStorage.getItem("pending_users") || "[]");
      if (pu.length > 0) results.push(`用户待同步: ${pu.length}个`); else results.push("用户: 已同步");
      await this.saveSiteConfig(); results.push("站点配置");
      return results.join(" | ");
    },

        // 加载Promise，供其他组件等待

    async initApp() {
      if (this.dataLoaded) return;
      if (this._loadingPromise) return this._loadingPromise;
      this.loading = true;
      this._loadingPromise = (async () => {
        try {
          await initCOSSaved();
          await this.fetchSiteConfig();
          await Promise.all([
            this.fetchJobs("good"), this.fetchJobs("medium"), this.fetchJobs("bad"),
            this.fetchComments(), this.fetchCompanies(), this.fetchJobTitles(),
          ]);
          if (isCOSReady()) {
            await this.extractCompaniesFromJobs();
            await this.extractJobTitlesFromJobs();
          }
          this.dataLoaded = true;
        } catch (e) { console.error("数据加载失败:", e); }
        finally { this.loading = false; this._loadingPromise = null; }
      })();
      return this._loadingPromise;
    },

    async ensureDataLoaded() {
      if (this.dataLoaded) return;
      if (this._loadingPromise) await this._loadingPromise;
      else await this.initApp();
    },
  },
});





