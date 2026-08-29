import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Field-level encryption for personal data at rest.
 *
 * Algorithm: AES-256-GCM (authenticated — tampering is detected on decrypt).
 * Stored format: enc:v1:<base64(iv | authTag | ciphertext)>
 *
 * Every value gets a fresh random 12-byte IV, so the same plaintext encrypts
 * to a different ciphertext each time. That is what we want for privacy, but
 * it means encrypted fields cannot be queried directly. For the one field we
 * must look up by (email), we also store a blind index — see hashLookup().
 */

const PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

function key() {
  const raw = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  if (raw.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  }
  return raw;
}

export function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  const text = String(plain);
  if (text.startsWith(PREFIX)) return text; // already encrypted, do not double-wrap

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(stored) {
  if (stored === null || stored === undefined || stored === '') return stored;
  const text = String(stored);
  if (!text.startsWith(PREFIX)) return text; // legacy plaintext, pass through

  try {
    const buf = Buffer.from(text.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered payload. Never leak ciphertext to the caller.
    return '';
  }
}

/**
 * Blind index: deterministic HMAC used only for equality lookups on encrypted
 * fields. Keyed with a separate secret so it cannot be brute-forced from the
 * encryption key alone, and never reversible back to the plaintext.
 */
export function hashLookup(value) {
  return crypto
    .createHmac('sha256', Buffer.from(env.LOOKUP_KEY, 'hex'))
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

/** SHA-256 of a refresh token, so raw tokens are never stored. */
export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Constant-time comparison, for anything sensitive we compare by hand. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
