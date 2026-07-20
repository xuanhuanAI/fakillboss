import { getCOSData, putCOSData } from './cos';

export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  nickname: '管理员',
};

export async function getUsers() {
  try {
    const data = await getCOSData('data/users.json');
    return data || [DEFAULT_ADMIN];
  } catch {
    return [DEFAULT_ADMIN];
  }
}

export async function saveUsers(users) {
  await putCOSData('data/users.json', users);
}

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

export async function register(username, password, nickname) {
  const users = await getUsers();
  if (users.find((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }
  const newUser = {
    username,
    password,
    nickname: nickname || username,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await saveUsers(users);
  const { password: _, ...safeUser } = newUser;
  return safeUser;
}

export async function getAllUsers() {
  return await getUsers();
}

export async function updateUserRole(username, newRole) {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) throw new Error('用户不存在');
  if (users[idx].role === 'admin') throw new Error('不能修改管理员角色');
  users[idx].role = newRole;
  await saveUsers(users);
}

export async function deleteUser(username) {
  const users = await getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('用户不存在');
  if (user.role === 'admin') throw new Error('不能删除管理员');
  await saveUsers(users.filter((u) => u.username !== username));
}
