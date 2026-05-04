import OpenAI from 'openai';
import { env } from '../config/env.js';
import { DatasetModel } from '../models/Dataset.js';
import { ResultModel } from '../models/Result.js';
import type { ChatRequestDTO, ChatResponseDTO } from '../dto/chat.dto.js';

export class ChatService {
  async createChatResponse(dto: ChatRequestDTO): Promise<ChatResponseDTO> {
    if (!env.OPENAI_API_KEY) {
      return {
        answer: 'Chat service is configured, but OPENAI_API_KEY is not set yet.',
        dataset_id: dto.dataset_id,
        result_id: dto.result_id
      };
    }

    const dataset = dto.dataset_id ? await DatasetModel.findById(dto.dataset_id) : null;
    const result = dto.result_id ? await ResultModel.findById(dto.result_id) : null;

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You explain fungi electrical signal analysis results clearly and concisely.' },
        { role: 'user', content: JSON.stringify({ message: dto.message, dataset: dataset?.toObject(), result: result?.toObject() }) }
      ]
    });

    return {
      answer: completion.choices[0]?.message?.content ?? 'No response generated.',
      dataset_id: dto.dataset_id,
      result_id: dto.result_id
    };
  }
}
