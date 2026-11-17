const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a buffer to R2 and return the public URL.
 * @param {Buffer} buffer
 * @param {string} originalName  original filename (used to get extension)
 * @param {string} folder        e.g. 'products'
 */
async function uploadToR2(buffer, originalName, folder = 'products') {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const key = `${folder}/product_${Date.now()}${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeFromExt(ext),
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete an object from R2 by its full public URL.
 * Silently ignores errors (e.g. object already gone).
 */
async function deleteFromR2(publicUrl) {
  if (!publicUrl || !process.env.R2_PUBLIC_URL) return;
  try {
    const key = publicUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (_) {}
}

function mimeFromExt(ext) {
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  return map[ext] || 'application/octet-stream';
}

module.exports = { uploadToR2, deleteFromR2 };
