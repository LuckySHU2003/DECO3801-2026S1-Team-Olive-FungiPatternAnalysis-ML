import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChatService } from '../../services/ChatService.js';

const ChatBodySchema = z.object({
  dataset_id: z.string().optional(),
  message: z.string().min(1)
});

export async function chatRoutes(app: FastifyInstance) {
  const chatService = new ChatService();

  app.post('/chat', async (request, reply) => {
    const body = ChatBodySchema.parse(request.body);
    const response = await chatService.reply(body);
    return reply.send(response);
  });
}
