import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
  {
    path: "/good",
    name: "GoodJobs",
    component: () => import("@/views/GoodJobs.vue"),
  },
  {
    path: "/medium",
    name: "MediumJobs",
    component: () => import("@/views/MediumJobs.vue"),
  },
  {
    path: "/bad",
    name: "BadJobs",
    component: () => import("@/views/BadJobs.vue"),
  },
  {
    path: "/job/:type/:id",
    name: "JobDetail",
    component: () => import("@/views/JobDetail.vue"),
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/Register.vue"),
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/views/Admin.vue"),
    meta: { requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHashHistory("/fakillboss/"),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAdmin) {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (user.role !== "admin") {
      next({ name: "Login" });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;

