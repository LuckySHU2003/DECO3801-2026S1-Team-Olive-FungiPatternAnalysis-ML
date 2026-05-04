import { DatasetModel } from '../../models/Dataset.js';
import { ModelRegistryService } from '../../services/ModelRegistryService.js';

export async function prepareMlPayload(jobId: string, requestPayload: any) {
  const dataset = await DatasetModel.findById(requestPayload.dataset.dataset_id);
  if (!dataset) throw new Error('Dataset not found');

  const modelInput = requestPayload.model ?? {
    name: requestPayload.analysis_config?.model_selection ?? requestPayload.prediction_config?.model_selection,
    type: 'other',
    selection: requestPayload.analysis_config?.model_selection ?? requestPayload.prediction_config?.model_selection
  };

  const model = await new ModelRegistryService().resolveModel(modelInput);

  return {
    job_id: jobId,
    dataset: {
      source: 'supabase',
      file_url: dataset.file_url,
      storage_path: dataset.storage_path,
      columns: requestPayload.dataset.columns ?? { time: 'Time', voltage: 'Voltage' }
    },
    preprocessing: requestPayload.preprocessing,
    config: requestPayload.detection_config ?? requestPayload.analysis_config ?? requestPayload.prediction_config,
    model
  };
}
