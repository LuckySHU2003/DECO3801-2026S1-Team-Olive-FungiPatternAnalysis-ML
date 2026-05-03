import type { FastifyInstance } from 'fastify';
import { DatasetService } from '../../services/DatasetService.js';

export async function datasetRoutes(app: FastifyInstance) {
  const datasetService = new DatasetService();

  app.post('/datasets/upload', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Missing file field' });

    const buffer = await file.toBuffer();
    const dataset = await datasetService.uploadDataset({
      filename: file.filename,
      buffer,
      mimeType: file.mimetype,
      schema: {}
    });

    return reply.code(201).send(dataset);
  });

  app.get('/datasets', async () => {
    return datasetService.listDatasets();
  });

  app.get('/datasets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const dataset = await datasetService.getDataset(id);
    if (!dataset) return reply.code(404).send({ error: 'Dataset not found' });
    return dataset;
  });
}
