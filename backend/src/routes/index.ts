import { Router } from 'express';
import type { Container } from '../container.js';
import { createAuthRouter } from './authRoutes.js';
import { createPurchaseRouter, createVehicleRouter } from './vehicleRoutes.js';
import { sendSuccess } from '../utils/http.js';

/** Mounts every feature router under /api. */
export function createApiRouter(container: Container): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  router.use('/auth', createAuthRouter(container.authController));
  router.use('/vehicles', createVehicleRouter(container.vehicleController));
  router.use('/purchases', createPurchaseRouter(container.vehicleController));

  return router;
}
