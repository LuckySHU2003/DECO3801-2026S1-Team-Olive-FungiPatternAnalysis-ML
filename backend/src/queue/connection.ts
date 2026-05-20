import { Redis } from 'ioredis';
import { env } from '../config/env.js';

// maxRetriesPerRequest: null is required by BullMQ — without it ioredis throws on blocking Redis commands used by workers
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});
