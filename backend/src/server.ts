import { buildApp } from './api/app.js';
import { connectMongo } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectMongo();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`API listening on port ${env.PORT}`);
}

main().catch((error) => {
  logger.error(error, 'API failed to start');
  process.exit(1);
});
