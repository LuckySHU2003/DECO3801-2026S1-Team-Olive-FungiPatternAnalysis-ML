import { MlClient } from '../../services/MlClient.js';
import { prepareMlPayload } from './shared.js';

export async function customExplorationProcessor(jobId: string, requestPayload: any) {
  const payload = await prepareMlPayload(jobId, requestPayload);
  return new MlClient().run('custom_exploration', {
    ...payload,
    previous_run_id: requestPayload.previous_run_id ?? null
  });
}
