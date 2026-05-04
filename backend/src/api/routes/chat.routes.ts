import type { FastifyInstance } from 'fastify';
import { chatRequestSchema } from '../../dto/chat.dto.js';
import { ChatService } from '../../services/ChatService.js';

export async function chatRoutes(app: FastifyInstance) {
  const service = new ChatService();

  app.post('/chat', async (request) => {
    const dto = chatRequestSchema.parse(request.body);
    return service.createChatResponse(dto);
  });
}
