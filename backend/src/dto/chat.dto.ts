import { z } from 'zod';

export const chatRequestSchema = z.object({
  dataset_id: z.string().optional(),
  result_id: z.string().optional(),
  message: z.string().min(1)
});

export type ChatRequestDTO = z.infer<typeof chatRequestSchema>;

export interface ChatResponseDTO {
  answer: string;
  dataset_id?: string;
  result_id?: string;
}
