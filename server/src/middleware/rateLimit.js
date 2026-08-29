import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down a moment and try again.' }
});

export const renderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many renders. Wait a minute and try again.' }
});

// OTP requests are expensive (bcrypt + an email) and abusable (spam / probing),
// so hold them tighter than the general auth limiter. Tune per deployment with
// OTP_MAX_PER_HOUR.
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.OTP_MAX_PER_HOUR || 6),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification emails from this network. Try again later.' }
});
