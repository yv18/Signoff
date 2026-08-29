import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

/**
 * Storage adapter. The local driver writes to disk and is fine for
 * development and a single-box deploy. Swap STORAGE_DRIVER=s3 and fill in the
 * s3 branch when you move to object storage behind a CDN.
 */

const root = path.resolve(process.cwd(), env.UPLOAD_DIR);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function put(key, buffer, contentType = 'application/octet-stream') {
  if (env.STORAGE_DRIVER === 's3') {
    // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
    // await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
    // return `${env.CDN_BASE}/${key}`;
    throw new Error('S3 driver is not configured. Set STORAGE_DRIVER=local or implement this branch.');
  }

  const full = path.join(root, key);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, buffer);
  return `${env.PUBLIC_URL}/static/${key}`;
}

export async function remove(key) {
  if (env.STORAGE_DRIVER === 's3') return;
  await fs.rm(path.join(root, key), { force: true });
}

export const localRoot = root;
