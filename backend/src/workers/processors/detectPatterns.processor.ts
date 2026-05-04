import { MlClient } from '../../services/MlClient.js';
import { prepareMlPayload } from './shared.js';

export async function detectPatternsProcessor(jobId: string, requestPayload: object) {
  const payload = await prepareMlPayload(jobId, requestPayload);
  return new MlClient().run('detect_patterns', payload);
}
