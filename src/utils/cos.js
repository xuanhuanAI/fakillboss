/* COS配置工具 - 支持匿名读取 */
const COS_CONFIG = {
  Bucket: 'your-bucket-1250000000',
  Region: 'ap-guangzhou',
};

let cosInstance = null;

const STORAGE_KEY = 'cos_config';

export function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      COS_CONFIG.Bucket = config.Bucket || COS_CONFIG.Bucket;
      COS_CONFIG.Region = config.Region || COS_CONFIG.Region;
      return config;
    }
  } catch (e) {}
  return null;
}

export function getCOS() {
  return cosInstance;
}

export async function initCOS(config) {
  const COSSDK = await import('cos-js-sdk-v5');
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

/** COS 公开读取的基础 URL */
function getCOSPublicBaseURL() {
  return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/`;
}

/**
 * 读取 COS 数据 - 支持两种模式：
 * 1. SDK 模式（管理员已配置密钥时使用）
 * 2. 匿名 HTTP GET 模式（普通访客使用，需存储桶开启公有读）
 */
export function getCOSData(key) {
  return new Promise((resolve, reject) => {
    // 模式1：SDK 已初始化，用 SDK 读取
    if (cosInstance) {
      cosInstance.getObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
      }, (err, data) => {
        if (err) {
          if (err.code === 'NoSuchKey' || err.statusCode === 404) resolve(null);
          else reject(err);
        } else {
          try { resolve(JSON.parse(data.Body)); }
          catch { resolve(data.Body); }
        }
      });
      return;
    }

    // 模式2：SDK 未初始化，用匿名 HTTP GET（存储桶需开启公有读）
    const url = getCOSPublicBaseURL() + key;
    fetch(url)
      .then(res => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('COS 读取失败: HTTP ' + res.status);
        return res.json();
      })
      .then(data => resolve(data))
      .catch(err => reject(err));
  });
}

/** 写入 COS 数据 - 必须使用 SDK（需管理员已配置密钥） */
export function putCOSData(key, data) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error('COS 未初始化，请在管理后台配置密钥'));
      return;
    }
    cosInstance.putObject({
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/** 删除 COS 数据 - 必须使用 SDK */
export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error('COS 未初始化，请在管理后台配置密钥'));
      return;
    }
    cosInstance.deleteObject({
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: key,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/** 上传文件到 COS - 必须使用 SDK */
export function uploadFile(key, file) {
  return new Promise((resolve, reject) => {
    if (!cosInstance) {
      reject(new Error('COS 未初始化，请在管理后台配置密钥'));
      return;
    }
    cosInstance.putObject({
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: key,
      Body: file,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/** 尝试从 localStorage 加载配置并初始化 COS */
export async function initCOSSaved() {
  const saved = loadSavedConfig();
  if (saved && saved.SecretId && saved.SecretKey) {
    await initCOS(saved);
    return true;
  }
  return false;
}
