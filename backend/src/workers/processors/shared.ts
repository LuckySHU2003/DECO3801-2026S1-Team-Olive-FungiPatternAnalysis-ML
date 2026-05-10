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
  const dataset = await DatasetModel.findById(requestPayload.dataset.dataset_id);
  if (!dataset) throw new Error('Dataset not found');
  if (!dataset.file_url && !dataset.storage_path) throw new Error('Dataset has no file_url or storage_path');

  const storageUrlService = new StorageUrlService();
  const datasetFileUrl = dataset.storage_path
    ? await storageUrlService.createSignedUrl(dataset.bucket ?? env.SUPABASE_DATASETS_BUCKET, dataset.storage_path)
    : dataset.file_url;

  const model = await new ModelRegistryService().resolveModel(inferModelInput(requestPayload));
  const modelFileUrl = model.storage_path
    ? await storageUrlService.createSignedUrl(model.bucket ?? env.SUPABASE_MODELS_BUCKET, model.storage_path)
    : model.file_url;

  if (!modelFileUrl) throw new Error(`Resolved model ${model.name} has no usable file URL`);

  return {
    job_id: jobId,
    dataset: {
      source: 'supabase',
      file_url: datasetFileUrl,
      storage_path: dataset.storage_path,
      columns: requestPayload.dataset.columns ?? { time: 'Time', voltage: 'Voltage' }
    },
    preprocessing: requestPayload.preprocessing,
    config: requestPayload.detection_config ?? requestPayload.analysis_config ?? requestPayload.prediction_config,
    model: {
      ...model,
      file_url: modelFileUrl
    }
  };
}
