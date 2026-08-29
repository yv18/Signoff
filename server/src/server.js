import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { verifyMailer } from './lib/mailer.js';

async function start() {
  await connectDb();
  verifyMailer(); // fire-and-forget: logs whether SMTP is reachable
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Signoff API listening on port ${env.PORT} (${env.NODE_ENV}) — public URL ${env.PUBLIC_URL}`);
    if (!env.MAIL_ENABLED) console.log('Mail: SMTP not configured — OTP codes are logged and returned in dev responses.');
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
