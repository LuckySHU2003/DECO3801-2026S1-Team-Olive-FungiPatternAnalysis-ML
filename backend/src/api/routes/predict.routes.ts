import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InferenceService } from '../../services/InferenceService.js';

const PredictBodySchema = z.object({
  model_id: z.string().optional(),
  prediction_window: z.number().optional(),
  parameters: z.record(z.unknown()).optional()
});

export async function predictRoutes(app: FastifyInstance) {
  const inferenceService = new InferenceService();

  app.post('/predict/:datasetId', async (request, reply) => {
    const { datasetId } = request.params as { datasetId: string };
    const body = PredictBodySchema.parse(request.body ?? {});
    const job = await inferenceService.requestPrediction(datasetId, body);
    return reply.code(202).send(job);
  });
}
