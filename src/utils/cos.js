/* COS配置工具 - 支持匿名读取 */
// ========== 默认配置（会被 cos-config.json 和 localStorage 覆盖） ==========
let COS_CONFIG = {
  Bucket: "",
  Region: "",
};

let cosInstance = null;
let publicConfigPromise = null;

const STORAGE_KEY = "cos_config";

/** 从 localStorage 加载管理员保存的配置 */
export function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      return config;
    }
  } catch (e) {}
  return null;
}

/** 从部署的静态文件获取公共桶配置 */
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

export function getCOS() {
  return cosInstance;
}

export function isCOSReady() {
  return cosInstance !== null;
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
  return cosInstance;
}

export function getCOSConfig() {
  return COS_CONFIG;
}

function getCOSPublicBaseURL() {
  return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/`;
}

/**
 * 读取 COS 数据 - 支持两种模式：
 * 1. SDK 模式（管理员已配置密钥时使用）
 * 2. 匿名 HTTP GET 模式（普通访客使用，需公开读权限）
 */
export function getCOSData(key) {
  return new Promise((resolve, reject) => {
    if (cosInstance) {
      // SDK模式
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
    // 匿名模式 - 先获取桶配置
    fetchPublicConfig()
      .then(() => {
        if (!COS_CONFIG.Bucket) {
          reject(new Error("COS 未配置"));
          return null;
        }
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

/** 写入 COS 数据 - 必须使用 SDK */
export function putCOSData(key, data) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error("COS 未初始化，请在管理后台配置密钥"));
      return;
    }
    cosInstance.putObject(
      {
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: "application/json",
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
}

export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error("COS 未初始化"));
      return;
    }
    cosInstance.deleteObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
}

export function uploadFile(key, file) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error("COS 未初始化"));
      return;
    }
    cosInstance.putObject(
      { Bucket: COS_CONFIG.Bucket, Region: COS_CONFIG.Region, Key: key, Body: file },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
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
