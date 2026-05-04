import { env } from '../config/env.js';
import type { WorkspaceJobType } from '../dto/workspace.dto.js';

const endpointMap: Record<WorkspaceJobType, string> = {
  detect_patterns: '/ml/detect-patterns',
  custom_exploration: '/ml/custom-exploration',
  predict_future: '/ml/predict-future'
};

export class MlClient {
  async run(type: WorkspaceJobType, payload: object) {
    const response = await fetch(`${env.ML_SERVICE_URL}${endpointMap[type]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ML service failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<object>;
  }
}
