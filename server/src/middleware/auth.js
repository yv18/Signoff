import { verifyAccessToken } from '../lib/tokens.js';
import { User } from '../models/User.js';
import { ApiError, asyncRoute } from './error.js';

export const requireAuth = asyncRoute(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Sign in to continue.');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Your session expired. Sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account not found.');

  req.user = user;
  next();
});
