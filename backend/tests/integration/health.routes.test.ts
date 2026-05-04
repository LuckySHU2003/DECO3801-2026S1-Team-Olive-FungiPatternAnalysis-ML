import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    PORT: 5000,
    CORS_ORIGIN: '*',
    MONGODB_URI: 'mongodb://fake',
    REDIS_URL: 'redis://fake',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fake',
    SUPABASE_DATASETS_BUCKET: 'datasets',
    SUPABASE_MODELS_BUCKET: 'models',
    ML_SERVICE_URL: 'http://localhost:8001',
    OPENAI_MODEL: 'gpt-4o-mini'
  }
}));

describe('health route', () => {
  it('returns ok', async () => {
    const { buildApp } = await import('../../src/api/app.js');
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});
