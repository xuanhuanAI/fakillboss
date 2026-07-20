/* COS config */
const COS_CONFIG = {
  Bucket: 'your-bucket-1250000000',
  Region: 'ap-guangzhou',
};
let cosInstance = null;
export function getCOS() {
  if (cosInstance) return cosInstance;
  return null;
}
