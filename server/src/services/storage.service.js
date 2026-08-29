import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

/**
 * Storage adapter.
 *
 *   STORAGE_DRIVER=local  — write to disk under UPLOAD_DIR, serve via /static.
 *                           Fine for dev and a single box.
 *   STORAGE_DRIVER=s3     — S3-compatible object storage (Cloudflare R2, AWS S3,
 *                           Backblaze B2, Supabase, MinIO). The signature GIF and
 *                           icons then live on a public CDN URL, so pasted
 *                           signatures work regardless of where the app runs.
 *
 * `put()` and `publicUrl()` always return the browser-facing URL for a key.
 */

const isS3 = env.STORAGE_DRIVER === 's3';
const root = path.resolve(process.cwd(), env.UPLOAD_DIR);

let _s3;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT || undefined, // R2 / B2 / MinIO need this; AWS derives it
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
  }
  return _s3;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/** The public base every stored object's URL is built from. */
function publicBase() {
  return isS3
    ? env.S3_PUBLIC_BASE_URL.replace(/\/+$/, '')
    : `${env.PUBLIC_URL.replace(/\/+$/, '')}/static`;
}

/** The public URL a browser (or Gmail's image proxy) uses to fetch `key`. */
export function publicUrl(key) {
  return `${publicBase()}/${key.replace(/^\/+/, '')}`;
}

/**
 * Turn a public URL we previously handed out back into its storage key, or ''
 * if it isn't one of ours. Used to delete a user's blobs on account removal.
 */
export function keyFromUrl(url) {
  const u = String(url || '');
  const base = publicBase();
  return u.startsWith(base) ? u.slice(base.length).replace(/^\/+/, '') : '';
}

export async function put(key, buffer, contentType = 'application/octet-stream') {
  if (isS3) {
    await s3().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );
    return publicUrl(key);
  }

  const full = path.join(root, key);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, buffer);
  return publicUrl(key);
}

export async function remove(key) {
  if (isS3) {
    await s3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key })).catch(() => {});
    return;
  }
  await fs.rm(path.join(root, key), { force: true });
}

export const localRoot = root;
