import { z } from 'zod';

export const chatRequestSchema = z.object({
  dataset_id: z.string().optional(),
  result_id: z.string().optional(),
  message: z.string().min(1),
  summary: z.record(z.unknown()).optional(),
  result_type: z.string().optional()
});

export type ChatRequestDTO = z.infer<typeof chatRequestSchema>;

export interface ChatResponseDTO {
  answer: string;
  dataset_id?: string;
  result_id?: string;
  result_type?: string;
  summary_used?: Record<string, unknown>;
}

