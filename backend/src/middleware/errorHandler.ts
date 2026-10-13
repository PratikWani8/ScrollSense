import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error Handler]', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'record';
    res.status(409).json({
      error: `Duplicate entry for ${field}. Record already exists.`,
    });
    return;
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: `Invalid format for parameter ${err.path}.`,
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && env.NODE_ENV === 'production'
    ? 'Internal server error.'
    : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
