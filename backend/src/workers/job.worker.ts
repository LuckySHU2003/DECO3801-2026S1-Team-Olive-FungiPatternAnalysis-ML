import { Worker } from 'bullmq';
import { connectMongo } from '../config/db.js';
import { redisConnection } from '../queue/connection.js';
import { JobModel } from '../models/Job.js';
import { JobService } from '../services/JobService.js';
import { ResultService } from '../services/ResultService.js';
import { detectPatternsProcessor } from './processors/detectPatterns.processor.js';
import { customExplorationProcessor } from './processors/customExploration.processor.js';
import { predictFutureProcessor } from './processors/predictFuture.processor.js';

async function processWorkspaceJob(data: { job_id: string; type: string }) {
  const jobService = new JobService();
  const resultService = new ResultService();

  await jobService.updateStatus(data.job_id, 'processing');
  const jobDoc = await JobModel.findById(data.job_id);
  if (!jobDoc) throw new Error('Job not found');

  let output: object;
  if (data.type === 'detect_patterns') output = await detectPatternsProcessor(data.job_id, jobDoc.request_payload);
  else if (data.type === 'custom_exploration') output = await customExplorationProcessor(data.job_id, jobDoc.request_payload);
  else if (data.type === 'predict_future') output = await predictFutureProcessor(data.job_id, jobDoc.request_payload);
  else throw new Error(`Unsupported job type: ${data.type}`);

  const result = await resultService.createResult({
    job_id: data.job_id,
    type: data.type,
    output,
    summary: (output as any).summary
  });

  await jobService.updateStatus(data.job_id, 'completed', { result_id: result.result_id });
  return result;
}

async function main() {
  await connectMongo();

  const worker = new Worker('workspace-jobs', async (job) => processWorkspaceJob(job.data), {
    connection: redisConnection,
    concurrency: 2
  });

  worker.on('completed', (job) => console.log(`Worker completed ${job.name}:${job.id}`));
  worker.on('failed', async (job, error) => {
    console.error(`Worker failed ${job?.name}:${job?.id}`, error);
    const appJobId = job?.data?.job_id;
    if (appJobId) await new JobService().updateStatus(appJobId, 'failed', { error: error.message });
  });

  console.log('Workspace worker started');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
