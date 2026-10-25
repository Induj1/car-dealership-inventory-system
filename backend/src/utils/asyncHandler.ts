import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch rejected promises from async handlers, which would
 * leave a request hanging. Wrapping every async route in this forwards the
 * rejection to the error middleware instead.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
