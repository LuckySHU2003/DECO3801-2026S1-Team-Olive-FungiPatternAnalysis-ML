import { z } from 'zod';
import { modelTypeSchema } from './workspace.dto.js';

export const modelRegistrationSchema = z.object({
  name: z.string().min(1),
  type: modelTypeSchema,
  task_type: z.enum(["detect_patterns", "custom_exploration", "predict_future"]),
  selection: z.string().min(1).optional(),
  version: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export interface ModelResponseDTO {
  model_id: string;
  name: string;
  type: string;
  selection?: string;
  version?: string;
  task_type: string;
  source: 'supabase';
  file_url?: string;
  storage_path: string;
  bucket: string;
  metadata?: object;
  created_at: string;
}
