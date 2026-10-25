import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { openDatabase } from './db/index.js';

/** Process entry point: open the database, start listening, shut down cleanly. */
function main(): void {
  const env = getEnv();
  const db = openDatabase(env.DATABASE_PATH);
  const app = createApp(db);

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`Database: ${env.DATABASE_PATH}`);
  });

  const shutdown = (signal: string) => () => {
    console.log(`\n${signal} received, shutting down`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

main();
