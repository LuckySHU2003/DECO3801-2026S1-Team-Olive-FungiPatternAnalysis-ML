import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const jobQueue = new Queue('ai-jobs', {
  connection: redisConnection
});
