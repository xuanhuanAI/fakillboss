import { getCOSData, putCOSData } from "./cos";
import { isCOSReady } from "./cos";

export const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
  role: "admin",
  nickname: "管理员",
  phone: "",
  realName: "管理员",
};

const PENDING_USERS_KEY = "pending_users";

function getPendingUsers() {
  try { const d = localStorage.getItem(PENDING_USERS_KEY); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
function savePendingUsers(u) { localStorage.setItem(PENDING_USERS_KEY, JSON.stringify(u)); }

export async function getUsers() {
  let cosUsers = [];
  try { const d = await getCOSData("data/users.json"); cosUsers = d || []; } catch {}
  const pending = getPendingUsers();
  const all = [...cosUsers, ...pending];
  if (!all.find(u => u.username === DEFAULT_ADMIN.username)) all.push(DEFAULT_ADMIN);
  return all;
}

export async function saveUsers(users) {
  if (isCOSReady()) { await putCOSData("data/users.json", users); savePendingUsers([]); }
}

export async function login(username, password) {
  const users = await getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) { const { password: _, ...safe } = user; return safe; }
  return null;
}

/** 手机号 + 验证码登录/找回密码 */
export async function loginByPhone(phone) {
  const users = await getUsers();
  const user = users.find(u => u.phone === phone);
  if (!user) throw new Error("该手机号未注册");
  const { password: _, ...safe } = user;
  return safe;
}

export async function register(username, password, nickname, realName, phone) {
  const users = await getUsers();
  if (users.find(u => u.username === username)) throw new Error("用户名已存在");
  if (phone && users.find(u => u.phone === phone)) throw new Error("该手机号已注册");
  const newUser = { username, password, nickname: nickname || username, realName: realName || "", phone: phone || "", role: "user", createdAt: new Date().toISOString() };
  if (isCOSReady()) { users.push(newUser); await putCOSData("data/users.json", users); }
  else { const p = getPendingUsers(); if (p.find(u => u.username === username)) throw new Error("用户名已存在"); p.push(newUser); savePendingUsers(p); }
  const { password: _, ...safe } = newUser;
  return safe;
}

/** 通过手机号重置密码 */
export async function resetPasswordByPhone(phone, newPassword) {
  if (!isCOSReady()) throw new Error("请先由管理员配置COS");
  const users = await getUsers();
  const idx = users.findIndex(u => u.phone === phone);
  if (idx === -1) throw new Error("该手机号未注册");
  users[idx].password = newPassword;
  await putCOSData("data/users.json", users);
}

export async function syncPendingUsers() {
  if (!isCOSReady()) throw new Error("COS 未初始化");
  const pending = getPendingUsers();
  if (pending.length === 0) return 0;
  let cosUsers = [];
  try { const d = await getCOSData("data/users.json"); cosUsers = d || []; } catch {}
  let added = 0;
  for (const pu of pending) { if (!cosUsers.find(u => u.username === pu.username)) { cosUsers.push(pu); added++; } }
  if (added > 0) await putCOSData("data/users.json", cosUsers);
  savePendingUsers([]);
  return added;
}

export async function getAllUsers() { return await getUsers(); }

export async function updateUserRole(username, newRole) {
  if (!isCOSReady()) throw new Error("COS 未初始化");
  const users = await getUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) throw new Error("用户不存在");
  if (users[idx].username === DEFAULT_ADMIN.username) throw new Error("不能修改系统管理员");
  users[idx].role = newRole;
  await putCOSData("data/users.json", users);
}

export async function deleteUser(username) {
  if (!isCOSReady()) throw new Error("COS 未初始化");
  const users = await getUsers();
  if (!users.find(u => u.username === username)) throw new Error("用户不存在");
  if (users.find(u => u.username === username).role === "admin") throw new Error("不能删除管理员");
  await putCOSData("data/users.json", users.filter(u => u.username !== username));
}
