/* COS配置工具 - 完整版 */
let COS_CONFIG = { Bucket: "qwertyuiop-1454067625", Region: "ap-guangzhou" };
let cosInstance = null;
let writeInstance = null;
let publicConfigLoaded = false;

const STORAGE_KEY = "cos_config";

/** 带超时的 fetch */
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

async function loadPublicConfig(retries = 2) {
  if (publicConfigLoaded) return;

  try {
    const res = await fetchWithTimeout("./cos-config.json");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.Bucket && cfg.Bucket !== "your-bucket-1250000000") {
        COS_CONFIG.Bucket = cfg.Bucket;
        COS_CONFIG.Region = cfg.Region || COS_CONFIG.Region;
      }
    }
  } catch (e) {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/config/write-creds.json`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const creds = await res.json();
        if (creds.SecretId && creds.SecretKey) {
          const COSSDK = await import("cos-js-sdk-v5");
          writeInstance = new COSSDK.default({
            SecretId: creds.SecretId,
            SecretKey: creds.SecretKey,
          });
        }
        break;
      } else if (res.status !== 404) {
        console.warn("获取write-creds失败: HTTP", res.status);
      }
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.warn("获取COS公共写入凭据失败（不影响读取）:", e.message);
    }
  }

  publicConfigLoaded = true;
}

export function getCOS() { return cosInstance; }
export function isCOSReady() { return cosInstance !== null; }

/** 是否有任何可用的写入实例（管理员SDK 或 公共写入SDK） */
export function isWriteReady() {
  return cosInstance !== null || writeInstance !== null;
}

export async function initCOS(config) {
  const COSSDK = await import("cos-js-sdk-v5");
  cosInstance = new COSSDK.default({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey,
  });
  COS_CONFIG.Bucket = config.Bucket || COS_CONFIG.Bucket;
  COS_CONFIG.Region = config.Region || COS_CONFIG.Region;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

  // 上传写入凭据供普通用户使用
  try {
    await cosInstance.putObject({
      Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region,
      Key: "config/write-creds.json",
      Body: JSON.stringify({ SecretId: config.SecretId, SecretKey: config.SecretKey }),
      ContentType: "application/json",
    });
    console.log("✅ 写入凭据已上传到COS");
  } catch (e) {
    console.warn("⚠️ 写入凭据同步失败（普通用户将无法写入评论）:", e.message);
    // 尝试用fetch写入（如果桶允许）
    try {
      const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/config/write-creds.json`;
      const res = await fetch(url, {
        method: "PUT",
        body: JSON.stringify({ SecretId: config.SecretId, SecretKey: config.SecretKey }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) console.log("✅ 写入凭据已通过fetch上传");
      else console.warn("fetch上传也失败: HTTP", res.status);
    } catch (e2) {
      console.warn("fetch上传也失败:", e2.message);
    }
  }
  return cosInstance;
}

export function getCOSConfig() { return COS_CONFIG; }

function getWriter() {
  if (cosInstance) return cosInstance;
  return writeInstance;
}

export async function getCOSData(key) {
  if (!publicConfigLoaded) await loadPublicConfig();

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

  const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`;
  const res = await fetchWithTimeout(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("读取失败: HTTP " + res.status);
  return await res.json();
}

export function putCOSData(key, data) {
  return new Promise((resolve, reject) => {
    const writer = getWriter();
    if (!writer) {
      // 无SDK写入能力时用fetch尝试（桶需开启公有写权限）
      const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`;
      fetchWithTimeout(url, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      })
        .then(r => r.ok ? resolve(r) : reject(new Error("写入失败 HTTP " + r.status)))
        .catch(e => reject(new Error("暂无写入权限（管理员请先在管理后台 > COS配置 保存密钥）")));
      return;
    }
    writer.putObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region,
        Key: key, Body: JSON.stringify(data), ContentType: "application/json" },
      (err, d) => { if (err) reject(err); else resolve(d); }
    );
  });
}

export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    const writer = getWriter();
    if (!writer) { reject(new Error("暂无删除权限")); return; }
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
