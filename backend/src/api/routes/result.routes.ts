import type { FastifyInstance } from 'fastify';
import { ResultService } from '../../services/ResultService.js';

export async function resultRoutes(app: FastifyInstance) {
  const service = new ResultService();

  app.get<{ Params: { resultId: string } }>('/results/:resultId', async (request) => {
    return service.getResult(request.params.resultId);
  });
}
