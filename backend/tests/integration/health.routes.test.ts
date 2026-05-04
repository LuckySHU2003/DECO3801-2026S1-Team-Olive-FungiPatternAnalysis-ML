import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('health route', () => {
  it('returns ok', async () => {
    const app = Fastify();

    app.get('/health', async () => ({ ok: true }));

    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
