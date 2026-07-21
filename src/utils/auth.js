import { getCOSData, putCOSData } from "./cos";
import { isCOSReady } from "./cos";

export const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
  role: "admin",
  nickname: "管理员",
};

const PENDING_USERS_KEY = "pending_users";

function getPendingUsers() {
  try {
    const data = localStorage.getItem(PENDING_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function savePendingUsers(users) {
  localStorage.setItem(PENDING_USERS_KEY, JSON.stringify(users));
}

/** 获取所有用户（包含COS + 本地待同步 + 默认管理员） */
export async function getUsers() {
  let cosUsers = [];
  try {
    const data = await getCOSData("data/users.json");
    cosUsers = data || [];
  } catch { /* 使用默认管理员 */ }
  
  // 合并本地待同步的用户
  const pending = getPendingUsers();
  const allUsers = [...cosUsers, ...pending];
  
  // 确保默认管理员存在
  if (!allUsers.find((u) => u.username === DEFAULT_ADMIN.username)) {
    allUsers.push(DEFAULT_ADMIN);
  }
  return allUsers;
}

/** 保存用户到 COS（管理员可用），否则暂存到本地 */
export async function saveUsers(users) {
  if (isCOSReady()) {
    await putCOSData("data/users.json", users);
    // 清空本地暂存
    savePendingUsers([]);
  } else {
    // 普通用户：只保存当前新增的待同步用户
    // 但 writeUsers 已经包含了完整列表，我们只存 pending 部分
  }
}

/** 登录 */
export async function login(username, password) {
  const users = await getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

/** 注册 - COS可用时直接写入，否则暂存到本地等待管理员同步 */
export async function register(username, password, nickname) {
  const users = await getUsers();
  if (users.find((u) => u.username === username)) {
    throw new Error("用户名已存在");
  }
  const newUser = {
    username,
    password,
    nickname: nickname || username,
    role: "user",
    createdAt: new Date().toISOString(),
  };

  if (isCOSReady()) {
    // 管理员注册：直接写入 COS
    users.push(newUser);
    await putCOSData("data/users.json", users);
  } else {
    // 普通用户注册：暂存到本地
    const pending = getPendingUsers();
    // 检查 pending 中是否已有相同用户名
    if (pending.find((u) => u.username === username)) {
      throw new Error("用户名已存在");
    }
    pending.push(newUser);
    savePendingUsers(pending);
  }

  const { password: _, ...safeUser } = newUser;
  return safeUser;
}

/** 同步本地待处理用户到 COS（管理员调用） */
export async function syncPendingUsers() {
  if (!isCOSReady()) throw new Error("COS 未初始化");
  const pending = getPendingUsers();
  if (pending.length === 0) return 0;
  
  // 读取现有 COS 用户
  let cosUsers = [];
  try {
    const data = await getCOSData("data/users.json");
    cosUsers = data || [];
  } catch {}
  
  let added = 0;
  for (const pu of pending) {
    if (!cosUsers.find((u) => u.username === pu.username)) {
      cosUsers.push(pu);
      added++;
    }
  }
  
  if (added > 0) {
    await putCOSData("data/users.json", cosUsers);
  }
  savePendingUsers([]);
  return added;
}

export async function getAllUsers() {
  return await getUsers();
}

export async function updateUserRole(username, newRole) {
  if (!isCOSReady()) throw new Error("COS 未初始化，请先由管理员配置密钥");
  const users = await getUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) throw new Error("用户不存在");
  if (users[idx].role === "admin") throw new Error("不能修改管理员角色");
  if (users[idx].username === DEFAULT_ADMIN.username) throw new Error("不能修改系统管理员");
  users[idx].role = newRole;
  await putCOSData("data/users.json", users.filter((u) => u.username !== DEFAULT_ADMIN.username || u.role !== "admin"));
  // 确保管理员保留
  if (!users.find((u) => u.username === DEFAULT_ADMIN.username)) {
    users.push(DEFAULT_ADMIN);
  }
  await putCOSData("data/users.json", users);
}

export async function deleteUser(username) {
  if (!isCOSReady()) throw new Error("COS 未初始化");
  const users = await getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error("用户不存在");
  if (user.role === "admin") throw new Error("不能删除管理员");
  await putCOSData("data/users.json", users.filter((u) => u.username !== username));
}
