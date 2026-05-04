import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { datasetRoutes } from './routes/dataset.routes.js';
import { workspaceRoutes } from './routes/workspace.routes.js';
import { jobRoutes } from './routes/job.routes.js';
import { resultRoutes } from './routes/result.routes.js';
import { chatRoutes } from './routes/chat.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN });
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  app.get('/health', async () => ({ ok: true }));

  await app.register(datasetRoutes);
  await app.register(workspaceRoutes);
  await app.register(jobRoutes);
  await app.register(resultRoutes);
  await app.register(chatRoutes);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation failed', details: error.flatten() });
    }

    const err = error as Error & { statusCode?: number };
    return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Internal server error' });
  });

  return app;
}
