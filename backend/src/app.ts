import cors from 'cors';
import express, { type Express } from 'express';
import type { Database } from 'better-sqlite3';
import { getEnv } from './config/env.js';
import { buildContainer } from './container.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application around a database handle.
 *
 * Taking the database as an argument (rather than opening one inside) is what
 * lets the integration suite run the real app against a throwaway file, and
 * would let a future worker process share the same wiring.
 */
export function createApp(db: Database): Express {
  const env = getEnv();
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', createApiRouter(buildContainer(db)));

  // Order matters: unmatched routes first, then the error translator last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
