import type { FastifyInstance } from 'fastify';
import { modelRegistrationSchema } from '../../dto/model.dto.js';
import { ModelService } from '../../services/ModelService.js';

export async function modelRoutes(app: FastifyInstance) {
  const service = new ModelService();

  app.post('/models/upload', async (request, reply) => {
    const parts = request.parts();
    let file: any;
    const fields: Record<string, unknown> = {};

    for await (const part of parts) {
      if (part.type === 'file') file = part;
      else fields[part.fieldname] = part.value;
    }

    if (!file) return reply.code(400).send({ error: 'file is required' });

    const metadata = modelRegistrationSchema.parse({
      name: fields.name,
      type: fields.type,
      task_type: fields.task_type,
      selection: fields.selection || undefined,
      version: fields.version || undefined,
      metadata: fields.metadata ? JSON.parse(String(fields.metadata)) : undefined
    });

    const model = await service.uploadModel(file, metadata);
    return reply.code(201).send(model);
  });

  app.get('/models', async () => ({ models: await service.listModels() }));

  app.get<{ Params: { id: string } }>('/models/:id', async (request) => {
    return service.getModelById(request.params.id);
  });
}