import { env } from '../../config/env.js';
import { DatasetModel } from '../../models/Dataset.js';
import { ModelRegistryService } from '../../services/ModelRegistryService.js';
import { StorageUrlService } from '../../services/StorageUrlService.js';

function inferModelInput(requestPayload: any) {
  if (requestPayload.model) return requestPayload.model;

  const selection = requestPayload.analysis_config?.model_selection ?? requestPayload.prediction_config?.model_selection;
  if (!selection) throw new Error('Model metadata is required. Provide requestPayload.model or a model_selection that exists in MongoDB.');

  return { name: selection, type: 'other', selection };
}

export async function prepareMlPayload(jobId: string, requestPayload: any) {
  const datasetId = requestPayload.dataset?.dataset_id;
  if (!datasetId) throw new Error('dataset.dataset_id is required');

  const modelId = requestPayload.model?.model_id;
  if (!modelId) throw new Error('model.model_id is required');

  if (!requestPayload.job) throw new Error('job type field is required');

  return {
    ...requestPayload,
    job_id: jobId,
    dataset: {
      ...requestPayload.dataset,
      source: requestPayload.dataset?.source ?? 'supabase',
      // Default column mapping: the ML service requires exactly "Time" and "Voltage" keys
      columns: requestPayload.dataset?.columns ?? { time: 'Time', voltage: 'Voltage' }
    },
    // Default preprocessing when the caller omits it: normalize and interpolate missing values
    preprocessing: requestPayload.preprocessing ?? {
      mode: 'raw',
      normalize: true,
      missing_value_strategy: 'interpolate'
    }
  };
}

