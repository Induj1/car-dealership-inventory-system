import type { Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Every successful response has the same shape:
 *   { "success": true, "data": <payload>, "meta": <optional> }
 *
 * and every failure:
 *   { "success": false, "error": { "code", "message", "details"? } }
 *
 * One envelope means the frontend needs exactly one response handler.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  meta?: Record<string, unknown>,
): void {
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

/**
 * Validates untrusted input against a schema, raising a ValidationError that
 * the error middleware renders as a 422 with a field-by-field breakdown.
 *
 * Parsing at the edge of the application is what lets services below assume
 * their inputs are already well-formed.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError('Validation failed', formatZodIssues(result.error));
  }

  return result.data;
}

function formatZodIssues(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
