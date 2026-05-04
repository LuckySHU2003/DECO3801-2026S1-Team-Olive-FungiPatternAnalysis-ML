import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const workspaceQueue = new Queue('workspace-jobs', {
  connection: redisConnection
});
