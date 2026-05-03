import { Worker } from 'bullmq';
import { redisConnection } from '../queue/connection.js';
import { connectMongo } from '../config/db.js';
import { env } from '../config/env.js';
import { JobService } from '../services/JobService.js';
import { ResultService } from '../services/ResultService.js';
import type { MLWorkerPredictPayloadDTO } from '../dto/predict.dto.js';
import { logger } from '../utils/logger.js';

const jobService = new JobService();
const resultService = new ResultService();

async function callMlService(payload: MLWorkerPredictPayloadDTO) {
  if (!env.ML_SERVICE_URL) {
    return {
      prediction: [0.12, 0.18, 0.21],
      confidence: 0.8,
      source: 'node-worker-mock'
    };
  }

  const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_url: payload.dataset_url,
      model_url: payload.model_url,
      parameters: payload.parameters ?? {}
    })
  });

  if (!response.ok) {
    throw new Error(`ML service failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function processPredict(payload: MLWorkerPredictPayloadDTO) {
  await jobService.updateJobStatus(payload.job_id, 'processing');
  logger.info({ job_id: payload.job_id }, 'Processing prediction job');

  const mlOutput = await callMlService(payload);

  const result = await resultService.createResult({
    job_id: payload.job_id,
    output: mlOutput,
    summary: 'Mock prediction completed. Replace this with real model inference output.'
  });

  await jobService.updateJobStatus(payload.job_id, 'completed', { result_id: result.id });
  logger.info({ job_id: payload.job_id, result_id: result.id }, 'Prediction job completed');
}

async function main() {
  await connectMongo();

  const worker = new Worker(
    'ai-jobs',
    async (job) => {
      if (job.name === 'predict') {
        return processPredict(job.data as MLWorkerPredictPayloadDTO);
      }
      throw new Error(`Unsupported job type: ${job.name}`);
    },
    { connection: redisConnection }
  );

  worker.on('failed', async (job, error) => {
    logger.error({ job_id: job?.data?.job_id, error }, 'Job failed');
    if (job?.data?.job_id) {
      await jobService.updateJobStatus(job.data.job_id, 'failed', { error: error.message });
    }
  });

  logger.info('Worker started');
}

main().catch((error) => {
  logger.error(error, 'Worker failed to start');
  process.exit(1);
});
