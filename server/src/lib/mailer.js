import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Outbound email with backpressure.
 *
 * The registration endpoint must survive a flood (think 10k sign-ups at once)
 * without opening 10k SMTP sockets or piling unbounded work in memory:
 *
 *   - one pooled transport, capped at MAX_CONNECTIONS sockets, with nodemailer's
 *     own per-second rate limiter;
 *   - an in-process FIFO queue with a hard length cap — past QUEUE_MAX we reject
 *     with 503 so the caller backs off instead of the process growing until OOM;
 *   - workers limited to CONCURRENCY; failed sends retry a couple of times then
 *     are dropped and logged (the user can always ask for a new code).
 *
 * For a multi-instance deployment, swap this queue for BullMQ on Redis — the
 * public API (`enqueueMail`) stays the same.
 */

const CONCURRENCY = 5;
const QUEUE_MAX = 5000;
const MAX_TRIES = 3;

let transporter;
if (env.MAIL_ENABLED) {
  transporter = nodemailer.createTransport({
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
} else {
  // Dev fallback: don't send, just print. The controller also returns the code
  // in the response when mail is disabled so local sign-up still works.
  transporter = {
    sendMail: async (msg) => {
      console.log(`\n[mail:dev] to=${msg.to} subject=${msg.subject}\n${msg.text}\n`);
      return { messageId: 'dev' };
    }
  };
}

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
      console.log('SMTP transport ready');
    } catch (err) {
      console.warn(`SMTP verify failed (${err.message}) — mail will retry per-message`);
    }
  }
}
