import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Signature } from '../models/Signature.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { keyFromUrl, remove as removeObject } from '../services/storage.service.js';
import { hashLookup, sha256, safeEqual } from '../lib/crypto.js';
import { enqueueMail } from '../lib/mailer.js';
import { buildOtpEmail } from '../templates/otpEmail.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  refreshCookieOptions
} from '../lib/tokens.js';
import { env } from '../config/env.js';
import { ApiError, asyncRoute } from '../middleware/error.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(200)
    .regex(/[a-zA-Z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.')
});

export const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.')
});

export const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.')
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.')
});

function sendSession(res, user, refreshToken) {
  res.cookie(env.COOKIE_NAME, refreshToken, refreshCookieOptions());
  return {
    user: user.toPublic(),
    accessToken: signAccessToken(user)
  };
}

const sixDigit = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * Step 1 of sign-up: stash a bcrypt-hashed pending registration and email a
 * one-time code. Cheap and bounded — heavy work (the email) is queued, not
 * awaited, so a burst of requests returns fast and the mail queue absorbs it.
 */
export const registerStart = asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  const emailHash = hashLookup(email);

  if (await User.exists({ emailHash })) {
    throw new ApiError(409, 'That email is already registered. Sign in instead.');
  }

  const existing = await PendingRegistration.findOne({ emailHash });
  // Don't re-hash or re-send if a code went out seconds ago — just acknowledge.
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return res.status(202).json({ ok: true, email });
  }

  const code = sixDigit();
  const passwordHash = await bcrypt.hash(password, 12);

  await PendingRegistration.findOneAndUpdate(
    { emailHash },
    {
      emailHash,
      email,
      name,
      passwordHash,
      otpHash: sha256(code),
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  enqueueMail(buildOtpEmail(email, name, code)); // throws 503 only if the backlog is full

  res.status(202).json({
    ok: true,
    email,
    // Local dev without SMTP: hand back the code so sign-up still works.
    devCode: env.MAIL_ENABLED ? undefined : code
  });
});

/** Step 2: check the code, create the account, sign the user in. */
export const registerVerify = asyncRoute(async (req, res) => {
  const { email, code } = req.body;
  const emailHash = hashLookup(email);

  const pending = await PendingRegistration.findOne({ emailHash });
  if (!pending) throw new ApiError(400, 'No sign-up is waiting for that email. Start again.');

  if (pending.expiresAt.getTime() < Date.now()) {
    await pending.deleteOne();
    throw new ApiError(400, 'That code has expired. Start again.');
  }
  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await pending.deleteOne();
    throw new ApiError(429, 'Too many incorrect codes. Start again.');
  }
  if (!safeEqual(sha256(code), pending.otpHash)) {
    pending.attempts += 1;
    await pending.save();
    throw new ApiError(400, 'That code is not correct.');
  }

  if (await User.exists({ emailHash })) {
    await pending.deleteOne();
    throw new ApiError(409, 'That email is already registered. Sign in instead.');
  }

  const user = new User({ email: pending.email, name: pending.name, emailHash });
  user.passwordHash = pending.passwordHash; // already bcrypt-hashed at step 1
  await user.save();
  await pending.deleteOne();

  // Give every new account one signature to open in the editor.
  await Signature.create({ userId: user._id, fullName: pending.name, email: pending.email });

  const refreshToken = await issueRefreshToken(user, req.get('user-agent') || '');
  res.status(201).json(sendSession(res, user, refreshToken));
});

/** Ask for a fresh code for a pending sign-up. */
export const registerResend = asyncRoute(async (req, res) => {
  const { email } = req.body;
  const emailHash = hashLookup(email);
  const pending = await PendingRegistration.findOne({ emailHash });

  // Same answer whether or not a pending sign-up exists, and no-op inside the
  // cooldown, so this can't be used to probe accounts or to spam.
  if (pending && Date.now() - pending.lastSentAt.getTime() >= RESEND_COOLDOWN_MS) {
    const code = sixDigit();
    pending.otpHash = sha256(code);
    pending.attempts = 0;
    pending.lastSentAt = new Date();
    pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await pending.save();
    enqueueMail(buildOtpEmail(email, pending.name, code));
  }

  res.status(202).json({ ok: true });
});

export const login = asyncRoute(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email, true);
  // Same message either way, so the response cannot be used to discover
  // which email addresses have accounts.
  if (!user) throw new ApiError(401, 'Email or password is incorrect.');

  const ok = await user.verifyPassword(password);
  if (!ok) throw new ApiError(401, 'Email or password is incorrect.');

  user.lastLoginAt = new Date();
  await user.save();

  const refreshToken = await issueRefreshToken(user, req.get('user-agent') || '');
  res.json(sendSession(res, user, refreshToken));
});

export const refresh = asyncRoute(async (req, res) => {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (!raw) throw new ApiError(401, 'No active session.');

  const { user, token } = await rotateRefreshToken(raw, req.get('user-agent') || '');
  res.json(sendSession(res, user, token));
});

export const logout = asyncRoute(async (req, res) => {
  await revokeRefreshToken(req.cookies?.[env.COOKIE_NAME]);
  res.clearCookie(env.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

export const logoutAll = asyncRoute(async (req, res) => {
  await revokeAllForUser(req.user._id);
  res.clearCookie(env.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

export const me = asyncRoute(async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

/**
 * Delete the account and everything attached to it: signatures, rendered GIFs
 * and uploaded images, refresh tokens, any half-finished sign-up. Irreversible.
 */
export const deleteAccount = asyncRoute(async (req, res) => {
  const userId = req.user._id;
  const sigs = await Signature.find({ userId });

  // Best-effort blob cleanup — a missing object must not block the delete.
  const keys = sigs.flatMap((sig) => {
    const k = [keyFromUrl(sig.assets?.photoUrl), keyFromUrl(sig.assets?.logoUrl)];
    for (let v = 1; v <= (sig.render?.version || 0); v += 1) {
      k.push(`signatures/${sig._id}-v${v}.gif`);
    }
    return k.filter(Boolean);
  });
  await Promise.all(keys.map((k) => removeObject(k).catch(() => {})));

  await Signature.deleteMany({ userId });
  await RefreshToken.deleteMany({ userId });
  await PendingRegistration.deleteMany({ emailHash: req.user.emailHash });
  await User.deleteOne({ _id: userId });

  res.clearCookie(env.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});
