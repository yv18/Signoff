import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config();

// The GIF renderer (sharp -> librsvg -> fontconfig) needs to find a fonts.conf.
// On minimal Linux hosts the default lookup fails with
// "Fontconfig error: Cannot load default config file: No such file: (null)"
// and the text in the render comes out blank. If fontconfig is installed the
// config is at /etc/fonts; point at it when nothing else has. Harmless on
// Windows/macOS (they don't use fontconfig) and when fonts still aren't
// installed — that part is fixed in the Dockerfile / nixpacks.toml.
if (!process.env.FONTCONFIG_PATH && !process.env.FONTCONFIG_FILE && fs.existsSync('/etc/fonts')) {
  process.env.FONTCONFIG_PATH = '/etc/fonts';
}

const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'LOOKUP_KEY'
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\nMissing environment variables: ${missing.join(', ')}\n` +
    `Copy .env.example to .env and run "npm run keys" to generate secrets.\n`
  );
  process.exit(1);
}

// ENCRYPTION_KEY and LOOKUP_KEY are read as hex and must decode to exactly
// 32 bytes. Catch a malformed value here with a clear message instead of
// failing later inside a Mongoose setter as an opaque "Cast to String" error.
const hex32 = ['ENCRYPTION_KEY', 'LOOKUP_KEY'].filter(
  (k) => Buffer.from(process.env[k], 'hex').length !== 32
);
if (hex32.length) {
  console.error(
    `\nInvalid secret(s): ${hex32.join(', ')}\n` +
    `Each must be 64 hex characters (32 bytes). Run "npm run keys" and paste the\n` +
    `generated values into server/.env.\n`
  );
  process.exit(1);
}

// When STORAGE_DRIVER=s3, the object-storage credentials and public base URL are
// all mandatory — a half-configured driver would silently fall back to writing
// unreachable local files. Fail fast with a list of what's missing.
if (process.env.STORAGE_DRIVER === 's3') {
  const need = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];
  const gaps = need.filter((k) => !process.env[k]);
  if (gaps.length) {
    console.error(
      `\nSTORAGE_DRIVER=s3 but missing: ${gaps.join(', ')}\n` +
      `Fill in the S3 block in server/.env (see .env.example), or set\n` +
      `STORAGE_DRIVER=local to serve images from this box.\n`
    );
    process.exit(1);
  }
}

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5000';

/**
 * Whether PUBLIC_URL points somewhere the public internet (and Gmail's image
 * proxy) can actually reach. Signature images are served from PUBLIC_URL, so a
 * localhost / LAN value means every pasted signature shows broken images in
 * email even though it looks fine in the editor.
 */
const publicHost = (() => {
  try {
    const h = new URL(PUBLIC_URL).hostname;
    return !(
      h === 'localhost' ||
      h.endsWith('.local') ||
      h === '0.0.0.0' ||
      h === '::1' ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    );
  } catch {
    return false;
  }
})();

// Object storage serves the images from its own public URL, so an unreachable
// PUBLIC_URL doesn't matter then — only warn when the local driver is in use.
if (!publicHost && process.env.STORAGE_DRIVER !== 's3') {
  console.warn(
    `\n⚠  PUBLIC_URL is ${PUBLIC_URL} — not reachable from the public internet.\n` +
    `   Signatures will look right in the editor but their images (the GIF and\n` +
    `   the social icons) will NOT load when pasted into Gmail or Outlook,\n` +
    `   because those clients fetch images through their own servers.\n` +
    `   Fix: point PUBLIC_URL at a public HTTPS host (a deploy, or a tunnel\n` +
    `   like "cloudflared tunnel --url http://localhost:5000"), or set\n` +
    `   STORAGE_DRIVER=s3 with a bucket, then re-render.\n`
  );
}

/**
 * Gmail, Outlook and friends only let you send *as the authenticated mailbox*
 * (or a verified alias). A MAIL_FROM on a different domain gets rewritten or
 * bounced, so fall back to SMTP_USER for those hosts and say why.
 */
function mailFrom() {
  const host = (process.env.SMTP_HOST || '').toLowerCase();
  const user = process.env.SMTP_USER || '';
  const configured = process.env.MAIL_FROM || user || 'no-reply@signoff.app';
  const locked = /(gmail|googlemail|outlook|office365|hotmail|live)\./.test(host);
  const sameMailbox = user && configured.toLowerCase().includes(user.toLowerCase());
  if (locked && user && !sameMailbox) {
    console.warn(
      `\n⚠  MAIL_FROM (${configured}) can't be used with ${host} — it only sends as ${user}.\n` +
      `   Using "${process.env.APP_NAME || 'Signoff'} <${user}>" instead. Set MAIL_FROM to that\n` +
      `   address (or a verified "Send mail as" alias) to silence this.\n`
    );
    return `${process.env.APP_NAME || 'Signoff'} <${user}>`;
  }
  return configured;
}

// --- refresh-cookie transport --------------------------------------------
// Whether the cookie is marked Secure. On in production; force off with
// COOKIE_SECURE=false for a plain-HTTP localhost / Docker demo.
const cookieSecure =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === 'true'
    : (process.env.NODE_ENV || 'development') === 'production';

/**
 * SameSite mode for the refresh cookie.
 *
 * A cross-site `SameSite=None` cookie is a THIRD-PARTY cookie, and Chrome,
 * Safari and Firefox now block those by default — so a client on one domain
 * talking to an API on another gets bounced to sign-in on every reload because
 * the refresh cookie never comes back.
 *
 * The fix is to make the client reach the API on its OWN origin (a Vercel /
 * nginx rewrite that proxies `/api` to the API) and then set this to `lax`, so
 * the cookie is first-party. `strict` also works for the refresh call (it is a
 * same-origin request). Leave unset and it follows the old behaviour: `none`
 * when Secure, `lax` otherwise.
 */
const cookieSameSite =
  ['lax', 'strict', 'none'].find((v) => v === (process.env.COOKIE_SAMESITE || '').toLowerCase()) ||
  (cookieSecure ? 'none' : 'lax');

// Browsers reject `SameSite=None` unless the cookie is also `Secure`.
if (cookieSameSite === 'none' && !cookieSecure) {
  console.warn(
    '\n⚠  COOKIE_SAMESITE=none needs COOKIE_SECURE=true — browsers drop the\n' +
    '   combination. Falling back to SameSite=Lax.\n'
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TTL: process.env.ACCESS_TTL || '15m',
  REFRESH_TTL_DAYS: Number(process.env.REFRESH_TTL_DAYS || 30),

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  LOOKUP_KEY: process.env.LOOKUP_KEY,

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Same list, split and normalised for the CORS check: trailing slashes and
  // stray whitespace are the usual reason a deployed frontend still gets
  // "No 'Access-Control-Allow-Origin' header" despite CLIENT_ORIGIN being set.
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  PUBLIC_URL,
  PUBLIC_URL_IS_REACHABLE: publicHost,
  // Can email clients actually fetch the signature images? True when object
  // storage is configured (they're on a CDN) or PUBLIC_URL is a real host.
  ASSETS_REACHABLE:
    process.env.STORAGE_DRIVER === 's3'
      ? Boolean(process.env.S3_PUBLIC_BASE_URL)
      : publicHost,

  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',

  // S3-compatible object storage (Cloudflare R2, AWS S3, Backblaze B2, Supabase,
  // MinIO). Only read when STORAGE_DRIVER=s3. With this on, the rendered GIF and
  // social icons live on a public CDN URL, so pasted signatures load in Gmail /
  // Outlook no matter where — or whether — the API is deployed.
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  // The public base URL objects are served from (R2 r2.dev domain or a custom
  // domain; an S3 bucket website / CloudFront URL). No trailing slash needed.
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || '',
  // AWS S3 wants virtual-hosted-style; R2 / B2 / MinIO want path-style.
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE !== 'false',

  // --- email / OTP -------------------------------------------------------
  APP_NAME: process.env.APP_NAME || 'Signoff',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: mailFrom(),
  // Real SMTP only when a host + user are set; otherwise codes are logged and
  // returned in the dev response.
  MAIL_ENABLED: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),

  COOKIE_NAME: 'sg_rt',
  COOKIE_SECURE: cookieSecure,
  // 'lax' | 'strict' | 'none' — see the note above cookieSameSite.
  COOKIE_SAMESITE: cookieSameSite === 'none' && !cookieSecure ? 'lax' : cookieSameSite,
  // Optional explicit cookie Domain, e.g. ".signoff.app" so a session started on
  // app.signoff.app is also sent to api.signoff.app. Unset = host-only cookie.
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  isProd: (process.env.NODE_ENV || 'development') === 'production'
};
