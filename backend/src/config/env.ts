import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.string().default('development'),
  CORS_ORIGIN: z.string().default('*'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DATASETS_BUCKET: z.string().default('datasets'),
  SUPABASE_MODELS_BUCKET: z.string().default('models'),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  SUPABASE_SIGNED_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(3600),
  ML_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000)
});

export const env = envSchema.parse(process.env);
