import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const errors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[validate]', req.method, req.originalUrl, errors);
    }
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.validated = result.data;
  next();
};
