import type { FastifyInstance } from 'fastify';
import { JobService } from '../../services/JobService.js';

export async function jobRoutes(app: FastifyInstance) {
  const service = new JobService();

  app.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (request) => {
    return service.getJob(request.params.jobId);
  });
}
