import { ApiError } from './error.js';

/** Validate req.body against a zod schema and replace it with the parsed value. */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message
    }));
    return next(new ApiError(422, 'Check the highlighted fields.', details));
  }
  req.body = result.data;
  next();
};
