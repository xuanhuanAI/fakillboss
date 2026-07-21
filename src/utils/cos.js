/* COS配置工具 - 完整版：匿名读 + 公共SDK写 */
let COS_CONFIG = { Bucket: "qwertyuiop-1454067625", Region: "ap-guangzhou" };
let cosInstance = null;
let writeInstance = null;
let publicConfigLoaded = false;

const STORAGE_KEY = "cos_config";

export function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

async function loadPublicConfig() {
  if (publicConfigLoaded) return;

  // 1. 从 cos-config.json 获取 Bucket/Region
  try {
    const res = await fetch("./cos-config.json");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.Bucket && cfg.Bucket !== "your-bucket-1250000000") {
        COS_CONFIG.Bucket = cfg.Bucket;
        COS_CONFIG.Region = cfg.Region || COS_CONFIG.Region;
      }
    }
  } catch (e) {}

  // 2. 从 COS 读取写入凭据（管理员之前保存的 config/write-creds.json）
  try {
    const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/config/write-creds.json`;
    const res = await fetch(url);
    if (res.ok) {
      const creds = await res.json();
      if (creds.SecretId && creds.SecretKey) {
        const COSSDK = await import("cos-js-sdk-v5");
        writeInstance = new COSSDK.default({
          SecretId: creds.SecretId,
          SecretKey: creds.SecretKey,
        });
      }
    }
  } catch (e) {}

  publicConfigLoaded = true;
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

  // ★ 把凭据写入 COS，供所有用户读取后用 SDK 写入
  try {
    await cosInstance.putObject({
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: "config/write-creds.json",
      Body: JSON.stringify({ SecretId: config.SecretId, SecretKey: config.SecretKey }),
      ContentType: "application/json",
    });
    console.log("写入凭据已同步到COS");
  } catch (e) {
    console.warn("写入凭据同步失败:", e.message);
  }

  return cosInstance;
}

export function getCOSConfig() { return COS_CONFIG; }

function getWriter() {
  if (cosInstance) return cosInstance;
  return writeInstance;
}

/** 读取 COS 数据 */
export async function getCOSData(key) {
  if (!publicConfigLoaded) await loadPublicConfig();

  // SDK 模式（管理员）
  if (cosInstance) {
    return new Promise((resolve, reject) => {
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
    });
  }

  // 匿名 GET 模式
  const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("读取失败: HTTP " + res.status);
  return await res.json();
}

/** 写入 COS 数据 */
export function putCOSData(key, data) {
  return new Promise((resolve, reject) => {
    const writer = getWriter();
    if (!writer) {
      reject(new Error("暂无写入权限"));
      return;
    }
    writer.putObject(
      {
        Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region,
        Key: key, Body: JSON.stringify(data), ContentType: "application/json",
      },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    const writer = getWriter();
    if (!writer) { reject(new Error("暂无写入权限")); return; }
    writer.deleteObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

export function uploadFile(key, file) {
  return new Promise((resolve, reject) => {
    const writer = getWriter();
    if (!writer) { reject(new Error("暂无写入权限")); return; }
    writer.putObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key, Body: file },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

export async function initCOSSaved() {
  await loadPublicConfig();
  const saved = loadSavedConfig();
  if (saved && saved.SecretId && saved.SecretKey) {
    await initCOS(saved);
    return true;
  }
  return false;
}
