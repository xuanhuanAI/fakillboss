/* COS配置工具 */
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
  if (cosInstance) return cosInstance;
  return null;
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

function cosReady() {
  const cos = getCOS();
  if (!cos) throw new Error(\'COS \u672a\u521d\u59cb\u5316\uff0c\u8bf7\u5728\u7ba1\u7406\u540e\u53f0\u914d\u7f6e\u5bc6\u94a5\');
  return cos;
}

export function getCOSData(key) {
  return new Promise((resolve, reject) => {
    try {
      const cos = cosReady();
      cos.getObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
      }, (err, data) => {
        if (err) {
          if (err.code === \'NoSuchKey\' || err.statusCode === 404) resolve(null);
          else reject(err);
        } else {
          try { resolve(JSON.parse(data.Body)); }
          catch { resolve(data.Body); }
        }
      });
    } catch (e) { reject(e); }
  });
}

export function putCOSData(key, data) {
  return new Promise((resolve, reject) => {
    try {
      const cos = cosReady();
      cos.putObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: \'application/json\',
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    } catch (e) { reject(e); }
  });
}

export function deleteCOSData(key) {
  return new Promise((resolve, reject) => {
    try {
      const cos = cosReady();
      cos.deleteObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    } catch (e) { reject(e); }
  });
}

export function uploadFile(key, file) {
  return new Promise((resolve, reject) => {
    try {
      const cos = cosReady();
      cos.putObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: key,
        Body: file,
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    } catch (e) { reject(e); }
  });
}
