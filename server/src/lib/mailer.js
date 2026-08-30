import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Outbound email with backpressure.
 *
 * The registration endpoint must survive a flood (think 10k sign-ups at once)
 * without opening 10k connections or piling unbounded work in memory:
 *
 *   - one transport (Brevo HTTP API or a pooled SMTP connection), with a hard
 *     concurrency cap;
 *   - an in-process FIFO queue with a hard length cap — past QUEUE_MAX we reject
 *     with 503 so the caller backs off instead of the process growing until OOM;
 *   - workers limited to CONCURRENCY; failed sends retry a couple of times then
 *     are dropped and logged (the user can always ask for a new code).
 *
 * Transport is chosen by MAIL_PROVIDER (see config/env.js):
 *
 *   - brevo: HTTP API over :443. Required on hosts that block outbound SMTP
 *     ports (Railway, Render, most PaaS) — the tell-tale is "Connection
 *     timeout" on every SMTP send.
 *   - smtp:  pooled nodemailer on :587/:465.
 *   - neither configured: dev stub that logs the code (the controller also
 *     returns it in the response so local sign-up still works).
 *
 * For a multi-instance deployment, swap this queue for BullMQ on Redis — the
 * public API (`enqueueMail`) stays the same.
 */

const CONCURRENCY = 5;
const QUEUE_MAX = 5000;
const MAX_TRIES = 3;

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Brevo transactional-email API. Throws on any non-2xx so the queue retries. */
async function brevoSend(msg) {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { email: env.MAIL_FROM_EMAIL, name: env.MAIL_FROM_NAME },
      to: [{ email: msg.to }],
      subject: msg.subject,
      textContent: msg.text,
      htmlContent: msg.html
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json().catch(() => ({}));
  return { messageId: json.messageId || 'brevo' };
}

async function brevoVerify() {
  const res = await fetch('https://api.brevo.com/v3/account', {
    headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`account check returned ${res.status}`);
}

function buildTransport() {
  if (!env.MAIL_ENABLED) {
    return {
      name: 'dev',
      sendMail: async (msg) => {
        console.log(`\n[mail:dev] to=${msg.to} subject=${msg.subject}\n${msg.text}\n`);
        return { messageId: 'dev' };
      }
    };
  }

  if (env.MAIL_PROVIDER === 'brevo') {
    return { name: 'brevo', sendMail: brevoSend, verify: brevoVerify };
  }

  const smtp = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for 465, false for 587 (STARTTLS)
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: CONCURRENCY,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10 // <=10 messages/sec across the pool
  });
  return {
    name: 'smtp',
    sendMail: (msg) => smtp.sendMail(msg),
    verify: () => smtp.verify()
  };
}

const transporter = buildTransport();

const queue = [];
let active = 0;

function pump() {
  while (active < CONCURRENCY && queue.length > 0) {
    const item = queue.shift();
    active += 1;
    Promise.resolve()
      .then(() => transporter.sendMail(item.message))
      .catch((err) => {
        item.tries += 1;
        if (item.tries < MAX_TRIES) {
          queue.push(item); // requeue transient failures
        } else {
          console.error(`[mail] dropped after ${MAX_TRIES} tries -> ${item.message.to}: ${err.message}`);
        }
      })
      .finally(() => {
        active -= 1;
        setImmediate(pump);
      });
  }
}

/**
 * Hand a message to the queue. Returns immediately. Throws a 503-tagged error
 * only when the backlog is full, so the endpoint can shed load cleanly.
 */
export function enqueueMail(message) {
  if (queue.length >= QUEUE_MAX) {
    const err = new Error('Email service is busy. Please try again in a minute.');
    err.status = 503;
    throw err;
  }
  queue.push({ message, tries: 0 });
  setImmediate(pump);
}

export function mailQueueDepth() {
  return queue.length;
}

export async function verifyMailer() {
  if (env.MAIL_ENABLED && transporter.verify) {
    try {
      await transporter.verify();
      console.log(`${transporter.name} mail transport ready`);
    } catch (err) {
      console.warn(`${transporter.name} verify failed (${err.message}) — mail will retry per-message`);
    }
  }
}
