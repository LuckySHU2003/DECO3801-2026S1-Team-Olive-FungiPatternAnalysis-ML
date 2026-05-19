import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { chatRequestSchema } from '../../dto/chat.dto.js';
import { ChatService } from '../../services/ChatService.js';

export async function chatRoutes(app: FastifyInstance) {
  const service = new ChatService();

  app.post('/chat', async (request, reply) => {
    try {
      const dto = chatRequestSchema.parse(request.body);
      return await service.createChatResponse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: 'Invalid chat request payload.',
          issues: error.issues
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        message: error instanceof Error ? error.message : 'Failed to create chat response.'
      });
    }
  });
}
