import dotenv from 'dotenv';
dotenv.config();

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

if (!publicHost) {
  console.warn(
    `\n⚠  PUBLIC_URL is ${PUBLIC_URL} — not reachable from the public internet.\n` +
    `   Signatures will look right in the editor but their images (the GIF and\n` +
    `   the social icons) will NOT load when pasted into Gmail or Outlook,\n` +
    `   because those clients fetch images through their own servers.\n` +
    `   Fix: point PUBLIC_URL at a public HTTPS host (a deploy, or a tunnel\n` +
    `   like "cloudflared tunnel --url http://localhost:5000"), then re-render.\n`
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

export const env = {
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
  PUBLIC_URL,
  PUBLIC_URL_IS_REACHABLE: publicHost,

  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',

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
  // Send the refresh cookie Secure + SameSite=None. Defaults to on in
  // production; override with COOKIE_SECURE=false for a plain-HTTP demo.
  COOKIE_SECURE:
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === 'true'
      : (process.env.NODE_ENV || 'development') === 'production',
  isProd: (process.env.NODE_ENV || 'development') === 'production'
};
