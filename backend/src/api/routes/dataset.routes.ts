import type { FastifyInstance } from 'fastify';
import { DatasetService } from '../../services/DatasetService.js';

export async function datasetRoutes(app: FastifyInstance) {
  const service = new DatasetService();

  app.post('/datasets/upload', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'file is required' });
    const dataset = await service.uploadDataset(file);
    return reply.code(201).send(dataset);
  });

  app.get('/datasets', async () => {
    return { datasets: await service.listDatasets() };
  });

  app.get<{ Params: { id: string } }>('/datasets/:id', async (request) => {
    return service.getDatasetById(request.params.id);
  });
}
