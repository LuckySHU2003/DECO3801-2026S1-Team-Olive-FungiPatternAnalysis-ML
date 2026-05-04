import { MlClient } from '../../services/MlClient.js';
import { prepareMlPayload } from './shared.js';

export async function predictFutureProcessor(jobId: string, requestPayload: object) {
  const payload = await prepareMlPayload(jobId, requestPayload);
  return new MlClient().run('predict_future', payload);
}
