import type { ChatRequestDTO, ChatResponseDTO } from '../dto/chat.dto.js';

export class ChatService {
  async reply(dto: ChatRequestDTO): Promise<ChatResponseDTO> {
    return {
      reply: `ChatService stub received: "${dto.message}". Connect this to an LLM later.`
    };
  }
}
