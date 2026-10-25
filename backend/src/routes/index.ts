import { Router } from 'express';
import type { Container } from '../container.js';
import { createAuthRouter } from './authRoutes.js';
import { createPurchaseRouter, createVehicleRouter } from './vehicleRoutes.js';
import { createAuthRateLimiter, type RateLimitOptions } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Mounts every feature router under /api. */
export function createApiRouter(container: Container, rateLimit: RateLimitOptions): Router {
  const router = Router();

  // Unthrottled and unauthenticated on purpose: a load balancer polls this.
  router.get('/health', asyncHandler(container.healthController.check));

  // The throttle is applied here rather than inside the auth router, so that
  // "which routes are rate limited" is answered in the same place as "which
  // routes exist".
  router.use('/auth', createAuthRateLimiter(rateLimit), createAuthRouter(container.authController));
  router.use('/vehicles', createVehicleRouter(container.vehicleController));
  router.use('/purchases', createPurchaseRouter(container.vehicleController));

  return router;
}
