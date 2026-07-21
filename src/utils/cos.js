/* COS配置工具 */
let COS_CONFIG = { Bucket: "", Region: "" };
let cosInstance = null;
let publicConfigPromise = null;

const STORAGE_KEY = "cos_config";

export function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

function fetchPublicConfig() {
  if (publicConfigPromise) return publicConfigPromise;
  publicConfigPromise = fetch("./cos-config.json")
    .then((res) => {
      if (!res.ok) throw new Error("找不到公共配置文件");
      return res.json();
    })
    .then((config) => {
      if (config.Bucket && config.Bucket !== "your-bucket-1250000000") {
        COS_CONFIG.Bucket = config.Bucket;
        COS_CONFIG.Region = config.Region || COS_CONFIG.Region;
      }
      return config;
    })
    .catch(() => {
      const saved = loadSavedConfig();
      if (saved && saved.Bucket) {
        COS_CONFIG.Bucket = saved.Bucket;
        COS_CONFIG.Region = saved.Region || COS_CONFIG.Region;
        return saved;
      }
      return null;
    });
  return publicConfigPromise;
}

export function getCOS() { return cosInstance; }
export function isCOSReady() { return cosInstance !== null; }

export async function initCOS(config) {
  const COSSDK = await import("cos-js-sdk-v5");
  cosInstance = new COSSDK.default({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey,
  });
  COS_CONFIG.Bucket = config.Bucket || COS_CONFIG.Bucket;
  COS_CONFIG.Region = config.Region || COS_CONFIG.Region;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return cosInstance;
}

export function getCOSConfig() { return COS_CONFIG; }

function getCOSPublicBaseURL() {
  return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/`;
}

/** 读取 COS 数据 */
export function getCOSData(key) {
  return new Promise((resolve, reject) => {
    if (cosInstance) {
      cosInstance.getObject(
        { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key },
        (err, data) => {
          if (err) {
            if (err.code === "NoSuchKey" || err.statusCode === 404) resolve(null);
            else reject(err);
          } else {
            try { resolve(JSON.parse(data.Body)); }
            catch { resolve(data.Body); }
          }
        }
      );
      return;
    }
    fetchPublicConfig()
      .then(() => {
        if (!COS_CONFIG.Bucket) { reject(new Error("COS 未配置")); return null; }
        return fetch(getCOSPublicBaseURL() + key);
      })
      .then((res) => {
        if (!res) return null;
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("读取失败: HTTP " + res.status);
        return res.json();
      })
      .then((data) => resolve(data))
      .catch((err) => reject(err));
  });
}

/**
 * 写入 COS 数据 - 三级机制：
 * 1. SDK 模式（管理员）
 * 2. 匿名 HTTP PUT（存储桶需开启"公有读写"）
 * 3. 失败返回错误（调用方自己处理暂存）
 */
export async function putCOSData(key, data) {
  // 先确保桶配置已加载
  if (!COS_CONFIG.Bucket) {
    await fetchPublicConfig();
  }
  if (!COS_CONFIG.Bucket) {
    throw new Error("COS 未配置");
  }

  // 一级：SDK 模式
  if (cosInstance) {
    return new Promise((resolve, reject) => {
      cosInstance.putObject(
        {
          Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region,
          Key: key, Body: JSON.stringify(data), ContentType: "application/json",
        },
        (err, d) => { if (err) reject(err); else resolve(d); }
      );
    });
  }

  // 二级：匿名 HTTP PUT（需存储桶开启"公有读写"，无需子账号）
  const url = getCOSPublicBaseURL() + key;
  const res = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("写入失败: HTTP " + res.status + "（请将存储桶权限改为[公有读写]）");
  }
  return res;
}

/** 删除 COS 数据 - 必须用 SDK */
export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) { reject(new Error("COS 未初始化")); return; }
    cosInstance.deleteObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

export function uploadFile(key, file) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) { reject(new Error("COS 未初始化")); return; }
    cosInstance.putObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key, Body: file },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

/** 尝试从 localStorage 加载配置并初始化 COS */
export async function initCOSSaved() {
  const saved = loadSavedConfig();
  if (saved && saved.SecretId && saved.SecretKey) {
    await initCOS(saved);
    return true;
  }
  await fetchPublicConfig();
  return false;
}
