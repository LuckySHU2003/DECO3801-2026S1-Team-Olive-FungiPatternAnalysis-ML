import type { FastifyInstance } from 'fastify';
import { JobService } from '../../services/JobService.js';

export async function jobRoutes(app: FastifyInstance) {
  const jobService = new JobService();

  app.get('/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await jobService.getJob(jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return job;
  });
}
