import { buildApp } from './api/app.js';
import { connectMongo } from './config/db.js';
import { env } from './config/env.js';

async function main() {
  await connectMongo();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`API listening on port ${env.PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
