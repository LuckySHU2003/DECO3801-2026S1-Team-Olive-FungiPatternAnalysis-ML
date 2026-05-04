import type { FastifyInstance } from 'fastify';
import { WorkspaceService } from '../../services/WorkspaceService.js';
import { customExplorationRequestSchema, detectPatternsRequestSchema, predictFutureRequestSchema } from '../../dto/workspace.dto.js';

export async function workspaceRoutes(app: FastifyInstance) {
  const service = new WorkspaceService();

  app.post('/workspace/jobs/detect-patterns', async (request, reply) => {
    const dto = detectPatternsRequestSchema.parse(request.body);
    const job = await service.createDetectPatternsJob(dto);
    return reply.code(202).send(job);
  });

  app.post('/workspace/jobs/custom-exploration', async (request, reply) => {
    const dto = customExplorationRequestSchema.parse(request.body);
    const job = await service.createCustomExplorationJob(dto);
    return reply.code(202).send(job);
  });

  app.post('/workspace/jobs/predict-future', async (request, reply) => {
    const dto = predictFutureRequestSchema.parse(request.body);
    const job = await service.createPredictFutureJob(dto);
    return reply.code(202).send(job);
  });
}
