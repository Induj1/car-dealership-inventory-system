import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { getEnv } from '../config/env.js';

/**
 * Single-service mode, off unless SERVE_SPA is set.
 *
 * When enabled and a built frontend exists at SPA_DIST_PATH (default
 * ../frontend/dist), the API serves it too: hashed assets with a long cache
 * lifetime, and index.html for any non-API path so client-side routes survive
 * a refresh.
 *
 * Entirely optional, and deliberately opt-in rather than "on if the folder
 * happens to exist" - behaviour that changes depending on whether someone ran
 * a build is the kind of thing that makes an environment-specific bug. Running
 * the two apps separately in development is unchanged; this just lets a
 * deployment be one container instead of two, which removes a whole class of
 * CORS and origin configuration.
 */
export function serveSpa(app: Express): void {
  const env = getEnv();

  if (!env.SERVE_SPA) return;

  const distPath = resolveDistPath(env.SPA_DIST_PATH);

  if (!distPath) {
    console.warn(`SERVE_SPA is on but no built frontend was found at ${env.SPA_DIST_PATH}`);
    return;
  }

  // Hashed filenames, so the assets themselves can be cached hard.
  app.use(
    express.static(distPath, {
      index: false,
      maxAge: '1y',
      immutable: true,
    }),
  );

  // index.html must never be cached, or a deploy would not be picked up.
  app.get(/^(?!\/api\/).*/, (_req, res, next) => {
    res.sendFile(
      join(distPath, 'index.html'),
      { headers: { 'Cache-Control': 'no-cache' } },
      (error) => {
        if (error) next();
      },
    );
  });
}

function resolveDistPath(configured: string): string | null {
  const here = dirname(fileURLToPath(import.meta.url));

  const candidates = [
    resolve(process.cwd(), configured),
    // From dist/middleware/ at runtime, or src/middleware/ under tsx.
    resolve(here, '../../', configured),
    resolve(here, '../../../', configured),
  ];

  return candidates.find((candidate) => existsSync(join(candidate, 'index.html'))) ?? null;
}
