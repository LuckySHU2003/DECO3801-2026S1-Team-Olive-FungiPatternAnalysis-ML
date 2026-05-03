import type { FastifyInstance } from 'fastify';
import { ResultService } from '../../services/ResultService.js';

export async function resultRoutes(app: FastifyInstance) {
  const resultService = new ResultService();

  app.get('/results/:resultId', async (request, reply) => {
    const { resultId } = request.params as { resultId: string };
    const result = await resultService.getResult(resultId);
    if (!result) return reply.code(404).send({ error: 'Result not found' });
    return result;
  });
}
