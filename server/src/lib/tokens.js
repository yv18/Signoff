import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { sha256, randomToken } from './crypto.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TTL
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function expiryDate() {
  return new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Issue a brand new refresh token, starting a new family. */
export async function issueRefreshToken(user, userAgent = '') {
  const raw = randomToken();
  const family = randomToken(16);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(raw),
    family,
    userAgent,
    expiresAt: expiryDate()
  });
  return raw;
}

/**
 * Rotate a refresh token.
 * Returns { user, token } on success, or throws with a `code` we translate
 * into a 401 upstream.
 */
export async function rotateRefreshToken(raw, userAgent = '') {
  const tokenHash = sha256(raw);
  const existing = await RefreshToken.findOne({ tokenHash }).populate('userId');

  if (!existing) {
    const err = new Error('Refresh token not recognised.');
    err.status = 401;
    throw err;
  }

  // Replay of an already-rotated token: assume theft, revoke the family.
  if (existing.usedAt || existing.revokedAt) {
    await RefreshToken.updateMany(
      { family: existing.family, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  if (existing.expiresAt < new Date()) {
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  existing.usedAt = new Date();
  await existing.save();

  const raw2 = randomToken();
  await RefreshToken.create({
    userId: existing.userId._id,
    tokenHash: sha256(raw2),
    family: existing.family,
    userAgent,
    expiresAt: expiryDate()
  });

  return { user: existing.userId, token: raw2 };
}

export async function revokeRefreshToken(raw) {
  if (!raw) return;
  await RefreshToken.updateOne(
    { tokenHash: sha256(raw) },
    { $set: { revokedAt: new Date() } }
  );
}

export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  };
}
