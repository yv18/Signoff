export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500 && status !== 503) console.error(err);

  // Duplicate key on emailHash
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That email is already registered.' });
  }

  // Hide internals for unexpected 5xx, but keep the message for intentional
  // signals like 503 "service busy, retry".
  const generic = status >= 500 && status !== 503;
  res.status(status).json({
    error: generic ? 'Something went wrong on our end.' : err.message,
    ...(err.details ? { details: err.details } : {})
  });
}

export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
