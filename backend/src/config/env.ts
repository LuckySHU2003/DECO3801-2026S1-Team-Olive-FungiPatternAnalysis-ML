import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DATASETS_BUCKET: z.string().default('datasets'),
  SUPABASE_MODELS_BUCKET: z.string().default('models'),
  ML_SERVICE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*')
});

export const env = EnvSchema.parse(process.env);
