import type { ErrorRequestHandler, RequestHandler } from 'express';
import { getEnv } from '../config/env.js';
import { AppError, NotFoundError } from '../utils/errors.js';

/** Terminal 404 handler: anything that fell through the router. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};

/**
 * The single place where an error becomes an HTTP response.
 *
 * Known AppErrors keep their status and message. Everything else is treated
 * as a bug: it is logged server-side and reported as a generic 500, so stack
 * traces and SQL never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  // body-parser raises this for a malformed JSON payload.
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
    });
    return;
  }

  if (getEnv().NODE_ENV !== 'test') {
    console.error('[unhandled error]', error);
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' },
  });
};
